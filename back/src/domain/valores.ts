/* Valores del dominio: unidades, tipos de producto, estados y reglas de dinero.
   Todos los montos son centavos. Los cálculos intermedios pueden tener decimales;
   solo se redondea donde lo pide la regla de negocio. */
import { DomainError } from './errores.ts';

export const UNIDADES = ['kg', 'litro', 'unidad'] as const;
export type Unidad = (typeof UNIDADES)[number];

/** Unidad en la que se usa un insumo dentro de una receta. Un insumo por kg se usa en g, por L en ml, por unidad en u. */
export const UNIDAD_USO: Record<Unidad, 'g' | 'ml' | 'u'> = { kg: 'g', litro: 'ml', unidad: 'u' };
/** Cuántas unidades de uso trae una unidad de compra (1 kg = 1000 g). */
export const FACTOR_USO: Record<Unidad, number> = { kg: 1000, litro: 1000, unidad: 1 };

export const CATEGORIAS_RECETA = ['bizcochos', 'rellenos', 'ganache', 'forrados', 'decoraciones'] as const;
export type CategoriaReceta = (typeof CATEGORIAS_RECETA)[number];
export const CATEGORIA_LABEL: Record<CategoriaReceta, string> = {
  bizcochos: 'Bizcochos, masas y almíbar',
  rellenos: 'Rellenos',
  ganache: 'Ganache y sellado',
  forrados: 'Forrados y cubiertas',
  decoraciones: 'Decoraciones',
};

export const ESCALAS = ['volumen', 'superficie', 'ninguna'] as const;
export type Escala = (typeof ESCALAS)[number];

export const TIPOS_PRODUCTO = ['torta', 'budin', 'mesa_dulce'] as const;
export type TipoProducto = (typeof TIPOS_PRODUCTO)[number];

export const ROLES_RECETA = ['base', 'forrado_buttercream', 'forrado_pasta'] as const;
export type RolReceta = (typeof ROLES_RECETA)[number];

export const FORRADOS = ['buttercream', 'pasta'] as const;
export type Forrado = (typeof FORRADOS)[number];

/** Tortas: las recetas se cargan para 20 cm; el presupuesto elige cualquier diámetro entre el mínimo y el máximo. */
export const TAMANO_REFERENCIA = 20;
export const TAMANO_MIN = 10;
export const TAMANO_MAX = 40;
/** Tamaños habituales (accesos rápidos en el presupuesto). */
export const TAMANOS_SUGERIDOS = [18, 20, 22] as const;

/** Porciones de referencia de los tamaños habituales; el resto se estima por superficie. */
const PORCIONES_TORTA: Record<number, [number, number]> = { 18: [25, 28], 20: [30, 35], 22: [40, 45] };
/** Alto de referencia (cm) con el que se calcula la superficie a forrar: tapa + lateral. */
const ALTO_TORTA = 17.5;

const dosDecimales = (n: number) => Math.round(n * 100) / 100;

/** Escalado de una torta de `d` cm respecto de la receta calibrada en 20 cm, y porciones de referencia.
    Volumen ∝ diámetro² (18 cm × 0,81 · 22 cm × 1,21). Superficie = tapa + lateral (18 cm × 0,88 · 22 cm × 1,12). */
export function escalaTorta(d: number): { volumen: number; superficie: number; porciones: [number, number] } {
  if (!Number.isInteger(d) || d < TAMANO_MIN || d > TAMANO_MAX) {
    throw new DomainError(`El tamaño tiene que ser un número entero de ${TAMANO_MIN} a ${TAMANO_MAX} cm.`);
  }
  const r = d / 2, r0 = TAMANO_REFERENCIA / 2;
  const area = (d / TAMANO_REFERENCIA) ** 2;
  const superficie = (r * r + 2 * r * ALTO_TORTA) / (r0 * r0 + 2 * r0 * ALTO_TORTA);
  const ref = PORCIONES_TORTA[TAMANO_REFERENCIA]!;
  const porciones = PORCIONES_TORTA[d] ?? [Math.max(1, Math.round(ref[0] * area)), Math.max(1, Math.round(ref[1] * area))];
  return { volumen: dosDecimales(area), superficie: dosDecimales(superficie), porciones };
}

export const MESA_DULCE_MIN = 4;
export const MESA_DULCE_MAX = 36;

export const TIPOS_GASTO = ['compartido', 'exclusivo'] as const;
export type TipoGasto = (typeof TIPOS_GASTO)[number];
export const HORAS_GASTO = ['trabajo', 'horno'] as const;
export type HorasGasto = (typeof HORAS_GASTO)[number];

/** 'vencido' no se guarda: se calcula cuando un enviado pasó su validez. 'cancelado' = el cliente no siguió. */
export const ESTADOS_PRESUPUESTO = ['borrador', 'enviado', 'convertido', 'vencido', 'cancelado'] as const;
export type EstadoPresupuesto = (typeof ESTADOS_PRESUPUESTO)[number];

export const ESTADOS_PEDIDO = ['senado', 'realizado', 'pago', 'enviado', 'cancelado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const TIPOS_LISTA = ['estandar', 'personalizada', 'pedidos'] as const;

/** Redondeo hacia arriba al múltiplo. La tolerancia evita subir un escalón por errores de coma flotante. */
export function redondearArriba(valor: number, multiplo: number): number {
  if (multiplo <= 0) return Math.ceil(valor - 1e-9);
  return Math.ceil(valor / multiplo - 1e-9) * multiplo;
}
