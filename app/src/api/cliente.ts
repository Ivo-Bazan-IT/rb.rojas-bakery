/* Cliente HTTP de la API. La sesión viaja en una cookie httpOnly. */

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BASE = '/api';

async function pedir<T>(metodo: string, ruta: string, body?: unknown): Promise<T> {
  let res: Response;
  const archivo = body instanceof Blob;
  try {
    res = await fetch(BASE + ruta, {
      method: metodo,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': archivo ? body.type || 'application/octet-stream' : 'application/json' },
      body: body === undefined ? undefined : archivo ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisá que el backend esté corriendo.');
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (datos as { error?: string }).error ?? 'Algo salió mal.');
  return datos as T;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, body: unknown = {}) => pedir<T>('POST', ruta, body),
  patch: <T>(ruta: string, body: unknown) => pedir<T>('PATCH', ruta, body),
  del: <T>(ruta: string) => pedir<T>('DELETE', ruta),
  /** Sube un archivo tal cual (la foto ya achicada). */
  put: <T>(ruta: string, archivo: Blob) => pedir<T>('PUT', ruta, archivo),
};
