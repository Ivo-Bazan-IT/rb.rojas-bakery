/* Detalle de un pedido: estado, cliente, montos y edición de fecha, hora y notas. */
import { useEffect, useState } from 'react';
import { Button, Chip, ErrorMsg, Field, StatusPill, estadoLabel } from '../components/ui';
import { Area, Modal, avisar } from '../components/Modal';
import { Icon } from '../components/Icon';
import { useGuardarPedido, useMoverPedido, usePedidos } from '../api/hooks';
import { ESTADOS_KANBAN, type Pedido } from '../api/tipos';
import { faltan, fechaLarga, aFecha, pesos } from '../lib/formato';

/** Link de WhatsApp para un número argentino escrito de cualquier forma. */
export function linkWhatsapp(tel: string) {
  let d = tel.replace(/\D/g, '');
  if (d.length < 8) return null;
  if (!d.startsWith('54')) d = `549${d.replace(/^0/, '')}`;
  return `https://wa.me/${d}`;
}

export function ModalPedido({ abierto, onCerrar, pedido }: { abierto: boolean; onCerrar: () => void; pedido?: Pedido }) {
  const pedidos = usePedidos();
  const mover = useMoverPedido();
  const guardar = useGuardarPedido();
  // Siempre la versión más nueva de la lista (el estado cambia al instante).
  const p = pedidos.data?.find((x) => x.id === pedido?.id) ?? pedido;
  const ini = () => ({ fecha: p?.fechaEntrega ?? '', hora: p?.horaEntrega ?? '', notas: p?.notas ?? '' });
  const [f, setF] = useState(ini);
  useEffect(() => { if (abierto) { setF(ini()); guardar.reset(); mover.reset(); } }, [abierto, pedido?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;

  const cambiado = f.fecha !== p.fechaEntrega || f.hora !== p.horaEntrega || f.notas !== p.notas;
  const wa = linkWhatsapp(p.telefono);
  const enviar = () => {
    if (!cambiado) { onCerrar(); return; }
    guardar.mutate({ id: p.id, fechaEntrega: f.fecha, horaEntrega: f.hora, notas: f.notas },
      { onSuccess: () => { avisar('Pedido actualizado'); onCerrar(); } });
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} titulo={p.producto} sub={`#${p.numero} · ${fechaLarga(aFecha(p.fechaEntrega))} · ${faltan(p.diasParaEntrega)}`}
      pie={<>
        <Button variant="ghost" icon="presupuesto" className="modal__pie-izq" to={`/presupuestos/${p.presupuestoId}/pdf`}>Ver PDF</Button>
        <Button variant="secondary" onClick={onCerrar} disabled={guardar.isPending}>Cerrar</Button>
        <Button type="submit" disabled={guardar.isPending || !cambiado || !f.fecha}>{guardar.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </>}>
      <div className="field">
        <span className="field__label">Estado</span>
        <div className="chips chips--estado" role="group" aria-label="Estado del pedido">
          {ESTADOS_KANBAN.map((e) => (
            <Chip key={e} active={p.estado === e} onClick={() => p.estado !== e && mover.mutate({ id: p.id, estado: e }, { onSuccess: () => avisar(`Pedido en ${estadoLabel(e)}`) })}>
              {p.estado === e && <Icon name="check" size={16} stroke={2.25} />}{estadoLabel(e)}
            </Chip>
          ))}
        </div>
        <ErrorMsg error={mover.error} />
      </div>

      <div className="datos-grid">
        <div><div className="etiqueta">Cliente</div><div className="datos-grid__valor">{p.cliente || 'Sin nombre'}</div></div>
        <div>
          <div className="etiqueta">WhatsApp</div>
          <div className="datos-grid__valor">{p.telefono
            ? (wa ? <a href={wa} target="_blank" rel="noreferrer">{p.telefono}</a> : p.telefono) : '—'}</div>
        </div>
        <div><div className="etiqueta">Entrega</div><div className="datos-grid__valor">{p.esRetiro ? 'Retira el cliente' : p.entrega ?? '—'}</div></div>
        {!p.esRetiro && <div><div className="etiqueta">Dirección</div><div className="datos-grid__valor">{p.direccion || '—'}</div></div>}
      </div>
      {p.detalle && <div><div className="etiqueta">Detalle del pedido</div><p>{p.detalle}</p></div>}

      <div className="total-caja">
        <div className="fila"><span className="strong">Total</span><span className="strong">{pesos(p.total)}</span></div>
        <div className="fila sec-14"><span>Seña</span><span>{pesos(p.sena)}</span></div>
        <div className="fila sec-14">
          <span>Saldo</span>
          {p.estado === 'pago' || p.estado === 'enviado' ? <StatusPill estado="pago">Pagado</StatusPill> : <span className="strong">{pesos(p.saldo)}</span>}
        </div>
      </div>

      <div className="modal__seccion">
        <div className="grid-2">
          <Field id="mpd1" label="Fecha de entrega" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
          <Field id="mpd2" label="Hora" type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} />
        </div>
        <Area id="mpd3" label="Notas" value={f.notas} placeholder="Ej.: avisar por WhatsApp antes de salir." onChange={(e) => setF({ ...f, notas: e.target.value })} />
      </div>
      <ErrorMsg error={guardar.error} />
    </Modal>
  );
}
