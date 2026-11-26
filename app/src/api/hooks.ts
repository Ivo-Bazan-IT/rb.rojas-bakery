/* Hooks de datos (TanStack Query): lecturas cacheadas y mutaciones que refrescan lo que corresponde. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './cliente';
import type {
  Configuracion, ContextoCostos, Cotizacion, Equipo, EstadoPedido, Extra, Gasto, Insumo, ListaCompra, Negocio, Pedido,
  Presupuesto, Producto, Receta, Resumen, Usuario, ZonaEnvio,
} from './tipos';

// Todo lo que depende de costos se recalcula si cambia un insumo, una receta, un gasto o la configuración.
const DEPENDEN_DE_COSTOS = [['productos'], ['recetas'], ['contexto'], ['cotizacion']];

function useRefrescar() {
  const qc = useQueryClient();
  return (...claves: string[][]) => Promise.all(claves.map((k) => qc.invalidateQueries({ queryKey: k })));
}

// ---------- Sesión ----------
export const useUsuario = () => useQuery({ queryKey: ['me'], queryFn: () => api.get<Usuario>('/auth/me'), retry: false, staleTime: Infinity });

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { email: string; password: string }) => api.post<Usuario>('/auth/login', d),
    onSuccess: (u) => { qc.setQueryData(['me'], u); },
  });
}

export const useCambiarPassword = () => useMutation({
  mutationFn: (d: { actual: string; nueva: string }) => api.post<{ ok: true }>('/auth/cambiar-password', d),
});

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => { qc.clear(); },
  });
}

// ---------- Catálogos ----------
export const useInsumos = () => useQuery({ queryKey: ['insumos'], queryFn: () => api.get<Insumo[]>('/insumos') });
export const useRecetas = () => useQuery({ queryKey: ['recetas'], queryFn: () => api.get<Receta[]>('/recetas') });
export const useProductos = () => useQuery({ queryKey: ['productos'], queryFn: () => api.get<Producto[]>('/productos') });
export const useGastos = () => useQuery({ queryKey: ['gastos'], queryFn: () => api.get<Gasto[]>('/gastos') });
export const useEquipos = () => useQuery({ queryKey: ['equipos'], queryFn: () => api.get<Equipo[]>('/equipos') });
export const useExtras = () => useQuery({ queryKey: ['extras'], queryFn: () => api.get<Extra[]>('/extras') });
export const useEnvios = () => useQuery({ queryKey: ['envios'], queryFn: () => api.get<ZonaEnvio[]>('/envios') });
export const useConfiguracion = () => useQuery({ queryKey: ['configuracion'], queryFn: () => api.get<Configuracion>('/ajustes/configuracion') });
export const useNegocio = () => useQuery({ queryKey: ['negocio'], queryFn: () => api.get<Negocio>('/ajustes/negocio') });
/** Logo del negocio cargado, o el de la marca si todavía no hay uno. */
export function useLogo(porDefecto: string) {
  const { data } = useNegocio();
  return data?.logoUrl ?? porDefecto;
}
export const useContexto = () => useQuery({ queryKey: ['contexto'], queryFn: () => api.get<ContextoCostos>('/cotizador/contexto') });

/** Guardar (crear o editar) un insumo. */
export function useGuardarInsumo() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: ({ id, ...d }: Partial<Insumo> & { id?: number }) => (id ? api.patch<Insumo>(`/insumos/${id}`, d) : api.post<Insumo>('/insumos', d)),
    onSuccess: () => refrescar(['insumos'], ...DEPENDEN_DE_COSTOS),
  });
}

type ConId = Record<string, unknown> & { id?: number | null };

/** Crear (POST) o editar (PATCH) en un catálogo y refrescar lo que depende de él. */
function useGuardarEn<T>(ruta: string, ...claves: string[][]) {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: ({ id, ...d }: ConId) => (id ? api.patch<T>(`${ruta}/${id}`, d) : api.post<T>(ruta, d)),
    onSuccess: () => refrescar(...claves),
  });
}
/** Borrar. Si el registro está en uso, el back lo archiva y responde { archivado: true }. */
function useBorrarEn(ruta: string, ...claves: string[][]) {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (id: number) => api.del<{ archivado: boolean }>(`${ruta}/${id}`),
    onSuccess: () => refrescar(...claves),
  });
}

