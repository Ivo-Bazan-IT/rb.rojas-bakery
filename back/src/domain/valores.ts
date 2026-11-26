/* Valores del dominio: unidades, tipos de producto, estados y reglas de dinero.
   Todos los montos son centavos. Los cálculos intermedios pueden tener decimales;
   solo se redondea donde lo pide la regla de negocio. */

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

export const TAMANOS = [18, 20, 22] as const;
export type Tamano = (typeof TAMANOS)[number];

/** Escalado de tortas respecto de la receta calibrada en 20 cm, y porciones de referencia. */
export const ESCALA_TORTA: Record<Tamano, { volumen: number; superficie: number; porciones: [number, number] }> = {
  18: { volumen: 0.81, superficie: 0.88, porciones: [25, 28] },
  20: { volumen: 1, superficie: 1, porciones: [30, 35] },
  22: { volumen: 1.21, superficie: 1.12, porciones: [40, 45] },
};

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
