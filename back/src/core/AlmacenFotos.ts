/* Guarda las fotos en una carpeta del servidor con un nombre único (no se pisan ni se adivinan).
   Para pasar a un almacenamiento en la nube alcanza con otra clase con los mismos métodos. */
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatosInvalidos } from './errores.ts';

export const MAX_BYTES_FOTO = 6 * 1024 * 1024;
export const PREFIJO_URL = '/api/fotos/archivo/';
const NOMBRE_VALIDO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type TipoImagen = 'jpg' | 'png' | 'webp';

/** Reconoce el formato por los primeros bytes del archivo, no por lo que dice el navegador. */
export function tipoDeImagen(b: Buffer): TipoImagen | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** "/api/fotos/archivo/abc.jpg" → "abc.jpg" (o null si la URL no es de este almacén). */
export function nombreDeUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith(PREFIJO_URL)) return null;
  const nombre = url.slice(PREFIJO_URL.length);
  return NOMBRE_VALIDO.test(nombre) ? nombre : null;
}

export class AlmacenFotos {
  readonly dir: string;
  constructor(dir: string) { this.dir = path.resolve(dir); }

  /** Valida y guarda la imagen. Devuelve la URL con la que se sirve. */
  async guardar(datos: unknown): Promise<string> {
    if (!Buffer.isBuffer(datos) || datos.length === 0) throw new DatosInvalidos('Mandá una imagen JPG, PNG o WebP.');
    if (datos.length > MAX_BYTES_FOTO) throw new DatosInvalidos('La foto pesa más de 6 MB.');
    const tipo = tipoDeImagen(datos);
    if (!tipo) throw new DatosInvalidos('El archivo no es una imagen JPG, PNG o WebP.');
    await mkdir(this.dir, { recursive: true });
    const nombre = `${randomUUID()}.${tipo}`;
    await writeFile(path.join(this.dir, nombre), datos);
    return PREFIJO_URL + nombre;
  }

  /** Ruta en disco de un archivo, solo si el nombre es uno que generó este almacén. */
  ruta(nombre: string): string | null {
    return NOMBRE_VALIDO.test(nombre) ? path.join(this.dir, nombre) : null;
  }

  async borrar(url: string | null | undefined) {
    const nombre = nombreDeUrl(url);
    if (nombre) await rm(path.join(this.dir, nombre), { force: true });
  }

  /** Borra los archivos que nadie usa y tienen más de `minutos` (fotos reemplazadas o de registros borrados). */
  async limpiar(enUso: Set<string>, minutos = 60) {
    let nombres: string[];
    try { nombres = await readdir(this.dir); } catch { return 0; }
    const limite = Date.now() - minutos * 60_000;
    let borrados = 0;
    for (const n of nombres) {
      if (!NOMBRE_VALIDO.test(n) || enUso.has(n)) continue;
      const s = await stat(path.join(this.dir, n));
      if (s.mtimeMs < limite) { await rm(path.join(this.dir, n), { force: true }); borrados++; }
    }
    return borrados;
  }
}
