/* Decisiones sobre un presupuesto que no es pedido: cancelarlo (queda en el historial) o eliminarlo. */
import { Confirmar, avisar } from '../components/Modal';
import { useAccionPresupuesto, useBorrarPresupuesto } from '../api/hooks';
import type { Presupuesto } from '../api/tipos';

interface Props { abierto: boolean; onCerrar: () => void; p?: Presupuesto; onListo?: () => void }
const de = (p?: Presupuesto) => (p?.clienteNombre ? ` de ${p.clienteNombre}` : '');

export function ConfirmarCancelar({ abierto, onCerrar, p, onListo }: Props) {
  const cancelar = useAccionPresupuesto('cancelar');
  return (
    <Confirmar abierto={abierto} onCerrar={onCerrar} titulo="¿Cancelar este presupuesto?" accion="Sí, cancelar" icono="cerrar"
      onConfirmar={async () => { await cancelar.mutateAsync(p!.id); avisar(`Presupuesto #${p!.numeroLabel} cancelado`); onListo?.(); }}>
      <p>El presupuesto <strong>#{p?.numeroLabel}</strong>{de(p)} queda como <strong>cancelado</strong>: el cliente no siguió.</p>
      <p className="sec">Se guarda en el historial (filtro «Cancelados»). Si el cliente vuelve, lo podés reactivar con los mismos precios.</p>
    </Confirmar>
  );
}

export function ConfirmarEliminar({ abierto, onCerrar, p, onListo }: Props) {
  const borrar = useBorrarPresupuesto();
  const borrador = p?.estado === 'borrador';
  return (
    <Confirmar abierto={abierto} onCerrar={onCerrar} titulo={borrador ? '¿Eliminar este borrador?' : '¿Eliminar este presupuesto?'} accion="Eliminar"
      onConfirmar={async () => { await borrar.mutateAsync(p!.id); avisar(`Presupuesto #${p!.numeroLabel} eliminado`); onListo?.(); }}>
      <p>Se borra el presupuesto <strong>#{p?.numeroLabel}</strong>{de(p)}. No se puede deshacer.</p>
      {!borrador && <p className="sec">Si preferís conservarlo en el historial, cancelalo en lugar de eliminarlo.</p>}
    </Confirmar>
  );
}
