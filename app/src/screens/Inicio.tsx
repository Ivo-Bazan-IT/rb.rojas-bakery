import { Link } from 'react-router-dom';
import { Campana } from '../modales/Campana';
import { DesktopHeader } from '../components/Layout';
import { Button, Card, ListItem, Stat, StatusPill, Vacio } from '../components/ui';
import { Icon } from '../components/Icon';
import { useConfiguracion, useLogo, usePedidos, usePresupuestos, useResumen, useUsuario } from '../api/hooks';
import { aFecha, diaCorto, faltan, fechaLarga, mesActual, nombreMes, pesos } from '../lib/formato';
import logoMarca from '../design/assets/logo-rb-rojo.png';

export default function Inicio() {
  const logo = useLogo(logoMarca);
  const hoy = fechaLarga(new Date());
  const mes = mesActual();
  const { data: u } = useUsuario();
  const pedidos = usePedidos();
  const presupuestos = usePresupuestos();
  const resumen = useResumen(mes);
  const { data: cfg } = useConfiguracion();
  const aviso = cfg?.avisoDias ?? 5;

  const activos = (pedidos.data ?? []).filter((p) => p.estado !== 'enviado' && p.estado !== 'cancelado' && p.diasParaEntrega >= 0);
  const proximas = activos.slice(0, 4);
  const enAviso = activos.filter((p) => p.diasParaEntrega <= aviso);
  const sinRespuesta = (presupuestos.data ?? []).filter((p) => p.estadoVista === 'enviado');
  const r = resumen.data;
  const hola = `¡Hola${u ? `, ${u.nombre.split(' ')[0]}` : ''}!`;

  const stats = [
    { label: `Ventas de ${nombreMes(mes).split(' ')[0]!.toLowerCase()}`, valor: pesos(r?.ventas ?? 0) },
    { label: 'Ganancia', valor: pesos(r?.ganancia ?? 0) },
    { label: 'Pedidos', valor: String(r?.pedidos ?? 0) },
    { label: 'Horas trabajadas', valor: `${r?.horas ?? 0} h` },
  ].map((s) => <Stat key={s.label} label={s.label} value={s.valor} />);

  return (
    <>
      <header className="inicio-mhead solo-mobile">
        <img src={logo} alt="Rojas Bakery" />
        <div className="grow">
          <div className="inicio-mhead__fecha">{hoy}</div>
          <h1 className="inicio-mhead__hola">{hola}</h1>
        </div>
        <Campana size={24} />
      </header>
      <div className="page">
        <DesktopHeader title={hola} sub={hoy}>
          <Button icon="sumar" to="/presupuestos/nuevo">Nuevo presupuesto</Button>
        </DesktopHeader>

        {enAviso.length > 0 && (
          <div className="alerta" role="status">
            <Icon name="campana" size={22} />
            <div className="alerta__texto">
              <div className="strong">{enAviso.length === 1 ? '1 entrega' : `${enAviso.length} entregas`} en los próximos {aviso} días</div>
              <div className="sec">La primera es {faltan(enAviso[0]!.diasParaEntrega).toLowerCase()}{enAviso[0]!.horaEntrega && ` a las ${enAviso[0]!.horaEntrega}`}. Revisá la lista de compras.</div>
            </div>
          </div>
        )}

        <Button icon="sumar" to="/presupuestos/nuevo" block className="solo-mobile">Nuevo presupuesto</Button>
        <div className="grid-4 solo-desktop grid">{stats}</div>

        <div className="inicio-cols">
          <section className="col">
            <div className="fila">
              <h2 className="h-seccion">Próximas entregas</h2>
              <Link to="/pedidos/agenda" className="b7" style={{ fontSize: 14 }}>Ver agenda</Link>
            </div>
            {proximas.length === 0 ? (
              <Vacio titulo="No hay entregas próximas">Cuando conviertas un presupuesto en pedido, aparece acá.</Vacio>
            ) : (
              <Card className="lista-card">
                <div className="lista">
                  {proximas.map((p) => {
                    const d = aFecha(p.fechaEntrega);
                    return (
                      <Link to="/pedidos" className="item item--entrega" key={p.id}>
                        <span className="fecha-tile">
                          <span className="fecha-tile__dia">{diaCorto(d)}</span>
                          <span className="fecha-tile__num">{d.getDate()}/{d.getMonth() + 1}</span>
                        </span>
                        <span className="grow">
                          <span className="item__titulo" style={{ display: 'block' }}>{p.producto}</span>
                          <span className="sec" style={{ display: 'block' }}>{p.cliente}{p.horaEntrega && ` · ${p.horaEntrega}`} · {faltan(p.diasParaEntrega)}</span>
                        </span>
                        <StatusPill estado={p.estado} />
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}
          </section>

          <section className="col">
            <div className="fila" style={{ justifyContent: 'flex-start', gap: 8 }}>
              <h2 className="h-seccion">Presupuestos sin respuesta</h2>
              <StatusPill estado="marca">{sinRespuesta.length}</StatusPill>
            </div>
            {sinRespuesta.length === 0 ? (
              <Vacio titulo="No hay presupuestos esperando respuesta" />
            ) : (
              <Card className="lista-card">
                <div className="lista">
                  {sinRespuesta.slice(0, 5).map((p) => (
                    <ListItem key={p.id} icon="presupuesto" title={p.productoNombre || 'Sin producto'}
                      detail={`#${p.numeroLabel} · ${p.clienteNombre || 'Sin nombre'}`} value={pesos(p.total)} chevron to={`/presupuestos/${p.id}/pdf`} />
                  ))}
                </div>
              </Card>
            )}
            <Card className="solo-desktop flex compras-card">
              <ListItem icon="carrito" title="Lista de compras" detail="Generala desde los pedidos señados"
                extra={<Button variant="soft" to="/compras">Abrir</Button>} />
            </Card>
          </section>
        </div>

        <section className="col solo-mobile">
          <h2 className="h-seccion">Este mes</h2>
          <div className="grid-2">{stats}</div>
        </section>
      </div>
    </>
  );
}