export const useBorrarInsumo = () => useBorrarEn('/insumos', ['insumos'], ...DEPENDEN_DE_COSTOS);
export const useGuardarReceta = () => useGuardarEn<Receta>('/recetas', ...DEPENDEN_DE_COSTOS);
export const useBorrarReceta = () => useBorrarEn('/recetas', ...DEPENDEN_DE_COSTOS);
export const useGuardarProducto = () => useGuardarEn<Producto>('/productos', ['productos'], ['cotizacion']);
export const useBorrarProducto = () => useBorrarEn('/productos', ['productos'], ['cotizacion']);
export const useGuardarGasto = () => useGuardarEn<Gasto>('/gastos', ['gastos'], ...DEPENDEN_DE_COSTOS);
export const useBorrarGasto = () => useBorrarEn('/gastos', ['gastos'], ...DEPENDEN_DE_COSTOS);
export const useGuardarEquipo = () => useGuardarEn<Equipo>('/equipos', ['equipos'], ...DEPENDEN_DE_COSTOS);
export const useBorrarEquipo = () => useBorrarEn('/equipos', ['equipos'], ...DEPENDEN_DE_COSTOS);
export const useGuardarExtra = () => useGuardarEn<Extra>('/extras', ['extras'], ['cotizacion']);
export const useBorrarExtra = () => useBorrarEn('/extras', ['extras'], ['cotizacion']);
export const useGuardarEnvio = () => useGuardarEn<ZonaEnvio>('/envios', ['envios'], ['cotizacion']);
export const useBorrarEnvio = () => useBorrarEn('/envios', ['envios'], ['cotizacion']);
export const useGuardarLista = () => useGuardarEn<ListaCompra>('/compras', ['compras']);
export const useBorrarLista = () => useBorrarEn('/compras', ['compras']);

export function useGuardarNegocio() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (d: Partial<Negocio>) => api.patch<Negocio>('/ajustes/negocio', d),
    onSuccess: () => refrescar(['negocio'], ['presupuestos']),
  });
}

export function useGuardarConfiguracion() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (d: Partial<Configuracion>) => api.patch<Configuracion>('/ajustes/configuracion', d),
    onSuccess: () => refrescar(['configuracion'], ['resumen'], ...DEPENDEN_DE_COSTOS),
  });
}

// ---------- Cotizador ----------
export interface OpcionesCotizacion { productoId: number; tamano?: number | null; forrado?: string | null; cantidad?: number | null; extras: number[]; zonaEnvioId?: number | null }

export function useCotizacion(o: OpcionesCotizacion | null) {
  return useQuery({
    queryKey: ['cotizacion', o],
    queryFn: () => api.post<Cotizacion>('/cotizador/calcular', {
      ...o, tamano: o?.tamano ?? undefined, forrado: o?.forrado ?? undefined, cantidad: o?.cantidad ?? undefined,
    }),
    enabled: !!o,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

// ---------- Presupuestos ----------
export const usePresupuestos = () => useQuery({ queryKey: ['presupuestos'], queryFn: () => api.get<Presupuesto[]>('/presupuestos') });
export const usePresupuesto = (id: number | null) =>
  useQuery({ queryKey: ['presupuestos', id], queryFn: () => api.get<Presupuesto>(`/presupuestos/${id}`), enabled: !!id });
export const useDocumento = (id: number) =>
  useQuery({ queryKey: ['presupuestos', id, 'documento'], queryFn: () => api.get<{ presupuesto: Presupuesto; negocio: Negocio }>(`/presupuestos/${id}/documento`) });

export function useGuardarPresupuesto() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: ({ id, ...d }: Record<string, unknown> & { id?: number | null }) =>
      (id ? api.patch<Presupuesto>(`/presupuestos/${id}`, d) : api.post<Presupuesto>('/presupuestos', d)),
    onSuccess: () => refrescar(['presupuestos']),
  });
}

