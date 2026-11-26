/* Tipos de lo que devuelve la API (back/). Montos en centavos. */

export type Unidad = 'kg' | 'litro' | 'unidad';
export type TipoProducto = 'torta' | 'budin' | 'mesa_dulce';
export type Forrado = 'buttercream' | 'pasta';
export type Tamano = 18 | 20 | 22;
export type EstadoPedido = 'senado' | 'realizado' | 'pago' | 'enviado' | 'cancelado';
export type EstadoPresupuesto = 'borrador' | 'enviado' | 'convertido' | 'vencido' | 'cancelado';
export type Estado = EstadoPedido | 'presupuestado';

export const ESTADOS_KANBAN: EstadoPedido[] = ['senado', 'realizado', 'pago', 'enviado', 'cancelado'];

export interface Usuario { id: number; email: string; nombre: string }

export interface Insumo {
  id: number; nombre: string; unidad: Unidad; presentacion: number; precio: number; mermaPct: number; fotoUrl: string | null;
  precioActualizadoAt: string; archivado: boolean; unidadUso: 'g' | 'ml' | 'u'; costoUnitario: number;
  diasDesdeActualizacion: number; desactualizado: boolean;
}

export interface Receta {
  id: number; nombre: string; categoria: string; categoriaLabel: string; escala: 'volumen' | 'superficie' | 'ninguna';
  rendimiento: number | null; trabajoMin: number; hornoMin: number; notas: string; archivado: boolean; costo: number;
  ingredientes: { id: number; insumoId: number; nombre: string; cantidad: number; unidad: string; precio: number; presentacion: number; unidadCompra: Unidad; costo: number; insumoArchivado: boolean }[];
  usadaEn: { id: number; nombre: string }[];
}

export interface PrecioCatalogo {
  tamano?: Tamano; forrado?: Forrado | null; cantidad?: number;
  precio: number; porPorcion: number | null; porciones: [number, number] | null; costoTotal: number; trabajoMin: number; hornoMin: number; avisos: string[];
}

export interface Producto {
  id: number; nombre: string; tipo: TipoProducto; tipoLabel: string; descripcion: string; fotoUrl: string | null;
  armadoMin: number; decoracionMinUnidad: number; porcionesMin: number | null; porcionesMax: number | null; archivado: boolean;
  recetas: { id: number; recetaId: number; nombre: string; categoria: string; rol: string; cantidad: number; costo: number; trabajoMin: number; hornoMin: number; rendimiento: number | null }[];
  variantes: { tamano: Tamano; ajusteTrabajoMin: number; ajusteHornoMin: number }[];
  precios: PrecioCatalogo[]; error: string | null;
}

export interface Gasto { id: number; nombre: string; monto: number; tipo: 'compartido' | 'exclusivo'; factor: number; usaHoras: 'trabajo' | 'horno'; detalle: string; activo: boolean }
export interface Equipo { id: number; nombre: string; valor: number; vidaUtilAnios: number; amortizacionMensual: number }
export interface Extra { id: number; nombre: string; precio: number; activo: boolean }
export interface ZonaEnvio { id: number; nombre: string; precio: number | null; esRetiro: boolean; orden: number; activo: boolean }

export interface Configuracion {
  margenPct: number; redondeoTorta: number; redondeoMesaDulce: number; valorHora: number | null; horasLaborales: number | null;
  horasMesServicios: number; senaPct: number; avisoDias: number;
}
export interface Negocio {
  nombre: string; instagram: string; whatsapp: string; zona: string; mediosPago: string; alias: string; cbu: string;
  validezDias: number; politicas: string; cuidados: string; logoUrl: string | null;
}
export interface ContextoCostos { serviciosPorHoraTrabajo: number; serviciosPorHoraHorno: number; gastosPorHora: number; amortizacion: number; gastosExclusivos: number; avisos: string[] }

export interface Calculo {
  ingredientes: number; servicios: number; gastosNegocio: number; manoDeObra: number; costoTotal: number; ganancia: number; precio: number;
  trabajoMin: number; hornoMin: number; porPorcion: number | null; porciones: [number, number] | null; unidades: number | null; tandas: number | null; avisos: string[];
}
export interface Cotizacion {
  producto: { id: number; nombre: string; tipo: TipoProducto };
  calculo: Calculo;
  extras: { id: number; nombre: string; precio: number }[];
  envio: { id: number; nombre: string; precio: number; esRetiro: boolean } | null;
  total: number; senaPct: number; sena: number; saldo: number;
  contexto: { margenPct: number };
}

export interface LineaPresupuesto { id: number; tipo: 'producto' | 'extra' | 'envio'; descripcion: string; precio: number }
export interface Presupuesto {
  id: number; numero: number; numeroLabel: string; estado: EstadoPresupuesto; estadoVista: EstadoPresupuesto;
  clienteNombre: string; clienteTelefono: string; direccion: string; fechaEntrega: string | null; horaEntrega: string;
  productoId: number | null; productoNombre: string; tipoProducto: TipoProducto | null; tamano: Tamano | null; forrado: Forrado | null; cantidad: number | null;
  detalle: string; fotoReferenciaUrl: string | null; zonaEnvioId: number | null;
  precioProducto: number; total: number; senaPct: number; sena: number; saldo: number; porPorcion: number | null; porcionesMin: number | null; porcionesMax: number | null;
  emitidoAt: string | null; validoHasta: string | null; createdAt: string; lineas: LineaPresupuesto[]; pedido: { id: number } | null;
  calculo?: Calculo & { extras?: { id: number }[]; contexto?: { margenPct: number } };
}

export interface Pedido {
  id: number; estado: EstadoPedido; fechaEntrega: string; horaEntrega: string; notas: string; diasParaEntrega: number;
  presupuestoId: number; numero: string; producto: string; productoNombre: string; cliente: string; telefono: string; direccion: string;
  entrega: string | null; esRetiro: boolean; total: number; sena: number; saldo: number; detalle: string;
}

export interface ListaCompra {
  id: number; nombre: string; tipo: 'estandar' | 'personalizada' | 'pedidos'; desde: string | null; hasta: string | null; createdAt: string;
  items: { id: number; insumoId: number | null; nombre: string; cantidad: number; unidad: string; comprado: boolean }[];
  comprados: number; costoEstimado: number;
}

export interface Resumen {
  mes: string; ventas: number; costo: number; ganancia: number; pedidos: number; horas: number; horasLaborales: number | null; ticketPromedio: number;
  semanas: { label: string; valor: number }[];
  composicion: { clave: string; label: string; pct: number }[];
  masVendidos: { nombre: string; pedidos: number; monto: number }[];
}
