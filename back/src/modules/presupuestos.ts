/* Presupuestos: borrador editable → enviado (snapshot congelado, PDF) → convertido en pedido.
   Un enviado se puede cancelar (el cliente no siguió) y reactivar; también se puede eliminar si no es pedido. */
import { z } from 'zod';
import type { Prisma, Presupuesto, PresupuestoLinea, Pedido } from '@prisma/client';
import type { Db } from '../core/db.ts';
import { Controlador } from '../core/Controlador.ts';
import { Conflicto, DatosInvalidos, NoEncontrado } from '../core/errores.ts';
import { idRef, texto } from '../core/esquemas.ts';
import { FORRADOS, TAMANOS } from '../domain/valores.ts';
import type { Cotizador } from './cotizador.ts';

/** Fecha sin hora "AAAA-MM-DD". Se guarda a las 12:00 UTC para que no cambie de día por la zona horaria. */
export const fechaDia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'usá el formato AAAA-MM-DD').transform((s) => new Date(`${s}T12:00:00Z`));
export const diaISO = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

const esquema = z.object({
  clienteNombre: texto(120).default(''),
  clienteTelefono: texto(40).default(''),
  direccion: texto(200).default(''),
  fechaEntrega: fechaDia.nullable().optional(),
  horaEntrega: z.string().regex(/^(\d{2}:\d{2})?$/, 'usá el formato HH:MM').default(''),
  productoId: idRef.nullable().optional(),
  tamano: z.literal([...TAMANOS]).nullable().optional(),
  forrado: z.enum(FORRADOS).nullable().optional(),
  cantidad: z.number().int().nullable().optional(),
  detalle: texto(2000).default(''),
  fotoReferenciaUrl: z.string().nullable().optional(),
  extras: z.array(idRef).default([]),
  zonaEnvioId: idRef.nullable().optional(),
});
type Datos = z.infer<typeof esquema>;

const incluir = { lineas: { orderBy: { orden: 'asc' } }, pedido: true } satisfies Prisma.PresupuestoInclude;
type PresupuestoCompleto = Presupuesto & { lineas: PresupuestoLinea[]; pedido: Pedido | null };

export const numeroLabel = (n: number) => String(n).padStart(4, '0');

export class ServicioPresupuestos {
  private readonly db: Db;
  private readonly cotizador: Cotizador;
  constructor(db: Db, cotizador: Cotizador) { this.db = db; this.cotizador = cotizador; }

  private validar(body: unknown, parcial = false): Partial<Datos> {
    const r = (parcial ? esquema.partial() : esquema).safeParse(body);
    if (!r.success) {
      const i = r.error.issues[0];
      throw new DatosInvalidos(`Revisá el campo «${i?.path.join('.')}»: ${i?.message}.`, r.error.issues);
    }
    return r.data;
  }

  /** Recalcula y arma los campos del snapshot (montos, líneas y costos internos). */
  private async snapshot(d: Partial<Datos>) {
    const base = {
      clienteNombre: d.clienteNombre, clienteTelefono: d.clienteTelefono, direccion: d.direccion,
      fechaEntrega: d.fechaEntrega ?? null, horaEntrega: d.horaEntrega, detalle: d.detalle, fotoReferenciaUrl: d.fotoReferenciaUrl ?? null,
      zonaEnvioId: d.zonaEnvioId ?? null, tamano: d.tamano ?? null, forrado: d.forrado ?? null, cantidad: d.cantidad ?? null,
    };
    if (!d.productoId) {
      return { ...base, productoId: null, productoNombre: '', tipoProducto: null, precioProducto: 0, total: 0, sena: 0, saldo: 0, senaPct: 0,
        porPorcion: null, porcionesMin: null, porcionesMax: null, calculo: '{}', lineas: [] as Omit<PresupuestoLinea, 'id' | 'presupuestoId'>[] };
    }
    const c = await this.cotizador.cotizar({
      productoId: d.productoId, tamano: d.tamano ?? undefined, forrado: d.forrado ?? undefined, cantidad: d.cantidad ?? undefined,
      extras: d.extras ?? [], zonaEnvioId: d.zonaEnvioId ?? null,
    });
    const t = c.producto.tipo;
    const nombreLinea = t === 'torta' ? `${c.producto.nombre} · ${d.tamano ?? 20} cm`
      : t === 'mesa_dulce' ? `${c.producto.nombre} × ${c.calculo.unidades}` : c.producto.nombre;
    const lineas = [
      { tipo: 'producto', descripcion: nombreLinea, precio: c.calculo.precio, orden: 0 },
      ...c.extras.map((e, i) => ({ tipo: 'extra', descripcion: e.nombre, precio: e.precio, orden: i + 1 })),
      ...(c.envio ? [{ tipo: 'envio', descripcion: c.envio.esRetiro ? 'Retira el cliente' : `Envío · ${c.envio.nombre}`, precio: c.envio.precio, orden: 99 }] : []),
    ];
    return {
      ...base, productoId: c.producto.id, productoNombre: c.producto.nombre, tipoProducto: t,
      forrado: t === 'torta' ? (d.forrado ?? null) : null, tamano: t === 'torta' ? (d.tamano ?? 20) : null, cantidad: t === 'mesa_dulce' ? c.calculo.unidades : null,
      precioProducto: c.calculo.precio, total: c.total, senaPct: c.senaPct, sena: c.sena, saldo: c.saldo,
      porPorcion: c.calculo.porPorcion != null ? Math.round(c.calculo.porPorcion) : null,
      porcionesMin: c.calculo.porciones?.[0] ?? null, porcionesMax: c.calculo.porciones?.[1] ?? null,
      // Costos internos y parámetros congelados. Nunca salen en el PDF.
      calculo: JSON.stringify({ ...c.calculo, extras: c.extras, envio: c.envio, contexto: c.contexto }),
      lineas,
    };
  }

