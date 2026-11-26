/* Almacén de fotos: reconoce el formato por los bytes, rechaza lo que no es imagen y limpia huérfanas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AlmacenFotos, PREFIJO_URL, nombreDeUrl, tipoDeImagen } from '../src/core/AlmacenFotos.ts';

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);

test('reconoce JPG, PNG y WebP por los bytes', () => {
  assert.equal(tipoDeImagen(JPG), 'jpg');
  assert.equal(tipoDeImagen(PNG), 'png');
  assert.equal(tipoDeImagen(WEBP), 'webp');
  assert.equal(tipoDeImagen(Buffer.from('<svg onload=alert(1)>')), null);
  assert.equal(tipoDeImagen(Buffer.from('GIF89a')), null);
});

test('solo acepta nombres generados por el almacén (sin rutas ni ..)', () => {
  assert.equal(nombreDeUrl(`${PREFIJO_URL}../../.env`), null);
  assert.equal(nombreDeUrl('https://otro.sitio/foto.jpg'), null);
  assert.equal(nombreDeUrl(`${PREFIJO_URL}0b6c3c84-8f61-4b8e-9a33-6f2b8d1a7c11.jpg`), '0b6c3c84-8f61-4b8e-9a33-6f2b8d1a7c11.jpg');
  assert.equal(new AlmacenFotos('x').ruta('..\..\secreto.jpg'), null);
});

test('guarda, rechaza no-imágenes y limpia solo las huérfanas viejas', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'rb-fotos-'));
  try {
    const a = new AlmacenFotos(dir);
    const usada = await a.guardar(JPG);
    const huerfana = await a.guardar(PNG);
    const nueva = await a.guardar(WEBP);
    await assert.rejects(a.guardar(Buffer.from('hola')), /no es una imagen/);
    await assert.rejects(a.guardar({}), /Mandá una imagen/);
    const viejo = new Date(Date.now() - 2 * 3600_000);
    for (const u of [usada, huerfana]) await utimes(path.join(dir, nombreDeUrl(u)!), viejo, viejo);
    const borrados = await a.limpiar(new Set([nombreDeUrl(usada)!]));
    assert.equal(borrados, 1);
    assert.deepEqual((await readdir(dir)).sort(), [nombreDeUrl(usada), nombreDeUrl(nueva)].sort());
  } finally { await rm(dir, { recursive: true, force: true }); }
});
