/* Campana de avisos: pedidos que se acercan o se pasaron, insumos con precio viejo y datos sin cargar. */
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Modal, useModal } from '../components/Modal';
import { useConfiguracion, useContexto, useEnvios, useInsumos, usePedidos } from '../api/hooks';
import { faltan } from '../lib/formato';

interface Aviso { clave: string; icono: IconName; titulo: string; detalle: string; ir: string }

function useAvisos(): Aviso[] {
  const { data: pedidos } = usePedidos();
  const { data: insumos } = useInsumos();
  const { data: ctx } = useContexto();
  const { data: envios } = useEnvios();
  const { data: cfg } = useConfiguracion();
  const dias = cfg?.avisoDias ?? 5;
  const out: Aviso[] = [];
  for (const p of pedidos ?? []) {
    const activo = p.estado === 'senado' || p.estado === 'realizado';
    if (activo && p.diasParaEntrega < 0) out.push({ clave: `p${p.id}`, icono: 'reloj', titulo: `Entrega pasada · ${p.producto}`, detalle: `${p.cliente} · ${faltan(p.diasParaEntrega)}. Actualizá el estado.`, ir: '/pedidos' });
    else if (p.estado === 'senado' && p.diasParaEntrega <= dias) out.push({ clave: `p${p.id}`, icono: 'pedidos', titulo: `${faltan(p.diasParaEntrega)} · ${p.producto}`, detalle: `${p.cliente}${p.horaEntrega ? ` · ${p.horaEntrega}` : ''}`, ir: '/pedidos/agenda' });
  }
  const viejos = (insumos ?? []).filter((i) => i.desactualizado && !i.archivado);
  if (viejos.length) out.push({ clave: 'ins', icono: 'insumo', titulo: `${viejos.length} insumo${viejos.length > 1 ? 's' : ''} con precio viejo`, detalle: viejos.slice(0, 3).map((i) => i.nombre).join(', ') + (viejos.length > 3 ? '…' : ''), ir: `/insumos/${viejos[0]!.id}` });
  const sinPrecio = (envios ?? []).filter((e) => e.precio == null && !e.esRetiro);
  if (sinPrecio.length) out.push({ clave: 'env', icono: 'enviar', titulo: `${sinPrecio.length} zona${sinPrecio.length > 1 ? 's' : ''} de envío sin precio`, detalle: sinPrecio.map((e) => e.nombre).join(', '), ir: '/costos?tab=tarifarios' });
  for (const a of ctx?.avisos ?? []) out.push({ clave: a, icono: 'ajustes', titulo: 'Falta un dato de costos', detalle: a, ir: '/costos?tab=ajustes' });
  return out;
}

export function Campana({ size = 22 }: { size?: number }) {
  const m = useModal();
  const avisos = useAvisos();
  const navigate = useNavigate();
  const ir = (to: string) => { m.cerrar(); setTimeout(() => navigate(to), 160); };
  return (
    <>
      <button type="button" className="btn btn--icono campana" aria-label={`Avisos${avisos.length ? ` (${avisos.length})` : ''}`} onClick={() => m.abrir()}>
        <Icon name="campana" size={size} />
        {avisos.length > 0 && <span className="campana__n">{avisos.length > 9 ? '9+' : avisos.length}</span>}
      </button>
      <Modal abierto={m.abierto} onCerrar={m.cerrar} tamano="chico" titulo="Avisos" sub={avisos.length ? 'Tocá un aviso para ir a resolverlo.' : undefined}>
        {avisos.length === 0 ? (
          <div className="confirmar">
            <span className="confirmar__icono"><Icon name="check" size={26} /></span>
            <div className="confirmar__texto"><p className="strong">Todo al día</p><p className="sec">No hay entregas cerca ni datos pendientes.</p></div>
          </div>
        ) : (
          <div className="col" style={{ gap: 2 }}>
            {avisos.map((a, i) => (
              <button key={a.clave} type="button" className="aviso-item" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} onClick={() => ir(a.ir)}>
                <span className="item__mini"><Icon name={a.icono} size={18} /></span>
                <span className="grow">
                  <span className="item__titulo" style={{ display: 'block' }}>{a.titulo}</span>
                  <span className="sec" style={{ display: 'block' }}>{a.detalle}</span>
                </span>
                <span className="item__chev"><Icon name="derecha" size={18} /></span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
