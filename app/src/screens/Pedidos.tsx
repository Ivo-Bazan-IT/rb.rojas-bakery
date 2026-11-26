import { useState, type DragEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Button, Cargando, Chip, ErrorMsg, IconButton, Segmented, StatusPill, Vacio, estadoLabel } from '../components/ui';
import { Icon } from '../components/Icon';
import { useMoverPedido, usePedidos } from '../api/hooks';
import { ESTADOS_KANBAN, type EstadoPedido, type Pedido } from '../api/tipos';
import { aISO, diaCorto, fechaCorta, fechaLarga, pesos } from '../lib/formato';
import { useModal } from '../components/Modal';
import { ModalPedido } from '../modales/ModalPedido';

/** Props para que un elemento no-botón se abra con clic, Enter o espacio. */
const abrible = (fn: () => void) => ({
  role: 'button', tabIndex: 0, onClick: fn,
  onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } },
});

type Vista = 'estados' | 'agenda';

function VistaSwitch({ vista }: { vista: Vista }) {
  const navigate = useNavigate();
  return (
    <Segmented<Vista> label="Vista de pedidos" className="pedidos-seg" value={vista}
      onChange={(v) => navigate(v === 'agenda' ? '/pedidos/agenda' : '/pedidos')}
      options={[{ value: 'estados', label: 'Estados' }, { value: 'agenda', label: 'Agenda' }]} />
  );
}

const nota = (p: Pedido) => (p.estado === 'cancelado' ? 'Cancelado' : p.estado === 'pago' || p.estado === 'enviado' ? 'Pagado' : `Saldo ${pesos(p.saldo)}`);
const dia = (p: Pedido) => (p.diasParaEntrega === 0 ? 'Hoy' : fechaCorta(p.fechaEntrega));

function Tarjeta({ p, draggable, onAbrir }: { p: Pedido; draggable?: boolean; onAbrir: () => void }) {
  const onDrag = (e: DragEvent) => e.dataTransfer.setData('text/plain', String(p.id));
  const proximo = p.estado === 'senado' && p.diasParaEntrega >= 0 && p.diasParaEntrega <= 5;
  return (
    <article className="kcard" draggable={draggable} onDragStart={onDrag} aria-label={`${p.producto}, ${p.cliente}, ${estadoLabel(p.estado)}. Abrir detalle`} {...abrible(onAbrir)}>
      <div className="kcard__titulo">{p.producto}</div>
      <div className="sec">{p.cliente} · #{p.numero}</div>
      <div className="kcard__hora"><Icon name="reloj" size={16} />{dia(p)}{p.horaEntrega && ` · ${p.horaEntrega}`}</div>
      <div className="fila">
        <span className="kcard__nota">{nota(p)}</span>
        {proximo && <StatusPill estado="alerta">Próximo</StatusPill>}
      </div>
    </article>
  );
}

export function PedidosEstados() {
  const pedidos = usePedidos();
  const mover = useMoverPedido();
  const [sel, setSel] = useState<EstadoPedido>('senado');
  const [sobre, setSobre] = useState<EstadoPedido | null>(null);
  const detalle = useModal<Pedido>();
  const todos = pedidos.data ?? [];
  const deEstado = (e: EstadoPedido) => todos.filter((p) => p.estado === e);
  const lista = deEstado(sel);
  const sig = ESTADOS_KANBAN[Math.min(ESTADOS_KANBAN.indexOf(sel) + 1, 3)]!;
  const activos = todos.filter((p) => p.estado !== 'enviado' && p.estado !== 'cancelado').length;

  return (
    <>
      <MobileHeader title="Pedidos" />
      <div className="page">
        <DesktopHeader title="Pedidos" sub={`${activos} pedidos activos · los presupuestos sin seña están en Presupuestos`} />
        <div className="pedidos-barra">
          <VistaSwitch vista="estados" />
          <span className="sec solo-desktop">Arrastrá las tarjetas entre columnas para cambiar el estado.</span>
        </div>
        <ErrorMsg error={pedidos.error ?? mover.error} />
        {pedidos.isPending && <Cargando />}
        {pedidos.data && todos.length === 0 && (
          <Vacio titulo="Todavía no hay pedidos" accion={<Button variant="soft" to="/presupuestos">Ir a presupuestos</Button>}>
            Un pedido se crea cuando convertís un presupuesto señado.
          </Vacio>
        )}

        {/* Mobile: un estado por vez */}
        {todos.length > 0 && (
          <div className="solo-mobile col">
            <div className="chips chips--scroll" role="group" aria-label="Estado">
              {ESTADOS_KANBAN.map((e) => <Chip key={e} active={sel === e} onClick={() => setSel(e)}>{estadoLabel(e)} · {deEstado(e).length}</Chip>)}
            </div>
            {lista.map((p) => (
              <div key={p.id} className="col" style={{ gap: 6 }}>
                <Tarjeta p={p} onAbrir={() => detalle.abrir(p)} />
                {sel !== 'enviado' && sel !== 'cancelado' && (
                  <Button variant="soft" icon="derecha" block disabled={mover.isPending} onClick={() => mover.mutate({ id: p.id, estado: sig })}>
                    Avanzar a {estadoLabel(sig)}
                  </Button>
                )}
              </div>
            ))}
            {lista.length === 0 && <p className="sec">No hay pedidos en este estado.</p>}
          </div>
        )}

        {/* Desktop: kanban de 5 columnas */}
        {todos.length > 0 && (
          <div className="kanban solo-desktop grid">
            {ESTADOS_KANBAN.map((e) => (
              <section key={e} className={`kcol${sobre === e ? ' is-sobre' : ''}`} aria-label={estadoLabel(e)}
                onDragOver={(ev) => { ev.preventDefault(); setSobre(e); }}
                onDragLeave={() => setSobre(null)}
                onDrop={(ev) => {
                  ev.preventDefault(); setSobre(null);
                  const id = Number(ev.dataTransfer.getData('text/plain'));
                  if (id && todos.find((p) => p.id === id)?.estado !== e) mover.mutate({ id, estado: e });
                }}>
                <div className="fila kcol__head"><StatusPill estado={e} /><span className="kcol__n">{deEstado(e).length}</span></div>
                {deEstado(e).map((p) => <Tarjeta key={p.id} p={p} draggable onAbrir={() => detalle.abrir(p)} />)}
              </section>
            ))}
          </div>
        )}
      </div>
      <ModalPedido abierto={detalle.abierto} onCerrar={detalle.cerrar} pedido={detalle.item} />
    </>
  );
}

