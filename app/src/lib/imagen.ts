/* Achica las fotos antes de subirlas: una foto de celular (4–8 MB) queda en ~200–400 KB.
   Respeta la orientación de la cámara. Las fotos salen en JPEG; el logo puede conservar la transparencia (PNG). */
export interface OpcionesImagen {
  /** Lado más largo, en px. */
  ladoMax?: number;
  /** Si el archivo es PNG o WebP, lo deja en PNG con fondo transparente (para logos). */
  transparente?: boolean;
}

export async function achicarFoto(archivo: File, { ladoMax = 1600, transparente = false }: OpcionesImagen = {}): Promise<Blob> {
  if (!archivo.type.startsWith('image/')) throw new Error('Elegí un archivo de imagen (JPG, PNG o WebP).');
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); }
  catch { throw new Error('No se pudo leer la imagen. Probá con un JPG o PNG.'); }
  const png = transparente && /image\/(png|webp)/.test(archivo.type);
  const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.round(bmp.width * escala));
  lienzo.height = Math.max(1, Math.round(bmp.height * escala));
  const ctx = lienzo.getContext('2d')!;
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, lienzo.width, lienzo.height); } // JPEG no tiene transparencia
  ctx.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  bmp.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo procesar la imagen.'))),
    png ? 'image/png' : 'image/jpeg', png ? undefined : 0.85));
}