  private dto(p: PresupuestoCompleto, conCalculo = true) {
    const vencido = p.estado === 'enviado' && p.validoHasta != null && p.validoHasta.getTime() < Date.now();
    const { calculo, ...resto } = p;
    return {
      ...resto,
      numeroLabel: numeroLabel(p.numero),
      estadoVista: vencido ? 'vencido' : p.estado,
      fechaEntrega: diaISO(p.fechaEntrega),
      extras: p.lineas.filter((l) => l.tipo === 'extra'),
      ...(conCalculo ? { calculo: JSON.parse(calculo || '{}') } : {}),
    };
  }

  private async buscar(id: number): Promise<PresupuestoCompleto> {
    const p = await this.db.presupuesto.findUnique({ where: { id }, include: incluir });
    if (!p) throw new NoEncontrado('El presupuesto');
    return p;
  }

  async listar(f: { estado?: string; q?: string }) {
    const ps = await this.db.presupuesto.findMany({
      where: { ...(f.estado ? { estado: f.estado } : {}), ...(f.q ? { clienteNombre: { contains: f.q, mode: 'insensitive' as const } } : {}) },
      include: incluir, orderBy: { numero: 'desc' },
    });
    return ps.map((p) => this.dto(p, false));
  }

  async obtener(id: number) { return this.dto(await this.buscar(id)); }

  async crear(body: unknown) {
    const d = this.validar(body);
    const { lineas, ...campos } = await this.snapshot(d);
    const ultimo = await this.db.presupuesto.aggregate({ _max: { numero: true } });
    const p = await this.db.presupuesto.create({
      data: { ...campos, numero: (ultimo._max.numero ?? 0) + 1, lineas: { create: lineas } }, include: incluir,
    });
    return this.dto(p);
  }

  async actualizar(id: number, body: unknown) {
    const actual = await this.buscar(id);
    if (actual.estado !== 'borrador') throw new Conflicto('El presupuesto ya se envió y sus precios quedaron congelados. Duplicalo para hacer cambios.');
    const previo: Partial<Datos> = {
      clienteNombre: actual.clienteNombre, clienteTelefono: actual.clienteTelefono, direccion: actual.direccion,
      fechaEntrega: actual.fechaEntrega, horaEntrega: actual.horaEntrega, productoId: actual.productoId,
      tamano: actual.tamano as Datos['tamano'], forrado: actual.forrado as Datos['forrado'], cantidad: actual.cantidad, detalle: actual.detalle,
      fotoReferenciaUrl: actual.fotoReferenciaUrl, zonaEnvioId: actual.zonaEnvioId,
      extras: JSON.parse(actual.calculo || '{}').extras?.map((e: { id: number }) => e.id) ?? [],
    };
    const d = { ...previo, ...this.validar(body, true) };
    const { lineas, ...campos } = await this.snapshot(d);
    const p = await this.db.presupuesto.update({
      where: { id }, data: { ...campos, lineas: { deleteMany: {}, create: lineas } }, include: incluir,
    });
    return this.dto(p);
  }

  /** Generar PDF: congela el presupuesto (snapshot) y calcula la validez. */
  async enviar(id: number) {
    const p = await this.buscar(id);
    if (p.estado !== 'borrador') return this.dto(p);
    if (!p.productoId) throw new DatosInvalidos('Elegí un producto antes de generar el PDF.');
    if (!p.clienteNombre) throw new DatosInvalidos('Cargá el nombre del cliente antes de generar el PDF.');
    const negocio = await this.db.negocio.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    const ahora = new Date();
    const vence = new Date(ahora.getTime() + negocio.validezDias * 864e5);
    return this.dto(await this.db.presupuesto.update({ where: { id }, data: { estado: 'enviado', emitidoAt: ahora, validoHasta: vence }, include: incluir }));
  }

