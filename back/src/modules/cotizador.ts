/* Cotizador: arma el contexto de costos del mes desde la base y calcula cualquier producto.
   Es el puente entre la base de datos y el dominio puro (domain/). */
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import type { Db } from '../core/db.ts';
import { Controlador } from '../core/Controlador.ts';
import { DatosInvalidos, NoEncontrado } from '../core/errores.ts';
import { idRef } from '../core/esquemas.ts';
import { ContextoCostos, amortizacionMensual } from '../domain/costos.ts';
import { Cotizacion, calculadoraPara, type OpcionesCalculo, type ProductoCalculable, type ResultadoCalculo } from '../domain/calculadoras.ts';
import { DomainError } from '../domain/errores.ts';
import { FORRADOS, TAMANO_MAX, TAMANO_MIN, TAMANO_REFERENCIA, type HorasGasto, type RolReceta, type TipoProducto } from '../domain/valores.ts';
import { recetaDominio } from './recetas.ts';
import { insumoDominio } from './insumos.ts';

export const incluirProductoCalculo = {
  recetas: { include: { receta: { include: { ingredientes: { include: { insumo: true } } } } }, orderBy: { id: 'asc' } },
  insumos: { include: { insumo: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.ProductoInclude;
export type ProductoConRecetas = Prisma.ProductoGetPayload<{ include: typeof incluirProductoCalculo }>;

/** Diámetro de una torta en cm. */
export const tamanoTorta = z.number().int('tiene que ser un número entero de cm')
  .min(TAMANO_MIN, `tiene que ser de ${TAMANO_MIN} cm o más`).max(TAMANO_MAX, `tiene que ser de ${TAMANO_MAX} cm o menos`);
/** Ingrediente suelto (producto o presupuesto): insumo + cantidad en g, ml o u. */
export const insumoSuelto = z.object({ insumoId: idRef, cantidad: z.number().positive('tiene que ser mayor que 0') });
/** ± minutos para un pedido puntual. */
export const ajusteMin = z.number().int().min(-24 * 60).max(24 * 60 * 7);

/** No se repite un insumo en la misma lista: se suman las cantidades en una fila. */
export function sinRepetidos(lista: { insumoId: number }[]) {
  if (new Set(lista.map((i) => i.insumoId)).size !== lista.length) throw new DatosInvalidos('Hay un ingrediente repetido. Sumá las cantidades en una sola fila.');
}

export const esquemaOpciones = z.object({
  productoId: idRef,
  tamano: tamanoTorta.optional(),
  forrado: z.enum(FORRADOS).optional(),
  cantidad: z.number().int().optional(),
  extras: z.array(idRef).default([]),
  zonaEnvioId: idRef.nullable().optional(),
  insumos: z.array(insumoSuelto).default([]),
  ajusteTrabajoMin: ajusteMin.default(0),
  ajusteHornoMin: ajusteMin.default(0),
});
export type OpcionesCotizacion = z.infer<typeof esquemaOpciones>;

export interface ResultadoCotizacion {
  producto: { id: number; nombre: string; tipo: TipoProducto };
  calculo: ResultadoCalculo;
  extras: { id: number; nombre: string; precio: number }[];
  envio: { id: number; nombre: string; precio: number; esRetiro: boolean } | null;
  total: number; senaPct: number; sena: number; saldo: number;
  contexto: { margenPct: number; valorHora: number | null; horasLaborales: number | null; serviciosPorHoraTrabajo: number; serviciosPorHoraHorno: number; gastosPorHora: number };
}

export class Cotizador {
  private readonly db: Db;
  constructor(db: Db) { this.db = db; }

  /** Configuración + servicios compartidos + gastos exclusivos + amortización de equipos. */
  async contexto(): Promise<ContextoCostos> {
    const [cfg, gastos, equipos] = await Promise.all([
      this.db.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
      this.db.gastoFijo.findMany({ where: { activo: true } }),
      this.db.equipo.findMany({ where: { activo: true } }),
    ]);
    return new ContextoCostos({
      margenPct: cfg.margenPct, redondeoTorta: cfg.redondeoTorta, redondeoMesaDulce: cfg.redondeoMesaDulce,
      valorHora: cfg.valorHora, horasLaborales: cfg.horasLaborales, horasMesServicios: cfg.horasMesServicios, senaPct: cfg.senaPct,
      servicios: gastos.filter((g) => g.tipo === 'compartido').map((g) => ({ nombre: g.nombre, factura: g.monto, factor: g.factor, usaHoras: g.usaHoras as HorasGasto })),
      gastosExclusivos: gastos.filter((g) => g.tipo === 'exclusivo').reduce((s, g) => s + g.monto, 0),
      amortizacion: Math.round(equipos.reduce((s, e) => s + amortizacionMensual(e.valor, e.vidaUtilAnios), 0)),
    });
  }

  static aCalculable(p: ProductoConRecetas): ProductoCalculable {
    return {
      nombre: p.nombre, tipo: p.tipo as TipoProducto, armadoMin: p.armadoMin, decoracionMinUnidad: p.decoracionMinUnidad,
      porcionesMin: p.porcionesMin, porcionesMax: p.porcionesMax,
      recetas: p.recetas.map((r) => ({ receta: recetaDominio(r.receta), rol: r.rol as RolReceta, cantidad: r.cantidad })),
      insumos: p.insumos.map((i) => ({ insumo: insumoDominio(i.insumo), cantidad: i.cantidad })),
    };
  }

  calcularProducto(p: ProductoConRecetas, o: OpcionesCalculo, ctx: ContextoCostos): ResultadoCalculo {
    try {
      return calculadoraPara(p.tipo as TipoProducto, ctx).calcular(Cotizador.aCalculable(p), o);
    } catch (e) {
      if (e instanceof DomainError) throw new DatosInvalidos(e.message);
      throw e;
    }
  }

  /** Precios del catálogo para mostrar (tortas: 20 cm de referencia, o su tamaño único; mesa dulce: 12 unidades). */
  preciosCatalogo(p: ProductoConRecetas, ctx: ContextoCostos) {
    const tipo = p.tipo as TipoProducto;
    if (tipo === 'torta') {
      const forrados = FORRADOS.filter((f) => p.recetas.some((r) => r.rol === `forrado_${f}`));
      const opciones = forrados.length ? forrados : [undefined];
      return opciones.map((forrado) => {
        const c = this.calcularProducto(p, { tamano: TAMANO_REFERENCIA, forrado }, ctx);
        return { tamano: c.tamano, forrado: forrado ?? null, ...this.resumen(c) };
      });
    }
    if (tipo === 'mesa_dulce') return [{ cantidad: 12, ...this.resumen(this.calcularProducto(p, { cantidad: 12 }, ctx)) }];
    return [this.resumen(this.calcularProducto(p, {}, ctx))];
  }

  private resumen(c: ResultadoCalculo) {
    return { precio: c.precio, porPorcion: c.porPorcion, porciones: c.porciones, costoTotal: c.costoTotal, trabajoMin: c.trabajoMin, hornoMin: c.hornoMin, avisos: c.avisos };
  }

  async productoConRecetas(id: number) {
    const p = await this.db.producto.findUnique({ where: { id }, include: incluirProductoCalculo });
    if (!p) throw new NoEncontrado('El producto');
    return p;
  }

  /** Cotización completa: producto + extras + envío, con seña y saldo. */
  async cotizar(o: OpcionesCotizacion): Promise<ResultadoCotizacion> {
    sinRepetidos(o.insumos);
    const ids = o.insumos.map((i) => i.insumoId);
    const [p, ctx, extras, envio, insumos] = await Promise.all([
      this.productoConRecetas(o.productoId),
      this.contexto(),
      o.extras.length ? this.db.extra.findMany({ where: { id: { in: o.extras } } }) : Promise.resolve([]),
      o.zonaEnvioId ? this.db.zonaEnvio.findUnique({ where: { id: o.zonaEnvioId } }) : Promise.resolve(null),
      ids.length ? this.db.insumo.findMany({ where: { id: { in: ids } } }) : Promise.resolve([]),
    ]);
    const insumosExtra = o.insumos.map((i) => {
      const ins = insumos.find((x) => x.id === i.insumoId);
      if (!ins) throw new NoEncontrado('Uno de los ingredientes');
      return { insumo: insumoDominio(ins), cantidad: i.cantidad };
    });
    if (o.zonaEnvioId && !envio) throw new NoEncontrado('La zona de envío');
    if (envio && envio.precio == null && !envio.esRetiro) throw new DatosInvalidos(`Falta cargar el precio del envío a ${envio.nombre} en Costos y ajustes → Tarifarios.`);
    const calculo = this.calcularProducto(p, {
      tamano: o.tamano, forrado: o.forrado, cantidad: o.cantidad, insumosExtra,
      ajusteTrabajoMin: o.ajusteTrabajoMin, ajusteHornoMin: o.ajusteHornoMin,
    }, ctx);
    const env = envio ? { id: envio.id, nombre: envio.nombre, precio: envio.precio ?? 0, esRetiro: envio.esRetiro } : null;
    const cot = new Cotizacion({ precioProducto: calculo.precio, extras, envio: env, senaPct: ctx.senaPct });
    return {
      producto: { id: p.id, nombre: p.nombre, tipo: p.tipo as TipoProducto },
      calculo, extras: extras.map((e) => ({ id: e.id, nombre: e.nombre, precio: e.precio })), envio: env,
      total: cot.total, senaPct: ctx.senaPct, sena: cot.sena, saldo: cot.saldo,
      contexto: {
        margenPct: ctx.margenPct, valorHora: ctx.valorHora, horasLaborales: ctx.horasLaborales,
        serviciosPorHoraTrabajo: ctx.serviciosPorHoraTrabajo, serviciosPorHoraHorno: ctx.serviciosPorHoraHorno, gastosPorHora: ctx.gastosPorHora,
      },
    };
  }
}

export class ControladorCotizador extends Controlador {
  readonly ruta = '/cotizador';
  constructor(cotizador: Cotizador) {
    super();
    this.router.post('/calcular', this.h(async (req) => {
      const r = esquemaOpciones.safeParse(req.body);
      if (!r.success) throw new DatosInvalidos('Elegí un producto para calcular.', r.error.issues);
      return cotizador.cotizar(r.data);
    }));
    this.router.get('/contexto', this.h(async () => {
      const c = await cotizador.contexto();
      return {
        serviciosPorHoraTrabajo: c.serviciosPorHoraTrabajo, serviciosPorHoraHorno: c.serviciosPorHoraHorno,
        gastosPorHora: c.gastosPorHora, amortizacion: c.amortizacion, gastosExclusivos: c.gastosExclusivos, avisos: c.avisos,
      };
    }));
  }
}
