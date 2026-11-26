/* Sube las fotos de una carpeta local (back/uploads) a Vercel Blob privado, con el mismo nombre,
   así las URLs guardadas en la base (/api/fotos/archivo/<nombre>) siguen funcionando.
   Uso:  npx tsx --env-file=<archivo con BLOB_READ_WRITE_TOKEN> scripts/subir-fotos.ts uploads */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { list, put } from '@vercel/blob';
import { nombreValido } from '../src/core/AlmacenFotos.ts';

const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const carpeta = process.argv[2] ?? 'uploads';

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Falta BLOB_READ_WRITE_TOKEN.');
  const existentes = new Set((await list({ prefix: 'fotos/', limit: 1000 })).blobs.map((b) => b.pathname));
  let subidas = 0;
  for (const nombre of await readdir(carpeta)) {
    if (!nombreValido(nombre)) continue;
    if (existentes.has(`fotos/${nombre}`)) { console.log(`ya estaba  ${nombre}`); continue; }
    const datos = await readFile(path.join(carpeta, nombre));
    await put(`fotos/${nombre}`, datos, { access: 'private', contentType: MIME[nombre.split('.').pop()!], addRandomSuffix: false });
    console.log(`subida     ${nombre}`);
    subidas++;
  }
  console.log(`Listo: ${subidas} foto(s) subidas.`);
}

main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; });
