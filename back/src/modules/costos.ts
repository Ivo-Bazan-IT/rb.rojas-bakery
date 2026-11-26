/* Gastos fijos, equipos, tarifarios (extras y envíos), configuración y datos del negocio. */
import { z } from 'zod';
import type { Equipo, Extra, GastoFijo, ZonaEnvio } from '@prisma/client';
import { Repositorio } from '../core/Repositorio.ts';
import { ServicioCatalogo, type Filtros } from '../core/ServicioCatalogo.ts';
import { Controlador } from '../core/Controlador.ts';
import { centavos, nombre, porcentaje, texto } from '../core/esquemas.ts';
import { DatosInvalidos } from '../core/errores.ts';
import type { Db } from '../core/db.ts';
import { amortizacionMensual } from '../domain/costos.ts';
import { HORAS_GASTO, TIPOS_GASTO } from '../domain/valores.ts';

// ---------- Gastos fijos ----------
const gasto = z.object({
  nombre, monto: centavos, tipo: z.enum(TIPOS_GASTO),
  factor: z.number().min(0).max(10).default(1), usaHoras: z.enum(HORAS_GASTO).default('trabajo'),
  detalle: texto().default(''), activo: z.boolean().default(true),
});
export class RepositorioGastos extends Repositorio<GastoFijo> {
  protected get modelo() { return this.db.gastoFijo; }
  protected orden() { return [{ tipo: 'asc' }, { id: 'asc' }]; }
}
export class ServicioGastos extends ServicioCatalogo<GastoFijo> {
  protected readonly nombre = 'El gasto';
  protected readonly esquemaCrear = gasto;
  protected readonly esquemaActualizar = gasto.partial();
  protected where(f: Filtros) { return f.tipo ? { tipo: String(f.tipo) } : {}; }
}

// ---------- Equipos ----------
const equipo = z.object({ nombre, valor: centavos, vidaUtilAnios: z.number().positive().max(50), activo: z.boolean().default(true) });
export class RepositorioEquipos extends Repositorio<Equipo> {
  protected get modelo() { return this.db.equipo; }
}
export class ServicioEquipos extends ServicioCatalogo<Equipo> {
  protected readonly nombre = 'El equipo';
  protected readonly esquemaCrear = equipo;
  protected readonly esquemaActualizar = equipo.partial();
  protected async aDTO(e: Equipo) { return { ...e, amortizacionMensual: amortizacionMensual(e.valor, e.vidaUtilAnios) }; }
}

// ---------- Extras ----------
const extra = z.object({ nombre, precio: centavos, activo: z.boolean().default(true) });
export class RepositorioExtras extends Repositorio<Extra> {
  protected get modelo() { return this.db.extra; }
  protected orden() { return { nombre: 'asc' }; }
}
export class ServicioExtras extends ServicioCatalogo<Extra> {
  protected readonly nombre = 'El extra';
  protected readonly esquemaCrear = extra;
  protected readonly esquemaActualizar = extra.partial();
}

// ---------- Zonas de envío ----------
const zona = z.object({ nombre, precio: centavos.nullable().default(null), esRetiro: z.boolean().default(false), orden: z.number().int().default(0), activo: z.boolean().default(true) });
export class RepositorioEnvios extends Repositorio<ZonaEnvio> {
  protected get modelo() { return this.db.zonaEnvio; }
  protected orden() { return [{ orden: 'asc' }, { nombre: 'asc' }]; }
}
export class ServicioEnvios extends ServicioCatalogo<ZonaEnvio> {
  protected readonly nombre = 'La zona de envío';
  protected readonly esquemaCrear = zona;
  protected readonly esquemaActualizar = zona.partial();
}

// ---------- Configuración y datos del negocio (filas únicas) ----------
const configuracion = z.object({
  margenPct: porcentaje, redondeoTorta: centavos, redondeoMesaDulce: centavos,
  valorHora: centavos.nullable(), horasLaborales: z.number().int().positive().max(744).nullable(),
  horasMesServicios: z.number().int().positive().max(744), senaPct: porcentaje, avisoDias: z.number().int().min(0).max(60),
}).partial();

const negocio = z.object({
  nombre: texto(80), instagram: texto(80), whatsapp: texto(40), zona: texto(120), mediosPago: texto(200),
  alias: texto(60), cbu: z.string().trim().regex(/^\d{0,22}$/, 'tiene que tener hasta 22 números'),
  validezDias: z.number().int().min(1).max(90), politicas: texto(2000), cuidados: texto(2000),
}).partial();

export class ServicioAjustes {
  private readonly db: Db;
  constructor(db: Db) { this.db = db; }

  configuracion() { return this.db.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }); }
  negocio() { return this.db.negocio.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }); }

  async actualizarConfiguracion(body: unknown) {
    const r = configuracion.safeParse(body);
    if (!r.success) throw new DatosInvalidos(`Revisá el campo «${r.error.issues[0]?.path.join('.')}».`, r.error.issues);
    await this.configuracion();
    return this.db.configuracion.update({ where: { id: 1 }, data: r.data });
  }

  async actualizarNegocio(body: unknown) {
    const r = negocio.safeParse(body);
    if (!r.success) throw new DatosInvalidos(`Revisá el campo «${r.error.issues[0]?.path.join('.')}»: ${r.error.issues[0]?.message}.`, r.error.issues);
    await this.negocio();
    return this.db.negocio.update({ where: { id: 1 }, data: r.data });
  }
}

export class ControladorAjustes extends Controlador {
  readonly ruta = '/ajustes';
  constructor(servicio: ServicioAjustes) {
    super();
    this.router.get('/configuracion', this.h(() => servicio.configuracion()));
    this.router.patch('/configuracion', this.h((req) => servicio.actualizarConfiguracion(req.body)));
    this.router.get('/negocio', this.h(() => servicio.negocio()));
    this.router.patch('/negocio', this.h((req) => servicio.actualizarNegocio(req.body)));
  }
}