  /** Cuando el cliente seña: crea el pedido directo en "Señado". */
  async convertir(id: number) {
    const p = await this.buscar(id);
    if (p.pedido) throw new Conflicto(`El presupuesto #${numeroLabel(p.numero)} ya es un pedido.`);
    if (p.estado === 'cancelado') throw new Conflicto('El presupuesto está cancelado. Reactivalo para convertirlo en pedido.');
    if (!p.fechaEntrega) throw new DatosInvalidos('Cargá la fecha de entrega antes de convertirlo en pedido.');
    if (p.estado === 'borrador') await this.enviar(id);
    await this.db.$transaction([
      this.db.pedido.create({ data: { presupuestoId: id, estado: 'senado', fechaEntrega: p.fechaEntrega, horaEntrega: p.horaEntrega } }),
      this.db.presupuesto.update({ where: { id }, data: { estado: 'convertido' } }),
    ]);
    return this.obtener(id);
  }

  /** El cliente no siguió: queda en el historial como cancelado. */
  async cancelar(id: number) {
    const p = await this.buscar(id);
    if (p.pedido) throw new Conflicto('Este presupuesto ya es un pedido: cancelalo desde Pedidos.');
    if (p.estado === 'borrador') throw new Conflicto('Un borrador no se envió: eliminalo directamente.');
    if (p.estado === 'cancelado') return this.dto(p);
    return this.dto(await this.db.presupuesto.update({ where: { id }, data: { estado: 'cancelado' }, include: incluir }));
  }

  /** Deshace la cancelación: vuelve a "enviado" con los mismos precios congelados. */
  async reactivar(id: number) {
    const p = await this.buscar(id);
    if (p.estado !== 'cancelado') throw new Conflicto('Solo se puede reactivar un presupuesto cancelado.');
    return this.dto(await this.db.presupuesto.update({ where: { id }, data: { estado: 'enviado' }, include: incluir }));
  }

  async duplicar(id: number) {
    const p = await this.buscar(id);
    const extras = JSON.parse(p.calculo || '{}').extras?.map((e: { id: number }) => e.id) ?? [];
    return this.crear({
      clienteNombre: p.clienteNombre, clienteTelefono: p.clienteTelefono, direccion: p.direccion,
      fechaEntrega: diaISO(p.fechaEntrega), horaEntrega: p.horaEntrega, productoId: p.productoId, tamano: p.tamano, forrado: p.forrado,
      cantidad: p.cantidad, detalle: p.detalle, fotoReferenciaUrl: p.fotoReferenciaUrl, extras, zonaEnvioId: p.zonaEnvioId,
    });
  }

  async eliminar(id: number) {
    const p = await this.buscar(id);
    if (p.pedido) throw new Conflicto('No se puede borrar un presupuesto que ya es un pedido. Cancelá el pedido.');
    await this.db.presupuesto.delete({ where: { id } });
    return { archivado: false };
  }

  /** Datos para el PDF "Presupuesto de pedido": sin costos internos. */
  async documento(id: number) {
    const [p, negocio] = await Promise.all([this.buscar(id), this.db.negocio.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })]);
    return { presupuesto: this.dto(p, false), negocio };
  }
}

export class ControladorPresupuestos extends Controlador {
  readonly ruta = '/presupuestos';
  constructor(s: ServicioPresupuestos) {
    super();
    const r = this.router;
    r.get('/', this.h((req) => s.listar({ estado: req.query.estado as string | undefined, q: req.query.q as string | undefined })));
    r.post('/', this.h(async (req, res) => { res.status(201); return s.crear(req.body); }));
    r.get('/:id', this.h((req) => s.obtener(this.id(req))));
    r.get('/:id/documento', this.h((req) => s.documento(this.id(req))));
    r.patch('/:id', this.h((req) => s.actualizar(this.id(req), req.body)));
    r.post('/:id/enviar', this.h((req) => s.enviar(this.id(req))));
    r.post('/:id/convertir', this.h((req) => s.convertir(this.id(req))));
    r.post('/:id/cancelar', this.h((req) => s.cancelar(this.id(req))));
    r.post('/:id/reactivar', this.h((req) => s.reactivar(this.id(req))));
    r.post('/:id/duplicar', this.h(async (req, res) => { res.status(201); return s.duplicar(this.id(req)); }));
    r.delete('/:id', this.h((req) => s.eliminar(this.id(req))));
  }
}
