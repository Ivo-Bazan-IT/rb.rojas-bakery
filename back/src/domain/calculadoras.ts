/* Calculadoras de precio (patrón template method): cada tipo de producto define
   cuánto de cada receta usa y cuánto tiempo lleva; la base aplica la fórmula común.

   Precio = redondearArriba((ingredientes + servicios + gastos + mano de obra) × (1 + margen), múltiplo) */
import { ContextoCostos, RecetaCosto, type IngredienteUso } from './costos.ts';
import {
  MESA_DULCE_MAX, MESA_DULCE_MIN, TAMANO_REFERENCIA, escalaTorta, redondearArriba, type Forrado, type RolReceta, type TipoProducto,
} from './valores.ts';
import { DomainError } from './errores.ts';

export interface RecetaEnProducto { receta: RecetaCosto; rol: RolReceta; cantidad: number }

export interface ProductoCalculable {
  nombre: string;
  tipo: TipoProducto;
  armadoMin: number;
  decoracionMinUnidad: number;
  porcionesMin: number | null;
  porcionesMax: number | null;
  recetas: RecetaEnProducto[];
  /** Ingredientes sueltos del producto. No escalan con el tamaño; en mesa dulce son por unidad. */
  insumos?: IngredienteUso[];
}

export interface OpcionesCalculo {
  /** Tortas: diámetro en cm (20 = referencia). Se ignora si la torta es de tamaño único. */
  tamano?: number;
  forrado?: Forrado;
  cantidad?: number;
  /** Ingredientes sueltos que suma el presupuesto (cantidad fija). */
  insumosExtra?: IngredienteUso[];
  /** ± minutos de trabajo y de horno para este pedido. */
  ajusteTrabajoMin?: number;
  ajusteHornoMin?: number;
}

/** Una torta con alguna receta que no escala se vende en un único tamaño: la receta tal cual, sin escalar. */
export function recetaSinEscala(p: Pick<ProductoCalculable, 'tipo' | 'recetas'>): string | null {
  if (p.tipo !== 'torta') return null;
  return p.recetas.find((r) => r.receta.escala === 'ninguna')?.receta.nombre ?? null;
}

export interface LineaReceta { nombre: string; rol: RolReceta; factor: number; costo: number; trabajoMin: number; hornoMin: number }
export interface InsumoUsado { insumoId: number; nombre: string; cantidad: number; unidad: string }
export interface LineaInsumo { insumoId: number; nombre: string; cantidad: number; unidad: string; costo: number; origen: 'producto' | 'presupuesto' }

export interface ResultadoCalculo {
  tipo: TipoProducto;
  /** Tortas: diámetro usado; null si es de tamaño único (o no es torta). */
  tamano: number | null;
  tamanoUnico: boolean;
  ingredientes: number;
  servicios: number;
  gastosNegocio: number;
  manoDeObra: number;
  costoTotal: number;
  ganancia: number;
  conMargen: number;
  precio: number;
  trabajoMin: number;
  hornoMin: number;
  /** Precio por porción (tortas y budines) o por unidad (mesa dulce), sin redondear. */
  porPorcion: number | null;
  porciones: [number, number] | null;
  unidades: number | null;
  tandas: number | null;
  recetas: LineaReceta[];
  /** Ingredientes sueltos (del producto y del presupuesto) ya multiplicados. */
  sueltos: LineaInsumo[];
  insumos: InsumoUsado[];
  avisos: string[];
}

interface Consumo { receta: RecetaCosto; rol: RolReceta; factorIngredientes: number; vecesTiempo: number }

export abstract class CalculadoraProducto {
  protected readonly ctx: ContextoCostos;
  constructor(ctx: ContextoCostos) { this.ctx = ctx; }

  /** Qué recetas entran y en qué proporción. */
  protected abstract consumos(p: ProductoCalculable, o: OpcionesCalculo): Consumo[];
  /** Tiempo propio del producto (armado, decoración, ajustes por variante). */
  protected abstract tiempoExtra(p: ProductoCalculable, o: OpcionesCalculo): { trabajoMin: number; hornoMin: number };
  protected abstract redondeo(): number;
  protected abstract referencia(p: ProductoCalculable, o: OpcionesCalculo, precio: number):
    { porPorcion: number | null; porciones: [number, number] | null; unidades: number | null; tandas: number | null };
  /** Cuántas veces entran los ingredientes sueltos del producto (1; en mesa dulce, las unidades). */
  protected vecesInsumosProducto(_p: ProductoCalculable, _o: OpcionesCalculo) { return 1; }
  protected tamanoUsado(_p: ProductoCalculable, _o: OpcionesCalculo): number | null { return null; }