/** Lunes de la semana de una fecha. */
function lunes(d: Date) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function PedidosAgenda() {
  const pedidos = usePedidos();
  const [semana, setSemana] = useState(0);
  const detalle = useModal<Pedido>();
  const hoy = aISO(new Date());
  const inicio = lunes(new Date());
  inicio.setDate(inicio.getDate() + semana * 7);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(inicio); d.setDate(d.getDate() + i); return d; });
  const hoyIdx = dias.findIndex((d) => aISO(d) === hoy);
  const [dia, setDia] = useState(Math.max(0, hoyIdx));
  const delDia = (d: Date) => (pedidos.data ?? []).filter((p) => p.fechaEntrega === aISO(d));
  const fin = dias[6]!;
  const rango = `${inicio.getDate()} ${MESES_CORTO[inicio.getMonth()]} – ${fin.getDate()} ${MESES_CORTO[fin.getMonth()]}`;

  const navSemana = (
    <div className="fila agenda-semana">
      <IconButton icon="izquierda" label="Semana anterior" onClick={() => { setSemana(semana - 1); setDia(0); }} />
      <button type="button" className="strong link-fila" onClick={() => { setSemana(0); setDia((new Date().getDay() + 6) % 7); }} title="Volver a esta semana">{rango}</button>
      <IconButton icon="derecha" label="Semana siguiente" onClick={() => { setSemana(semana + 1); setDia(0); }} />
    </div>
  );

  return (
    <>
      <MobileHeader title="Pedidos" />
      <div className="page">
        <DesktopHeader title="Pedidos" />
        <div className="pedidos-barra">
          <VistaSwitch vista="agenda" />
          <div className="solo-desktop flex grow" style={{ justifyContent: 'flex-end' }}>{navSemana}</div>
        </div>
        <ErrorMsg error={pedidos.error} />

        {/* Mobile */}
        <div className="solo-mobile col">
          {navSemana}
          <div className="agenda-dias" role="group" aria-label="Día">
            {dias.map((d, i) => (
              <button key={i} type="button" aria-pressed={dia === i}
                className={`agenda-dia${dia === i ? ' is-activo' : ''}${i === hoyIdx ? ' is-hoy' : ''}`} onClick={() => setDia(i)}>
                <span className="agenda-dia__corto">{diaCorto(d)}</span>
                <span className="agenda-dia__num">{d.getDate()}</span>
                <span className="agenda-dia__punto" style={{ visibility: delDia(d).length ? 'visible' : 'hidden' }} />
              </button>
            ))}
          </div>
          {dias.every((d, i) => i < dia || !delDia(d).length) && <p className="sec">No hay entregas desde este día hasta el domingo.</p>}
          {dias.map((d, i) => (i >= dia && delDia(d).length > 0 ? (
            <div className="col" key={i} style={{ gap: 8 }}>
              <div className="etiqueta" style={{ fontSize: 13 }}>{fechaLarga(d)}</div>
              {delDia(d).map((p) => (
                <div className="card agenda-item" key={p.id} {...abrible(() => detalle.abrir(p))}>
                  <span className="agenda-item__hora">{p.horaEntrega || '—'}</span>
                  <span className="grow">
                    <span className="item__titulo" style={{ display: 'block' }}>{p.producto}</span>
                    <span className="sec" style={{ display: 'block' }}>{p.cliente}{p.entrega && ` · ${p.entrega}`}</span>
                  </span>
                  <StatusPill estado={p.estado} />
                </div>
              ))}
            </div>
          ) : null))}
        </div>

        {/* Desktop: semana */}
        <div className="agenda solo-desktop grid">
          {dias.map((d, i) => (
            <div key={i} className="agenda__col">
              <div className={`agenda__cab${i === hoyIdx ? ' is-hoy' : ''}`}>
                <span className="agenda__corto">{diaCorto(d)}</span>
                <span className="agenda__num">{d.getDate()}</span>
              </div>
              <div className="agenda__cuerpo">
                {delDia(d).map((p) => (
                  <div key={p.id} className={`agenda__ev ev--${p.estado}`} {...abrible(() => detalle.abrir(p))}>
                    <div className="agenda__ev-hora">{p.horaEntrega || '—'} · {estadoLabel(p.estado)}</div>
                    <div className="agenda__ev-titulo">{p.producto}</div>
                    <div className="agenda__ev-cliente">{p.cliente}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ModalPedido abierto={detalle.abierto} onCerrar={detalle.cerrar} pedido={detalle.item} />
    </>
  );
}
