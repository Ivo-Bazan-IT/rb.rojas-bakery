/* Almacén de fotos. Dos implementaciones con la misma interfaz:
   - AlmacenDisco: carpeta del servidor (desarrollo en la PC).
   - AlmacenBlob: Vercel Blob privado (producción: las funciones de Vercel no guardan archivos).
   Las fotos siempre se sirven por la API (/api/fotos/archivo/:nombre) con sesión iniciada,
   así que la URL guardada en la base es la misma en los dos casos. */
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { del, get, list, put } from '@vercel/blob';
import { DatosInvalidos } from './errores.ts';

/** Vercel acepta cuerpos de hasta 4,5 MB; la app achica las fotos a ~300 KB antes de subirlas. */
export const MAX_BYTES_FOTO = 4 * 1024 * 1024;
export const PREFIJO_URL = '/api/fotos/archivo/';
const NOMBRE_VALIDO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type TipoImagen = 'jpg' | 'png' | 'webp';
const MIME: Record<TipoImagen, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

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
export const nombreValido = (nombre: string) => NOMBRE_VALIDO.test(nombre);
const mimeDe = (nombre: string) => MIME[nombre.split('.').pop() as TipoImagen];

/** Valida la imagen y le asigna un nombre único (no se pisan ni se adivinan). */
function prepararImagen(datos: unknown) {
  if (!Buffer.isBuffer(datos) || datos.length === 0) throw new DatosInvalidos('Mandá una imagen JPG, PNG o WebP.');
  if (datos.length > MAX_BYTES_FOTO) throw new DatosInvalidos('La foto pesa más de 4 MB.');
  const tipo = tipoDeImagen(datos);
  if (!tipo) throw new DatosInvalidos('El archivo no es una imagen JPG, PNG o WebP.');
  return { datos, nombre: `${randomUUID()}.${tipo}`, mime: MIME[tipo] };
}

export interface ArchivoFoto { stream: Readable; mime: string }

export interface Almacen {
  /** Valida y guarda la imagen. Devuelve la URL con la que se sirve. */
  guardar(datos: unknown): Promise<string>;
  /** El archivo para servirlo, o null si no existe. */
  leer(nombre: string): Promise<ArchivoFoto | null>;
  borrar(url: string | null | undefined): Promise<void>;
  /** Borra los archivos que nadie usa y tienen más de `minutos`. Devuelve cuántos borró. */
  limpiar(enUso: Set<string>, minutos?: number): Promise<number>;
}

// ---------- Disco (desarrollo) ----------
export class AlmacenDisco implements Almacen {
  readonly dir: string;
  constructor(dir: string) { this.dir = path.resolve(dir); }

  async guardar(datos: unknown) {
    const f = prepararImagen(datos);
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, f.nombre), f.datos);
    return PREFIJO_URL + f.nombre;
  }

  /** Ruta en disco de un archivo, solo si el nombre es uno que generó este almacén. */
  ruta(nombre: string): string | null {
    return NOMBRE_VALIDO.test(nombre) ? path.join(this.dir, nombre) : null;
  }

  async leer(nombre: string) {
    const ruta = this.ruta(nombre);
    if (!ruta) return null;
    try { await stat(ruta); } catch { return null; }
    return { stream: createReadStream(ruta), mime: mimeDe(nombre) };
  }

  async borrar(url: string | null | undefined) {
    const nombre = nombreDeUrl(url);
    if (nombre) await rm(path.join(this.dir, nombre), { force: true });
  }

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

/** Nombre anterior, para no romper importaciones. */
export { AlmacenDisco as AlmacenFotos };

// ---------- Vercel Blob privado (producción) ----------
const CARPETA_BLOB = 'fotos/';

export class AlmacenBlob implements Almacen {
  async guardar(datos: unknown) {
    const f = prepararImagen(datos);
    await put(CARPETA_BLOB + f.nombre, f.datos, { access: 'private', contentType: f.mime, addRandomSuffix: false });
    return PREFIJO_URL + f.nombre;
  }

  async leer(nombre: string) {
    if (!NOMBRE_VALIDO.test(nombre)) return null;
    const r = await get(CARPETA_BLOB + nombre, { access: 'private' });
    if (!r?.stream) return null;
    return { stream: Readable.fromWeb(r.stream as import('node:stream/web').ReadableStream), mime: mimeDe(nombre) };
  }

  async borrar(url: string | null | undefined) {
    const nombre = nombreDeUrl(url);
    if (nombre) await del(CARPETA_BLOB + nombre);
  }

  async limpiar(enUso: Set<string>, minutos = 60) {
    const limite = Date.now() - minutos * 60_000;
    const viejas: string[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: CARPETA_BLOB, cursor });
      for (const b of r.blobs) {
        const n = b.pathname.slice(CARPETA_BLOB.length);
        if (NOMBRE_VALIDO.test(n) && !enUso.has(n) && new Date(b.uploadedAt).getTime() < limite) viejas.push(b.pathname);
      }
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    if (viejas.length) await del(viejas);
    return viejas.length;
  }
}

/** Blob si hay credenciales de Vercel Blob (o FOTOS_ALMACEN=blob); si no, disco. */
export function crearAlmacen(dirDisco: string): Almacen {
  const modo = process.env.FOTOS_ALMACEN ?? (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? 'blob' : 'disco');
  return modo === 'blob' ? new AlmacenBlob() : new AlmacenDisco(dirDisco);
}
