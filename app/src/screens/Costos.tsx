import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Avisos, Button, Card, ErrorMsg, Field, ListItem, Segmented, StatusPill } from '../components/ui';
import { avisar, useModal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { useConfiguracion, useContexto, useEnvios, useEquipos, useExtras, useGastos, useGuardarConfiguracion, useNegocio } from '../api/hooks';
import type { Configuracion, Equipo, Extra, Gasto, ZonaEnvio } from '../api/tipos';
import { leerNumero, leerPesos, nombreMes, mesActual, num, pesos } from '../lib/formato';
import { ModalEquipo, ModalExtra, ModalGasto, ModalNegocio, ModalZona } from '../modales/ModalesCostos';

type Tab = 'gastos' | 'equipos' | 'tarifarios' | 'ajustes';
const TABS: { value: Tab; label: string }[] = [
  { value: 'gastos', label: 'Gastos' }, { value: 'equipos', label: 'Equipos' }, { value: 'tarifarios', label: 'Tarifarios' }, { value: 'ajustes', label: 'Ajustes' },
];
const Vacia = ({ children }: { children: string }) => <p className="sec" style={{ margin: '8px 0' }}>{children}</p>;

/** Acciones que abren los modales; las secciones las reciben por props. */
interface Abrir {
  gasto: (g?: Gasto | { tipo: Gasto['tipo'] }) => void; equipo: (e?: Equipo) => void; extra: (e?: Extra) => void; zona: (z?: ZonaEnvio) => void;
}

function Compartidos({ abrir }: { abrir: Abrir }) {
  const gastos = useGastos();
  const { data: ctx } = useContexto();
  const { data: cfg } = useConfiguracion();
  const lista = (gastos.data ?? []).filter((g) => g.tipo === 'compartido');
  return (
    <Card as="section">
      <div className="card__head"><h2>Compartidos con la casa</h2><StatusPill estado="marca">÷ {cfg?.horasMesServicios ?? 720} h</StatusPill></div>
      {lista.length === 0 ? <Vacia>Cargá luz, gas, agua e internet con su factor de intensidad.</Vacia> : (
        <div className="lista">
          {lista.map((s) => (
            <ListItem key={s.id} icon={s.usaHoras === 'horno' ? 'fuego' : 'ajustes'} title={s.nombre} onClick={() => abrir.gasto(s)}
              detail={`Factor × ${num(s.factor, 2)} · ${s.usaHoras === 'horno' ? 'Horas de horno' : 'Horas de trabajo'}`}
              value={<><span style={{ display: 'block' }}>{pesos(s.monto)}</span><span className="sec" style={{ display: 'block' }}>por mes</span></>} chevron />
          ))}
        </div>
      )}
      <Button variant="ghost" icon="sumar" onClick={() => abrir.gasto({ tipo: 'compartido' })}>Agregar servicio</Button>
      <div className="total-caja strong">
        <div className="fila"><span>Por hora de trabajo</span><span className="tab">{pesos(ctx?.serviciosPorHoraTrabajo ?? 0)}</span></div>
        <div className="fila"><span>Gas por hora de horno</span><span className="tab">{pesos(ctx?.serviciosPorHoraHorno ?? 0)}</span></div>
      </div>
    </Card>
  );
}

function Exclusivos({ abrir }: { abrir: Abrir }) {
  const gastos = useGastos();
  const { data: ctx } = useContexto();
  const { data: cfg } = useConfiguracion();
  const lista = (gastos.data ?? []).filter((g) => g.tipo === 'exclusivo');
  return (
    <Card as="section">
      <div className="card__head"><h2>Exclusivos del negocio</h2><StatusPill estado={cfg?.horasLaborales ? 'marca' : 'alerta'}>{cfg?.horasLaborales ? `÷ ${cfg.horasLaborales} h laborales` : 'Sin horas laborales'}</StatusPill></div>
      <div className="lista">
        {lista.map((g) => <ListItem key={g.id} icon="presupuesto" title={g.nombre} detail={g.detalle || 'Mensual'} value={pesos(g.monto)} chevron onClick={() => abrir.gasto(g)} />)}
        <ListItem icon="presupuesto" title="Amortización de equipos" detail="Calculado desde Equipos" value={pesos(ctx?.amortizacion ?? 0)} />
      </div>
      {lista.length === 0 && <Vacia>Cargá monotributo, contador, publicidad y otros gastos del negocio.</Vacia>}
      <Button variant="ghost" icon="sumar" onClick={() => abrir.gasto({ tipo: 'exclusivo' })}>Agregar gasto del negocio</Button>
      <div className="total-caja strong">
        <div className="fila"><span>Por hora de trabajo</span><span className="tab">{cfg?.horasLaborales ? pesos(ctx?.gastosPorHora ?? 0) : '—'}</span></div>
      </div>
    </Card>
  );
}

function Equipos({ abrir }: { abrir: Abrir }) {
  const equipos = useEquipos();
  const { data: ctx } = useContexto();
  const lista = equipos.data ?? [];
  return (
    <Card as="section">
      <div className="card__head"><h2>Equipos</h2><span className="sec">Valor ÷ vida útil</span></div>
      {lista.length === 0 ? <Vacia>Cargá horno, batidora, heladera y demás equipos con su valor y vida útil.</Vacia> : (
        <div className="lista">
          {lista.map((e) => <ListItem key={e.id} icon="insumo" title={e.nombre} detail={`${num(e.vidaUtilAnios)} años · ${pesos(e.amortizacionMensual)} por mes`} value={pesos(e.valor)} chevron onClick={() => abrir.equipo(e)} />)}
        </div>
      )}
      <Button variant="ghost" icon="sumar" onClick={() => abrir.equipo()}>Agregar equipo</Button>
      <div className="total-caja strong"><div className="fila"><span>Amortización mensual</span><span className="tab">{pesos(ctx?.amortizacion ?? 0)}</span></div></div>
    </Card>
  );
}

function Tarifarios({ abrir }: { abrir: Abrir }) {
  const extras = useExtras();
  const envios = useEnvios();
  return (
    <div className="costos-dos">
      <Card as="section">
        <div className="card__head"><h2>Extras</h2><span className="sec">Precio final</span></div>
        {extras.data?.length ? (
          <div className="lista">{extras.data.map((e) => <ListItem key={e.id} icon="torta" title={e.nombre} value={pesos(e.precio)} chevron onClick={() => abrir.extra(e)} />)}</div>
        ) : <Vacia>Cargá toppers, velas, muñecos y packaging.</Vacia>}
        <Button variant="ghost" icon="sumar" onClick={() => abrir.extra()}>Agregar extra</Button>
      </Card>
      <Card as="section">
        <div className="card__head"><h2>Envíos</h2><span className="sec">Precio final</span></div>
        <div className="lista">
          {(envios.data ?? []).map((e) => (
            <ListItem key={e.id} icon="enviar" title={e.esRetiro ? e.nombre : `Envío · ${e.nombre}`} onClick={() => abrir.zona(e)}
              value={e.precio == null ? <StatusPill estado="alerta">Sin precio</StatusPill> : pesos(e.precio)} chevron />
          ))}
        </div>
        <Button variant="ghost" icon="sumar" onClick={() => abrir.zona()}>Agregar zona</Button>
      </Card>
    </div>
  );
}

const aTexto = (c: Configuracion) => ({
  margen: num(c.margenPct), valorHora: c.valorHora == null ? '' : num(c.valorHora / 100), redondeo: num(c.redondeoTorta / 100),
  redondeoMesa: num(c.redondeoMesaDulce / 100), horas: c.horasLaborales == null ? '' : String(c.horasLaborales), sena: num(c.senaPct), aviso: String(c.avisoDias),
});

function Ajustes() {
  const cfg = useConfiguracion();
  const guardar = useGuardarConfiguracion();
  const [f, setF] = useState<ReturnType<typeof aTexto> | null>(null);
  useEffect(() => { if (cfg.data && !f) setF(aTexto(cfg.data)); }, [cfg.data, f]);
  if (!f) return <Card as="section"><h2>Ajustes de precio</h2><ErrorMsg error={cfg.error} /></Card>;
  // Si hay cambios sin guardar, se avisa (los ajustes no se guardan solos).
  const cambios = !!cfg.data && JSON.stringify(f) !== JSON.stringify(aTexto(cfg.data));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); guardar.reset(); };
  const enviar = () => guardar.mutate({
    margenPct: leerNumero(f.margen), valorHora: f.valorHora.trim() ? leerPesos(f.valorHora) : null,
    redondeoTorta: leerPesos(f.redondeo), redondeoMesaDulce: leerPesos(f.redondeoMesa),
    horasLaborales: f.horas.trim() ? Math.round(leerNumero(f.horas)) : null, senaPct: leerNumero(f.sena), avisoDias: Math.round(leerNumero(f.aviso)),
  }, { onSuccess: (c) => { setF(aTexto(c)); avisar('Ajustes guardados. El catálogo ya usa los valores nuevos'); } });

  return (
    <Card as="section">
      <h2>Ajustes de precio</h2>
      <div className="form-grid">
        <Field id="k1" label="Ganancia" suffix="%" value={f.margen} inputMode="decimal" onChange={set('margen')} />
        <Field id="k2" label="Valor hora" prefix="$" value={f.valorHora} placeholder="Sin cargar" inputMode="decimal" onChange={set('valorHora')}
          help="Tu mano de obra. En el presupuesto sale como «Mano de obra»." />
        <Field id="k3" label="Redondeo tortas y budines" prefix="$" value={f.redondeo} inputMode="numeric" onChange={set('redondeo')} />
        <Field id="k7" label="Redondeo mesa dulce (total)" prefix="$" value={f.redondeoMesa} inputMode="numeric" onChange={set('redondeoMesa')} />
        <Field id="k4" label="Horas laborales del mes" suffix="h" value={f.horas} placeholder="Sin cargar" inputMode="numeric" onChange={set('horas')}
          help="Horas (no días) que trabajás en la pastelería por mes. Ej.: 8 h × 20 días = 160 h. Se usa para repartir los gastos del negocio." />
        <Field id="k5" label="Seña" suffix="%" value={f.sena} inputMode="decimal" onChange={set('sena')} />
        <Field id="k6" label="Aviso de pedidos" suffix="días" value={f.aviso} inputMode="numeric" onChange={set('aviso')} />
      </div>
      <ErrorMsg error={guardar.error} />
      <div className="fila" style={{ justifyContent: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <Button onClick={enviar} disabled={guardar.isPending || !cambios}>{guardar.isPending ? 'Guardando…' : 'Guardar ajustes'}</Button>
        {cambios && <StatusPill estado="alerta">Tenés cambios sin guardar</StatusPill>}
      </div>
    </Card>
  );
}

/** Resumen de los datos que salen en el PDF, con acceso al modal de edición. */
export function DatosNegocio() {
  const { data: n, error } = useNegocio();
  const m = useModal();
  return (
    <Card as="section">
      <div className="card__head"><h2>Datos del negocio</h2><Button variant="soft" icon="lapiz" onClick={() => m.abrir()}>Editar</Button></div>
      <ErrorMsg error={error} />
      {n && (<>
        <div className="fila" style={{ justifyContent: 'flex-start', gap: 14 }}>
          {n.logoUrl
            ? <img src={n.logoUrl} alt="Logo del negocio" className="logo-mini" />
            : <div role="img" aria-label="Sin logo" className="logo-mini"><Icon name="torta" size={24} /></div>}
          <div><div className="b7">{n.nombre}</div><div className="sec">{n.logoUrl ? 'Logo propio' : 'Sin logo propio: se usa el de Rojas Bakery'}</div></div>
        </div>
        <div className="datos-grid">
          <div><div className="etiqueta">WhatsApp</div><div className="datos-grid__valor">{n.whatsapp || '—'}</div></div>
          <div><div className="etiqueta">Instagram</div><div className="datos-grid__valor">{n.instagram || '—'}</div></div>
          <div><div className="etiqueta">Alias</div><div className="datos-grid__valor">{n.alias || '—'}</div></div>
          <div><div className="etiqueta">Validez</div><div className="datos-grid__valor">{n.validezDias} días</div></div>
        </div>
      </>)}
      <p className="sec">Salen en cada presupuesto en PDF.</p>
      <ModalNegocio abierto={m.abierto} onCerrar={m.cerrar} />
    </Card>
  );
}

export default function Costos() {
  const [params, setParams] = useSearchParams();
  const inicial = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'gastos';
  const [tab, setTabState] = useState<Tab>(inicial);
  const setTab = (t: Tab) => { setTabState(t); setParams(t === 'gastos' ? {} : { tab: t }, { replace: true }); };
  const { data: ctx } = useContexto();
  const sub = `${nombreMes(mesActual())} · actualizá los montos cada mes`;

  const gasto = useModal<Gasto | { tipo: Gasto['tipo'] }>();
  const equipo = useModal<Equipo>();
  const extra = useModal<Extra>();
  const zona = useModal<ZonaEnvio>();
  const abrir: Abrir = { gasto: gasto.abrir, equipo: equipo.abrir, extra: extra.abrir, zona: zona.abrir };
  const gastoActual = gasto.item && 'id' in gasto.item ? gasto.item : undefined;

  return (
    <>
      <MobileHeader title="Costos y ajustes" />
      <div className="page">
        <DesktopHeader title="Costos y ajustes" sub={sub}><Button icon="sumar" onClick={() => gasto.abrir()}>Agregar gasto</Button></DesktopHeader>
        <Avisos avisos={ctx?.avisos} />
        <Segmented<Tab> label="Sección" className="costos-tabs" value={tab} onChange={setTab} options={TABS} />

        {/* Mobile: una sección por vez */}
        <div className="solo-mobile col" style={{ gap: 16 }}>
          {tab === 'gastos' && <><p className="sec">{sub}.</p><Compartidos abrir={abrir} /><Exclusivos abrir={abrir} /></>}
          {tab === 'equipos' && <Equipos abrir={abrir} />}
          {tab === 'tarifarios' && <Tarifarios abrir={abrir} />}
          {tab === 'ajustes' && <><Ajustes /><DatosNegocio /></>}
        </div>

        {/* Desktop */}
        <div className="solo-desktop col" style={{ gap: 24 }}>
          {tab === 'gastos' && <><div className="costos-tres"><Compartidos abrir={abrir} /><Exclusivos abrir={abrir} /><Equipos abrir={abrir} /></div><Ajustes /></>}
          {tab === 'equipos' && <div className="costos-dos"><Equipos abrir={abrir} /></div>}
          {tab === 'tarifarios' && <Tarifarios abrir={abrir} />}
          {tab === 'ajustes' && <div className="costos-dos"><Ajustes /><DatosNegocio /></div>}
        </div>
      </div>

      <ModalGasto abierto={gasto.abierto} onCerrar={gasto.cerrar} gasto={gastoActual} tipo={gasto.item && !('id' in gasto.item) ? gasto.item.tipo : 'compartido'} />
      <ModalEquipo abierto={equipo.abierto} onCerrar={equipo.cerrar} equipo={equipo.item} />
      <ModalExtra abierto={extra.abierto} onCerrar={extra.cerrar} extra={extra.item} />
      <ModalZona abierto={zona.abierto} onCerrar={zona.cerrar} zona={zona.item} />
    </>
  );
}
