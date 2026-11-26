/* Foto de un registro: miniatura, subir o cambiar (desde la cámara o la galería), ver en grande y quitar. */
import { useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Button, ErrorMsg } from './ui';
import { Confirmar, Modal, avisar, useModal } from './Modal';
import { useFoto, type RecursoFoto } from '../api/hooks';
import { achicarFoto, type OpcionesImagen } from '../lib/imagen';

export function CampoFoto({ recurso, id, url, alt, clase, icono = 'imagen', ayuda, bloqueada, prepararId, onSubida, opciones, textoSubir = 'Subir foto', textoCambiar = 'Cambiar foto' }: {
  recurso: RecursoFoto; id?: number; url: string | null | undefined; alt: string;
  /** Clase de la miniatura (tamaño y forma). */
  clase: string; icono?: IconName; ayuda?: string;
  /** Solo mostrar (por ejemplo, un presupuesto ya enviado). */
  bloqueada?: boolean;
  /** Si el registro todavía no existe, lo guarda y devuelve su id. */
  prepararId?: () => Promise<number>;
  onSubida?: (id: number) => void;
  opciones?: OpcionesImagen; textoSubir?: string; textoCambiar?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const foto = useFoto(recurso);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const ver = useModal();
  const quitar = useModal();
  const ocupado = procesando || foto.isPending;
  // "foto del insumo" (femenino) o "logo" (masculino), para los textos.
  const esFoto = alt.startsWith('foto');
  const Nombre = esFoto ? 'Foto' : alt.charAt(0).toUpperCase() + alt.slice(1);
  const fin = (f: string, m: string) => (esFoto ? f : m);

  const elegir = async (archivo?: File) => {
    if (!archivo) return;
    setError(null); setProcesando(true);
    try {
      const chica = await achicarFoto(archivo, opciones);
      const destino = id ?? (await prepararId?.());
      if (!destino) throw new Error('Guardá primero para poder subir la foto.');
      await foto.mutateAsync({ id: destino, archivo: chica });
      avisar(`${Nombre} ${url ? fin('cambiada', 'cambiado') : fin('subida', 'subido')}`);
      onSubida?.(destino);
    } catch (e) { setError(e); } finally { setProcesando(false); if (input.current) input.current.value = ''; }
  };

  const miniatura = url
    ? <button type="button" className={`${clase} foto-mini`} onClick={() => ver.abrir()} aria-label={`Ver ${alt} en grande`}>
      <img src={url} alt="" key={url} />
    </button>
    : <div role="img" aria-label={`Sin ${alt}`} className={clase}><Icon name={icono} size={26} /></div>;

  return (
    <div className="campo-foto">
      <div className={`campo-foto__fila${ocupado ? ' is-subiendo' : ''}`}>
        {miniatura}
        <div className="col" style={{ gap: 6, flex: 1 }}>
          {bloqueada ? <span className="sec">{url ? 'Tocá la foto para verla en grande.' : 'Sin foto.'}</span> : (
            <>
              <div className="fila" style={{ justifyContent: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                <Button variant="secondary" icon="camara" disabled={ocupado} onClick={() => input.current?.click()}>
                  {ocupado ? 'Subiendo…' : url ? textoCambiar : textoSubir}
                </Button>
                {url && <Button variant="ghost" icon="basura" disabled={ocupado} onClick={() => quitar.abrir()}>Quitar</Button>}
              </div>
              <span className="sec" style={{ fontSize: 12 }}>{ayuda ?? 'Desde la cámara o la galería. Se achica sola antes de subirla.'}</span>
            </>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => elegir(e.target.files?.[0])} />
      <ErrorMsg error={error} />

      <Modal abierto={ver.abierto} onCerrar={ver.cerrar} titulo={alt.charAt(0).toUpperCase() + alt.slice(1)} tamano="grande">
        {url && <img src={url} alt={alt} className="foto-grande" />}
      </Modal>
      <Confirmar abierto={quitar.abierto} onCerrar={quitar.cerrar} titulo={`¿Quitar ${fin('la foto', `el ${alt}`)}?`} accion="Quitar" icono="imagen"
        onConfirmar={async () => { await foto.mutateAsync({ id: id! }); avisar(`${Nombre} ${fin('quitada', 'quitado')}`); }}>
        <p>Se saca {fin('la', 'el')} {alt}. Podés subir {fin('otra', 'otro')} cuando quieras.</p>
      </Confirmar>
    </div>
  );
}
