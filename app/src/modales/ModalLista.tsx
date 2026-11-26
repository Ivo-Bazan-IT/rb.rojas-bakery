/* Lista de compras: alta y edición (nombre, tipo e ítems). Los ítems pueden ser insumos o texto libre. */
import { useEffect, useState } from 'react';
import { Button, ErrorMsg, Field, IconButton, Segmented } from '../components/ui';
import { Modal, PieFormulario, avisar } from '../components/Modal';
import { useGuardarLista, useInsumos } from '../api/hooks';
import type { ListaCompra } from '../api/tipos';
import { leerNumero } from '../lib/formato';
import { SelectCaja, aTexto, nuevaClave } from './comun';

type Uso = 'g' | 'ml' | 'u';
type TipoLista = ListaCompra['tipo'];
interface Fila { key: number; insumoId: string; nombre: string; cantidad: string; unidad: Uso; comprado: boolean }
const OTRO = 'otro';
const fila = (d?: Partial<Fila>): Fila => ({ key: nuevaClave(), insumoId: '', nombre: '', cantidad: '', unidad: 'u', comprado: false, ...d });

export function ModalLista({ abierto, onCerrar, lista, tipo = 'personalizada', onGuardada }: {
  abierto: boolean; onCerrar: () => void; lista?: ListaCompra; tipo?: TipoLista; onGuardada?: (l: ListaCompra) => void;
}) {
  const ini = () => ({
    nombre: lista?.nombre ?? '', tipo: lista?.tipo ?? tipo,
    items: lista?.items.length
      ? lista.items.map((i) => fila({ insumoId: i.insumoId ? String(i.insumoId) : OTRO, nombre: i.nombre, cantidad: aTexto(i.cantidad), unidad: i.unidad as Uso, comprado: i.comprado }))
      : [fila()],
  });
  const [f, setF] = useState(ini);
  const insumos = useInsumos();
  const guardar = useGuardarLista();
  useEffect(() => { if (abierto) { setF(ini()); guardar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const todos = (insumos.data ?? []).filter((i) => !i.archivado);
  const setFila = (key: number, d: Partial<Fila>) => setF((x) => ({ ...x, items: x.items.map((i) => (i.key === key ? { ...i, ...d } : i)) }));
  const elegir = (key: number, v: string) => {
    const ins = todos.find((i) => String(i.id) === v);
    setFila(key, ins ? { insumoId: v, nombre: ins.nombre, unidad: ins.unidadUso } : { insumoId: v, nombre: '' });
  };

  const items = f.items.filter((i) => i.insumoId && (i.insumoId !== OTRO || i.nombre.trim())).map((i) => ({
    insumoId: i.insumoId === OTRO ? null : Number(i.insumoId), nombre: i.nombre.trim(), cantidad: leerNumero(i.cantidad), unidad: i.unidad, comprado: i.comprado,
  }));
  const enviar = () => guardar.mutate({ id: lista?.id, nombre: f.nombre.trim(), ...(lista ? {} : { tipo: f.tipo }), items },
    { onSuccess: (l) => { avisar(lista ? 'Lista guardada' : 'Lista creada'); onCerrar(); onGuardada?.(l); } });

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} titulo={lista ? 'Editar lista' : 'Nueva lista'}
      sub="Las cantidades van en gramos, mililitros o unidades, como en las recetas."
      pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!f.nombre.trim()} textoGuardar={lista ? 'Guardar' : 'Crear lista'} />}>
      <Field id="ml1" label="Nombre" value={f.nombre} placeholder="Ej.: Compra mensual" autoFocus onChange={(e) => setF({ ...f, nombre: e.target.value })} />
      {!lista && (
        <div className="field">
          <span className="field__label">Tipo</span>
          <Segmented<TipoLista> label="Tipo de lista" value={f.tipo} onChange={(t) => setF({ ...f, tipo: t })}
            options={[{ value: 'estandar', label: 'Estándar' }, { value: 'personalizada', label: 'Mía' }]} />
          <div className="field__ayuda">{f.tipo === 'estandar' ? 'La que repetís siempre (por ejemplo, la compra del mes).' : 'Una lista suelta para algo puntual.'}</div>
        </div>
      )}
      <div className="modal__seccion">
        <div className="modal__seccion-head">
          <div className="modal__seccion-titulo">Qué comprar</div>
          <Button variant="ghost" icon="sumar" onClick={() => setF({ ...f, items: [...f.items, fila()] })}>Agregar</Button>
        </div>
        <div className="editor-filas">
          {f.items.map((i) => (
            <div key={i.key} className="editor-fila">
              <SelectCaja label="Insumo" value={i.insumoId} onChange={(v) => elegir(i.key, v)}>
                <option value="">Elegí un insumo</option>
                {todos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                <option value={OTRO}>Otro (escribir)</option>
              </SelectCaja>
              <div className="field__box">
                <input aria-label="Cantidad" inputMode="decimal" placeholder="0" value={i.cantidad} onChange={(e) => setFila(i.key, { cantidad: e.target.value })} />
                {i.insumoId === OTRO
                  ? <select className="mini-select" aria-label="Unidad" value={i.unidad} onChange={(e) => setFila(i.key, { unidad: e.target.value as Uso })}>
                    <option value="g">g</option><option value="ml">ml</option><option value="u">u</option>
                  </select>
                  : <span className="field__afijo">{i.insumoId ? i.unidad : ''}</span>}
              </div>
              <IconButton icon="basura" label="Quitar" onClick={() => setF({ ...f, items: f.items.filter((x) => x.key !== i.key) })} />
              {i.insumoId === OTRO && (
                <div className="field__box editor-fila__extra">
                  <input aria-label="Qué comprar" placeholder="Ej.: Cajas para torta" value={i.nombre} autoFocus onChange={(e) => setFila(i.key, { nombre: e.target.value })} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <ErrorMsg error={guardar.error} />
    </Modal>
  );
}