  calcular(p: ProductoCalculable, o: OpcionesCalculo = {}): ResultadoCalculo {
    const consumos = this.consumos(p, o);
    const avisos = [...this.ctx.avisos];
    if (!consumos.length && !p.insumos?.length) avisos.push(`${p.nombre} no tiene recetas base cargadas.`);

    const recetas: LineaReceta[] = consumos.map((c) => ({
      nombre: c.receta.nombre, rol: c.rol, factor: c.factorIngredientes,
      costo: c.receta.costo * c.factorIngredientes,
      trabajoMin: c.receta.trabajoMin * c.vecesTiempo, hornoMin: c.receta.hornoMin * c.vecesTiempo,
    }));
    const veces = this.vecesInsumosProducto(p, o);
    const sueltos: LineaInsumo[] = [
      ...(p.insumos ?? []).map((i) => this.lineaInsumo(i, i.cantidad * veces, 'producto')),
      ...(o.insumosExtra ?? []).map((i) => this.lineaInsumo(i, i.cantidad, 'presupuesto')),
    ];
    const extra = this.tiempoExtra(p, o);
    const ingredientes = recetas.reduce((s, r) => s + r.costo, 0) + sueltos.reduce((s, i) => s + i.costo, 0);
    // Los ajustes del presupuesto suman o restan, pero el tiempo nunca queda negativo.
    const trabajoMin = Math.max(0, recetas.reduce((s, r) => s + r.trabajoMin, 0) + extra.trabajoMin + (o.ajusteTrabajoMin ?? 0));
    const hornoMin = Math.max(0, recetas.reduce((s, r) => s + r.hornoMin, 0) + extra.hornoMin + (o.ajusteHornoMin ?? 0));
    const hTrabajo = trabajoMin / 60;
    const hHorno = hornoMin / 60;

    const servicios = hTrabajo * this.ctx.serviciosPorHoraTrabajo + hHorno * this.ctx.serviciosPorHoraHorno;
    const gastosNegocio = this.ctx.gastosPorHora * hTrabajo;
    const manoDeObra = (this.ctx.valorHora ?? 0) * hTrabajo;
    const costoTotal = ingredientes + servicios + gastosNegocio + manoDeObra;
    const conMargen = costoTotal * (1 + this.ctx.margen);
    const precio = redondearArriba(conMargen, this.redondeo());

    const tamano = this.tamanoUsado(p, o);
    return {
      tipo: p.tipo, tamano, tamanoUnico: p.tipo === 'torta' && tamano == null, ingredientes, servicios, gastosNegocio, manoDeObra, costoTotal,
      ganancia: costoTotal * this.ctx.margen, conMargen, precio, trabajoMin, hornoMin,
      ...this.referencia(p, o, precio),
      recetas, sueltos, insumos: this.sumarInsumos(consumos, sueltos), avisos,
    };
  }

  private lineaInsumo(i: IngredienteUso, cantidad: number, origen: LineaInsumo['origen']): LineaInsumo {
    return { insumoId: i.insumo.id, nombre: i.insumo.nombre, cantidad, unidad: i.insumo.unidadUso, costo: i.insumo.costoDe(cantidad), origen };
  }

  /** Cantidades de insumos usadas (para la lista de compras). */
  private sumarInsumos(consumos: Consumo[], sueltos: LineaInsumo[]): InsumoUsado[] {
    const mapa = new Map<number, InsumoUsado>();
    const sumar = (insumoId: number, nombre: string, unidad: string, cantidad: number) => {
      const prev = mapa.get(insumoId) ?? { insumoId, nombre, cantidad: 0, unidad };
      prev.cantidad += cantidad;
      mapa.set(insumoId, prev);
    };
    for (const c of consumos) {
      for (const i of c.receta.ingredientes) sumar(i.insumo.id, i.insumo.nombre, i.insumo.unidadUso, i.cantidad * c.factorIngredientes);
    }
    for (const i of sueltos) sumar(i.insumoId, i.nombre, i.unidad, i.cantidad);
    return [...mapa.values()];
  }
}

/** Tortas: recetas calibradas en 20 cm; bizcochos y rellenos escalan por volumen, el forrado por superficie.
    El diámetro se elige al presupuestar. Si alguna receta no escala, la torta es de tamaño único: todo va tal cual. */
export class CalculadoraTorta extends CalculadoraProducto {
  protected tamanoUsado(p: ProductoCalculable, o: OpcionesCalculo) {
    return recetaSinEscala(p) ? null : (o.tamano ?? TAMANO_REFERENCIA);
  }
  protected consumos(p: ProductoCalculable, o: OpcionesCalculo): Consumo[] {
    const tamano = this.tamanoUsado(p, o);
    const esc = tamano == null ? null : escalaTorta(tamano);
    const forrados = p.recetas.filter((r) => r.rol !== 'base');
    const forrado = o.forrado ?? (forrados.some((r) => r.rol === 'forrado_buttercream') ? 'buttercream' : 'pasta');
    return p.recetas
      .filter((r) => r.rol === 'base' || r.rol === `forrado_${forrado}`)
      .map((r) => ({
        receta: r.receta, rol: r.rol,
        factorIngredientes: r.cantidad * (!esc || r.receta.escala === 'ninguna' ? 1 : esc[r.receta.escala]),
        vecesTiempo: 1, // los tiempos no escalan: se ajustan a mano en el presupuesto
      }));
  }
  protected tiempoExtra(p: ProductoCalculable) { return { trabajoMin: p.armadoMin, hornoMin: 0 }; }
  protected redondeo() { return this.ctx.redondeoTorta; }
  protected referencia(p: ProductoCalculable, o: OpcionesCalculo, precio: number) {
    const porciones = escalaTorta(this.tamanoUsado(p, o) ?? TAMANO_REFERENCIA).porciones;
    return { porPorcion: precio / porciones[0], porciones, unidades: null, tandas: null };
  }
}