export function useAccionPresupuesto(accion: 'enviar' | 'convertir' | 'duplicar' | 'cancelar' | 'reactivar') {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (id: number) => api.post<Presupuesto>(`/presupuestos/${id}/${accion}`),
    onSuccess: () => refrescar(['presupuestos'], ['pedidos'], ['resumen']),
  });
}

export function useBorrarPresupuesto() {
  const refrescar = useRefrescar();
  return useMutation({ mutationFn: (id: number) => api.del(`/presupuestos/${id}`), onSuccess: () => refrescar(['presupuestos']) });
}

// ---------- Pedidos ----------
export const usePedidos = () => useQuery({ queryKey: ['pedidos'], queryFn: () => api.get<Pedido[]>('/pedidos') });

export function useMoverPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoPedido }) => api.patch<Pedido>(`/pedidos/${id}/estado`, { estado }),
    // Optimista: la tarjeta cambia de columna al instante.
    onMutate: async ({ id, estado }) => {
      await qc.cancelQueries({ queryKey: ['pedidos'] });
      const antes = qc.getQueryData<Pedido[]>(['pedidos']);
      qc.setQueryData<Pedido[]>(['pedidos'], (ps) => ps?.map((p) => (p.id === id ? { ...p, estado } : p)));
      return { antes };
    },
    onError: (_e, _v, ctx) => { if (ctx?.antes) qc.setQueryData(['pedidos'], ctx.antes); },
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: ['pedidos'] }), qc.invalidateQueries({ queryKey: ['resumen'] })]),
  });
}

/** Editar fecha, hora o notas de un pedido. */
export function useGuardarPedido() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: ({ id, ...d }: { id: number; fechaEntrega?: string; horaEntrega?: string; notas?: string }) => api.patch<Pedido>(`/pedidos/${id}`, d),
    onSuccess: () => refrescar(['pedidos'], ['resumen']),
  });
}

// ---------- Compras ----------
export const useListas = () => useQuery({ queryKey: ['compras'], queryFn: () => api.get<ListaCompra[]>('/compras') });

export function useMarcarItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listaId, itemId, comprado }: { listaId: number; itemId: number; comprado: boolean }) =>
      api.patch<ListaCompra>(`/compras/${listaId}/items/${itemId}`, { comprado }),
    onSuccess: (l) => qc.setQueryData<ListaCompra[]>(['compras'], (ls) => ls?.map((x) => (x.id === l.id ? l : x))),
  });
}

export function useGenerarLista() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (d: { desde: string; hasta: string }) => api.post<ListaCompra & { pedidos: number }>('/compras/generar', d),
    onSuccess: () => refrescar(['compras']),
  });
}

// ---------- Fotos ----------
export type RecursoFoto = 'insumos' | 'productos' | 'presupuestos' | 'negocio';
const CLAVES_FOTO: Record<RecursoFoto, string[]> = { insumos: ['insumos'], productos: ['productos'], presupuestos: ['presupuestos'], negocio: ['negocio'] };

/** Sube (con archivo) o quita (sin archivo) la foto de un registro. */
export function useFoto(recurso: RecursoFoto) {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo?: Blob }) =>
      (archivo ? api.put<{ fotoUrl: string | null }>(`/fotos/${recurso}/${id}`, archivo) : api.del<{ fotoUrl: string | null }>(`/fotos/${recurso}/${id}`)),
    // El logo también sale en el PDF de cada presupuesto.
    onSuccess: () => refrescar(CLAVES_FOTO[recurso], ...(recurso === 'negocio' ? [['presupuestos']] : [])),
  });
}

// ---------- Resumen ----------
export const useResumen = (mes: string) => useQuery({ queryKey: ['resumen', mes], queryFn: () => api.get<Resumen>(`/resumen?mes=${mes}`) });
