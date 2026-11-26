/* Entidades de costo: insumos, recetas y el contexto del mes (servicios, gastos, valor hora). */
import { FACTOR_USO, UNIDAD_USO, type Escala, type HorasGasto, type Unidad } from './valores.ts';
import { DomainError } from './errores.ts';

export class InsumoCosto {
  readonly id: number;
  readonly nombre: string;
  readonly unidad: Unidad;
  readonly presentacion: number;
  readonly precio: number;
  readonly mermaPct: number;

  constructor(datos: { id: number; nombre: string; unidad: Unidad; presentacion: number; precio: number; mermaPct?: number }) {
    this.id = datos.id;
    this.nombre = datos.nombre;
    this.unidad = datos.unidad;
    this.presentacion = datos.presentacion;
    this.precio = datos.precio;
    this.mermaPct = datos.mermaPct ?? 0;
  }

  get unidadUso() { return UNIDAD_USO[this.unidad]; }

  /** Cantidad útil de la presentación en unidades de uso (1 kg con 15% de merma = 850 g). */
  get cantidadUtil() { return this.presentacion * FACTOR_USO[this.unidad] * (1 - this.mermaPct / 100); }

  /** Centavos por g, ml o u. */
  get costoPorUnidadUso() { return this.cantidadUtil > 0 ? this.precio / this.cantidadUtil : 0; }

  costoDe(cantidad: number) { return this.costoPorUnidadUso * cantidad; }

  /** No se puede usar en gramos un insumo cargado por unidad, ni al revés. */
  validarUnidad(unidadUsada: string) {
    if (unidadUsada !== this.unidadUso) {
      throw new DomainError(`${this.nombre} se compra por ${this.unidad} y se usa en ${this.unidadUso}, no en ${unidadUsada}.`);
    }
  }
}

export interface IngredienteUso { insumo: InsumoCosto; cantidad: number }

export class RecetaCosto {
  readonly id: number;
  readonly nombre: string;
  readonly escala: Escala;
  readonly trabajoMin: number;
  readonly hornoMin: number;
  readonly rendimiento: number | null;
  readonly ingredientes: IngredienteUso[];
  private readonly costoFijo?: number;

  constructor(datos: {
    id?: number; nombre: string; escala: Escala; trabajoMin: number; hornoMin: number;
    rendimiento?: number | null; ingredientes?: IngredienteUso[]; costo?: number;
  }) {
    this.id = datos.id ?? 0;
    this.nombre = datos.nombre;
    this.escala = datos.escala;
    this.trabajoMin = datos.trabajoMin;
    this.hornoMin = datos.hornoMin;
    this.rendimiento = datos.rendimiento ?? null;
    this.ingredientes = datos.ingredientes ?? [];
    this.costoFijo = datos.costo;
  }

  /** Costo de una receta completa (centavos, sin redondear). */
  get costo() {
    if (this.costoFijo != null) return this.costoFijo;
    return this.ingredientes.reduce((s, i) => s + i.insumo.costoDe(i.cantidad), 0);
  }
}

export interface Servicio { nombre: string; factura: number; factor: number; usaHoras: HorasGasto }

/** Parámetros del mes con los que se costea cualquier producto. */
export class ContextoCostos {
  readonly margenPct: number;
  readonly redondeoTorta: number;
  readonly redondeoMesaDulce: number;
  readonly valorHora: number | null;
  readonly horasLaborales: number | null;
  readonly horasMesServicios: number;
  readonly servicios: Servicio[];
  readonly gastosExclusivos: number;
  readonly amortizacion: number;
  readonly senaPct: number;

  constructor(d: {
    margenPct: number; redondeoTorta: number; redondeoMesaDulce: number; valorHora: number | null; horasLaborales: number | null;
    horasMesServicios?: number; servicios: Servicio[]; gastosExclusivos: number; amortizacion: number; senaPct: number;
  }) {
    this.margenPct = d.margenPct;
    this.redondeoTorta = d.redondeoTorta;
    this.redondeoMesaDulce = d.redondeoMesaDulce;
    this.valorHora = d.valorHora;
    this.horasLaborales = d.horasLaborales;
    this.horasMesServicios = d.horasMesServicios ?? 720;
    this.servicios = d.servicios;
    this.gastosExclusivos = d.gastosExclusivos;
    this.amortizacion = d.amortizacion;
    this.senaPct = d.senaPct;
  }

  get margen() { return this.margenPct / 100; }

  private tarifa(usa: HorasGasto) {
    return this.servicios.filter((s) => s.usaHoras === usa)
      .reduce((a, s) => a + (s.factura / this.horasMesServicios) * s.factor, 0);
  }
  /** Servicios por hora de trabajo (luz, agua, internet). */
  get serviciosPorHoraTrabajo() { return this.tarifa('trabajo'); }
  /** Servicios por hora de horno (gas). */
  get serviciosPorHoraHorno() { return this.tarifa('horno'); }
  /** Gastos exclusivos + amortización ÷ horas laborales. */
  get gastosPorHora() { return this.horasLaborales ? (this.gastosExclusivos + this.amortizacion) / this.horasLaborales : 0; }

  /** Lo que falta cargar para que el precio sea real. */
  get avisos(): string[] {
    const a: string[] = [];
    if (!this.valorHora) a.push('Falta cargar el valor hora en Costos y ajustes.');
    if (!this.horasLaborales) a.push('Falta cargar las horas laborales del mes en Costos y ajustes.');
    if (!this.servicios.length) a.push('No hay servicios compartidos cargados (luz, gas, agua, internet).');
    return a;
  }
}

/** Amortización mensual de un equipo: valor ÷ (años × 12). */
export function amortizacionMensual(valor: number, vidaUtilAnios: number) {
  return vidaUtilAnios > 0 ? valor / (vidaUtilAnios * 12) : 0;
}