/** Budines: sin variantes ni escalado; se venden enteros con porciones de referencia. */
export class CalculadoraBudin extends CalculadoraProducto {
  protected consumos(p: ProductoCalculable): Consumo[] {
    return p.recetas.map((r) => ({ receta: r.receta, rol: r.rol, factorIngredientes: r.cantidad, vecesTiempo: 1 }));
  }
  protected tiempoExtra(p: ProductoCalculable) { return { trabajoMin: p.armadoMin, hornoMin: 0 }; }
  protected redondeo() { return this.ctx.redondeoTorta; }
  protected referencia(p: ProductoCalculable, _o: OpcionesCalculo, precio: number) {
    const min = p.porcionesMin;
    const porciones: [number, number] | null = min ? [min, p.porcionesMax ?? min] : null;
    return { porPorcion: min ? precio / min : null, porciones, unidades: null, tandas: null };
  }
}

/** Mesa dulce: ingredientes proporcionales a las unidades, tandas completas para masa y horno,
    decoración por unidad y redondeo solo sobre el total. */
export class CalculadoraMesaDulce extends CalculadoraProducto {
  private unidades(o: OpcionesCalculo) {
    const n = o.cantidad ?? 24;
    if (!Number.isInteger(n) || n < MESA_DULCE_MIN || n > MESA_DULCE_MAX) {
      throw new DomainError(`La mesa dulce se presupuesta de ${MESA_DULCE_MIN} a ${MESA_DULCE_MAX} unidades.`);
    }
    return n;
  }
  protected consumos(p: ProductoCalculable, o: OpcionesCalculo): Consumo[] {
    const n = this.unidades(o);
    return p.recetas.map((r) => {
      const rinde = r.receta.rendimiento && r.receta.rendimiento > 0 ? r.receta.rendimiento : n;
      return {
        receta: r.receta, rol: r.rol,
        factorIngredientes: r.cantidad * (n / rinde), // 30 de una receta que rinde 24 = 1,25 recetas
        vecesTiempo: Math.ceil(n / rinde - 1e-9), // 30 de 24 = 2 tandas
      };
    });
  }
  protected tiempoExtra(p: ProductoCalculable, o: OpcionesCalculo) {
    return { trabajoMin: p.armadoMin + p.decoracionMinUnidad * this.unidades(o), hornoMin: 0 };
  }
  protected vecesInsumosProducto(_p: ProductoCalculable, o: OpcionesCalculo) { return this.unidades(o); }
  protected redondeo() { return this.ctx.redondeoMesaDulce; }
  protected referencia(p: ProductoCalculable, o: OpcionesCalculo, precio: number) {
    const n = this.unidades(o);
    const rindes = p.recetas.map((r) => r.receta.rendimiento).filter((x): x is number => !!x);
    const tandas = rindes.length ? Math.max(...rindes.map((r) => Math.ceil(n / r - 1e-9))) : 1;
    return { porPorcion: precio / n, porciones: null, unidades: n, tandas };
  }
}

/** Fábrica: elige la calculadora según el tipo de producto. */
export function calculadoraPara(tipo: TipoProducto, ctx: ContextoCostos): CalculadoraProducto {
  switch (tipo) {
    case 'torta': return new CalculadoraTorta(ctx);
    case 'budin': return new CalculadoraBudin(ctx);
    case 'mesa_dulce': return new CalculadoraMesaDulce(ctx);
    default: throw new DomainError(`Tipo de producto desconocido: ${tipo as string}`);
  }
}

/** Total al cliente: precio del producto + extras + envío (precios finales, sin margen ni redondeo). */
export class Cotizacion {
  readonly precioProducto: number;
  readonly extras: { nombre: string; precio: number }[];
  readonly envio: { nombre: string; precio: number } | null;
  readonly senaPct: number;

  constructor(d: { precioProducto: number; extras: { nombre: string; precio: number }[]; envio: { nombre: string; precio: number } | null; senaPct: number }) {
    this.precioProducto = d.precioProducto;
    this.extras = d.extras;
    this.envio = d.envio;
    this.senaPct = d.senaPct;
  }

  get totalExtras() { return this.extras.reduce((s, e) => s + e.precio, 0); }
  get total() { return this.precioProducto + this.totalExtras + (this.envio?.precio ?? 0); }
  /** Seña sobre el total, redondeada al peso. */
  get sena() { return Math.round((this.total * this.senaPct) / 100 / 100) * 100; }
  get saldo() { return this.total - this.sena; }
}
