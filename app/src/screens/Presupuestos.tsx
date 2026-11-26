import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Button, Card, Cargando, Chip, ErrorMsg, Field, PillPresupuesto, Vacio } from '../components/ui';
import { useAccionPresupuesto, usePresupuestos } from '../api/hooks';
import { ConfirmarCancelar, ConfirmarEliminar } from '../modales/ConfirmarPresupuesto';
import { Confirmar, avisar, useModal } from '../components/Modal';
import type { EstadoPresupuesto, Presupuesto } from '../api/tipos';
import { fechaCorta, num, pesos } from '../lib/formato';

const FILTROS: { v: 'todos' | EstadoPresupuesto; l: string }[] = [
  { v: 'todos', l: 'Todos' }, { v: 'borrador', l: 'Borradores' }, { v: 'enviado', l: 'Sin respuesta' }, { v: 'convertido', l: 'Pedidos' }, { v: 'vencido', l: 'Vencidos' }, { v: 'cancelado', l: 'Cancelados' },
];

/* Presupuestos: borradores, enviados sin respuesta, convertidos en pedido, vencidos y cancelados. */
export default function Presupuestos() {
  const navigate = useNavigate();
  const lista = usePresupuestos();
  const convertir = useAccionPresupuesto('convertir');
  const [filtro, setFiltro] = useState<'todos' | EstadoPresupuesto>('todos');
  const [q, setQ] = useState('');
  const convertirM = useModal<Presupuesto>();
  const borrarM = useModal<Presupuesto>();
  const cancelarM = useModal<Presupuesto>();
  const reactivar = useAccionPresupuesto('reactivar');

  const ps = (lista.data ?? []).filter((p) => (filtro === 'todos' || p.estadoVista === filtro)
    && `${p.clienteNombre} ${p.productoNombre} ${p.numeroLabel}`.toLowerCase().includes(q.toLowerCase()));

  const fila = (p: Presupuesto) => (
    <div key={p.id} className="card card--item presu-fila">
      <button type="button" className="item" onClick={() => navigate(p.estado === 'borrador' ? `/presupuestos/${p.id}` : `/presupuestos/${p.id}/pdf`)}>
        <span className="grow">
          <span className="item__titulo ellipsis" style={{ display: 'block' }}>#{p.numeroLabel} · {p.productoNombre || 'Sin producto'}</span>
          <span className="sec" style={{ display: 'block' }}>
            {p.clienteNombre || 'Sin nombre'}{p.fechaEntrega && ` · entrega ${fechaCorta(p.fechaEntrega)}`}
          </span>
        </span>
        <span className="item__valor tab">{pesos(p.total)}</span>
        <PillPresupuesto estado={p.estadoVista} />
      </button>
      {p.estado !== 'convertido' && (
        <div className="presu-fila__acciones">
          <Button variant="ghost" to={`/presupuestos/${p.id}`}>{p.estado === 'borrador' ? 'Editar' : 'Ver'}</Button>
          <Button variant="ghost" icon="basura" onClick={() => borrarM.abrir(p)}>Eliminar</Button>
          {p.estado === 'enviado' && <Button variant="ghost" icon="cerrar" onClick={() => cancelarM.abrir(p)}>Cancelar</Button>}
          {p.estado === 'cancelado'
            ? <Button variant="soft" icon="volver" disabled={reactivar.isPending}
              onClick={() => reactivar.mutate(p.id, { onSuccess: () => avisar(`Presupuesto #${p.numeroLabel} reactivado`) })}>Reactivar</Button>
            : p.estadoVista !== 'vencido' && <Button variant="soft" icon="check" onClick={() => convertirM.abrir(p)}>Convertir en pedido</Button>}
        </div>
      )}
    </div>
  );

  return (
    <>
      <MobileHeader title="Presupuestos" />
      <div className="page">
        <DesktopHeader title="Presupuestos" sub="Los presupuestos sin seña quedan acá, aparte de los pedidos">
          <Button icon="sumar" to="/presupuestos/nuevo">Nuevo presupuesto</Button>
        </DesktopHeader>
        <Button icon="sumar" to="/presupuestos/nuevo" block className="solo-mobile">Nuevo presupuesto</Button>
        <Card>
          <div className="col" style={{ gap: 12 }}>
            <Field id="pq" label="Buscar" placeholder="Cliente, producto o número" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="chips chips--scroll" role="group" aria-label="Estado">
              {FILTROS.map((f) => <Chip key={f.v} active={filtro === f.v} onClick={() => setFiltro(f.v)}>{f.l}</Chip>)}
            </div>
          </div>
        </Card>
        <ErrorMsg error={lista.error ?? convertir.error ?? reactivar.error} />
        {lista.isPending ? <Cargando /> : ps.length === 0 ? (
          <Vacio titulo={lista.data?.length ? 'No hay presupuestos con ese filtro' : 'Todavía no hay presupuestos'}
            accion={!lista.data?.length && <Button variant="soft" to="/presupuestos/nuevo">Armar el primero</Button>} />
        ) : <div className="col" style={{ gap: 10 }}>{ps.map(fila)}</div>}
      </div>

      <Confirmar abierto={convertirM.abierto} onCerrar={convertirM.cerrar} titulo="¿El cliente ya señó?" accion="Sí, crear pedido" icono="check"
        onConfirmar={async () => { await convertir.mutateAsync(convertirM.item!.id); avisar('Pedido creado en Señado'); navigate('/pedidos'); }}>
        <p>El presupuesto <strong>#{convertirM.item?.numeroLabel}</strong> pasa a ser un pedido. Seña de {num(convertirM.item?.senaPct ?? 0)}%: <strong>{pesos(convertirM.item?.sena ?? 0)}</strong>.</p>
        <p className="sec">{convertirM.item?.estado === 'borrador'
          ? 'Todavía es un borrador: al convertirlo se congelan sus precios. Necesita fecha de entrega.'
          : 'Aparece en la columna Señado y en la agenda.'}</p>
      </Confirmar>
      <ConfirmarEliminar abierto={borrarM.abierto} onCerrar={borrarM.cerrar} p={borrarM.item} />
      <ConfirmarCancelar abierto={cancelarM.abierto} onCerrar={cancelarM.cerrar} p={cancelarM.item} />
    </>
  );
}
