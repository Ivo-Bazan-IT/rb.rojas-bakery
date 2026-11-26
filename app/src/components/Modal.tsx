/* Modales: <dialog> nativo (foco atrapado, Esc, capa superior) con fondo difuminado y animación
   de entrada y salida. En el celular se abre como hoja desde abajo. También: confirmación de
   decisiones, avisos breves (toasts) y un textarea con el estilo de los campos. */
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { Button, ErrorMsg } from './ui';

type Tamano = 'chico' | 'medio' | 'grande';

export function Modal({ abierto, onCerrar, titulo, sub, children, pie, tamano = 'medio', onEnviar }: {
  abierto: boolean; onCerrar: () => void; titulo: ReactNode; sub?: ReactNode; children: ReactNode; pie?: ReactNode;
  tamano?: Tamano;
  /** Si está, el contenido es un formulario: Enter envía y los botones type="submit" lo disparan. */
  onEnviar?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [montado, setMontado] = useState(abierto);
  const [saliendo, setSaliendo] = useState(false);
  const presionado = useRef<EventTarget | null>(null);
  const idTitulo = useId();

  useEffect(() => {
    if (abierto) { setMontado(true); setSaliendo(false); }
    else if (montado) setSaliendo(true);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const d = ref.current;
    if (montado && d && !d.open) d.showModal();
  }, [montado]);

  const terminar = () => { ref.current?.close(); setMontado(false); setSaliendo(false); };
  // Respaldo por si la animación de salida no llega a disparar animationend.
  useEffect(() => {
    if (!saliendo) return;
    const t = setTimeout(terminar, 450);
    return () => clearTimeout(t);
  }, [saliendo]);

  if (!montado) return null;

  const contenido = (
    <>
      <header className="modal__head">
        <div className="grow">
          <h2 id={idTitulo} className="modal__titulo">{titulo}</h2>
          {sub && <p className="sec">{sub}</p>}
        </div>
        <button type="button" className="btn btn--icono modal__x" aria-label="Cerrar" onClick={onCerrar}><Icon name="cerrar" size={20} /></button>
      </header>
      <div className="modal__cuerpo">{children}</div>
      {pie && <footer className="modal__pie">{pie}</footer>}
    </>
  );
  const enviar = (e: FormEvent) => { e.preventDefault(); e.stopPropagation(); onEnviar?.(); };

  return createPortal(
    <dialog ref={ref} className={`modal modal--${tamano}${saliendo ? ' is-saliendo' : ''}`} aria-labelledby={idTitulo}
      onCancel={(e) => { e.preventDefault(); onCerrar(); }}
      onMouseDown={(e) => { presionado.current = e.target; }}
      onClick={(e) => { if (e.target === e.currentTarget && presionado.current === e.currentTarget) onCerrar(); }}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget && saliendo && e.animationName.startsWith('modal-salir')) terminar(); }}>
      {onEnviar
        ? <form className="modal__caja" onSubmit={enviar} noValidate>{contenido}</form>
        : <div className="modal__caja">{contenido}</div>}
    </dialog>,
    document.body,
  );
}

/** Estado de un modal que se abre con un ítem (o sin nada para "nuevo"). El ítem se conserva durante la salida. */
export function useModal<T = undefined>() {
  const [s, setS] = useState<{ abierto: boolean; item?: T }>({ abierto: false });
  return {
    abierto: s.abierto, item: s.item,
    abrir: (item?: T) => setS({ abierto: true, item }),
    cerrar: () => setS((x) => ({ ...x, abierto: false })),
  };
}

/** Pide confirmación antes de una decisión. Muestra el error si la acción falla y no se cierra. */
export function Confirmar({ abierto, onCerrar, titulo, children, accion, icono = 'basura', onConfirmar }: {
  abierto: boolean; onCerrar: () => void; titulo: string; children?: ReactNode; accion: string; icono?: IconName;
  onConfirmar: () => Promise<unknown> | unknown;
}) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (abierto) { setPendiente(false); setError(null); } }, [abierto]);
  const ok = async () => {
    setPendiente(true); setError(null);
    try { await onConfirmar(); onCerrar(); } catch (e) { setError(e); } finally { setPendiente(false); }
  };
  const cerrar = () => { if (!pendiente) onCerrar(); };
  return (
    <Modal abierto={abierto} onCerrar={cerrar} titulo={titulo} tamano="chico"
      pie={<>
        <Button variant="ghost" onClick={cerrar} disabled={pendiente}>Cancelar</Button>
        <Button onClick={ok} disabled={pendiente} autoFocus>{pendiente ? 'Un momento…' : accion}</Button>
      </>}>
      <div className="confirmar">
        <span className="confirmar__icono"><Icon name={icono} size={26} /></span>
        <div className="confirmar__texto">{children}</div>
      </div>
      <ErrorMsg error={error} />
    </Modal>
  );
}

/** Pie estándar de un formulario en modal: eliminar a la izquierda, cancelar y guardar a la derecha. */
export function PieFormulario({ onCancelar, guardando, puedeGuardar = true, textoGuardar = 'Guardar', onEliminar, textoEliminar = 'Eliminar' }: {
  onCancelar: () => void; guardando?: boolean; puedeGuardar?: boolean; textoGuardar?: string; onEliminar?: () => void; textoEliminar?: string;
}) {
  return (
    <>
      {onEliminar && <Button variant="ghost" icon="basura" className="modal__pie-izq" onClick={onEliminar} disabled={guardando}>{textoEliminar}</Button>}
      <Button variant="secondary" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
      <Button type="submit" disabled={guardando || !puedeGuardar}>{guardando ? 'Guardando…' : textoGuardar}</Button>
    </>
  );
}

export function Area({ id, label, help, ...rest }: { id: string; label: ReactNode; help?: ReactNode } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">{label}</label>
      <div className="field__box field__box--area"><textarea id={id} rows={3} {...rest} /></div>
      {help && <div className="field__ayuda">{help}</div>}
    </div>
  );
}

/* ---------- Avisos breves (toasts) ---------- */
interface Toast { id: number; texto: string; saliendo: boolean }
let toasts: Toast[] = [];
let siguiente = 1;
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((f) => f());
const cambiar = (fn: (t: Toast[]) => Toast[]) => { toasts = fn(toasts); emitir(); };

/** Muestra un aviso abajo por 2,5 segundos. */
export function avisar(texto: string) {
  const id = siguiente++;
  cambiar((t) => [...t.slice(-2), { id, texto, saliendo: false }]);
  setTimeout(() => cambiar((t) => t.map((x) => (x.id === id ? { ...x, saliendo: true } : x))), 2500);
  setTimeout(() => cambiar((t) => t.filter((x) => x.id !== id)), 2800);
}

export function Toasts() {
  const lista = useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f); }; }, () => toasts);
  return createPortal(
    <div className="toasts" role="status" aria-live="polite">
      {lista.map((t) => <div key={t.id} className={`toast${t.saliendo ? ' is-saliendo' : ''}`}><Icon name="check" size={18} stroke={2.25} />{t.texto}</div>)}
    </div>,
    document.body,
  );
}
