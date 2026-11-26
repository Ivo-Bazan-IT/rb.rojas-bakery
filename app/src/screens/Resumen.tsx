import { useState } from 'react';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Button, Card, Cargando, ErrorMsg, IconButton, ListItem, Stat } from '../components/ui';
import { useResumen } from '../api/hooks';
import { mesActual, moverMes, nombreMes, pesos } from '../lib/formato';

const COLORES: Record<string, string> = {
  ingredientes: 'var(--rb-cereza-700)', manoDeObra: 'var(--rb-malva)', gastosNegocio: 'var(--rb-grafico-3)', servicios: 'var(--rb-grafico-4)',
};
const miles = (c: number) => Math.round(c / 100 / 1000);

export default function Resumen() {
  const [mes, setMes] = useState(mesActual());
  const q = useResumen(mes);
  const R = q.data;
  const max = Math.max(1, ...(R?.semanas.map((s) => s.valor) ?? [1]));
  const nav = (
    <div className="fila mes-nav">
      <IconButton icon="izquierda" label="Mes anterior" onClick={() => setMes(moverMes(mes, -1))} />
      <span className="strong">{nombreMes(mes)}</span>
      <IconButton icon="derecha" label="Mes siguiente" onClick={() => setMes(moverMes(mes, 1))} />
    </div>
  );
  const stats = R ? [
    { label: 'Ventas', valor: pesos(R.ventas) }, { label: 'Ganancia', valor: pesos(R.ganancia) }, { label: 'Pedidos', valor: String(R.pedidos) },
    { label: 'Horas trabajadas', valor: `${R.horas} h` }, { label: 'Ticket promedio', valor: pesos(R.ticketPromedio) }, { label: 'Costo total', valor: pesos(R.costo) },
  ] : [];
  const sinDatos = R && R.pedidos === 0;

  return (
    <>
      <MobileHeader title="Resumen mensual" />
      <div className="page">
        <DesktopHeader title="Resumen mensual">{nav}</DesktopHeader>
        <div className="solo-mobile">{nav}</div>
        <ErrorMsg error={q.error} />
        {q.isPending && <Cargando />}
        {R && (
          <>
            {sinDatos && <p className="sec">No hay pedidos con entrega en {nombreMes(mes).toLowerCase()}. Los números se arman con los pedidos señados.</p>}
            <div className="resumen-stats">{stats.map((s) => <Stat key={s.label} label={s.label} value={s.valor} />)}</div>

            <div className="resumen-graficos">
              <Card as="section">
                <h2>Ventas por semana</h2>
                <div role="img" className="barras"
                  aria-label={`Ventas por semana: ${R.semanas.map((s) => `${s.label}, ${miles(s.valor)} mil`).join('; ')}`}>
                  {R.semanas.map((s) => (
                    <div className="barras__col" key={s.label}>
                      <span className="barras__valor">${miles(s.valor)} mil</span>
                      <span className="barras__barra" style={{ height: `${(s.valor / max) * 100}%` }} />
                    </div>
                  ))}
                </div>
                <div className="barras__ejes">{R.semanas.map((s) => <span key={s.label}>{s.label}</span>)}</div>
              </Card>
              <Card as="section">
                <h2>En qué se va el costo</h2>
                <div role="img" aria-label="Composición del costo" className="apilada">
                  {R.composicion.map((c) => <span key={c.clave} style={{ width: `${c.pct}%`, background: COLORES[c.clave] }} />)}
                </div>
                <div className="col" style={{ gap: 6 }}>
                  {R.composicion.map((c) => (
                    <div className="leyenda" key={c.clave}>
                      <span className="leyenda__color" style={{ background: COLORES[c.clave] }} />
                      <span className="grow b6">{c.label}</span>
                      <span className="strong">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="resumen-dos">
              <Card as="section">
                <h2>Más vendidos</h2>
                {R.masVendidos.length === 0 ? <p className="sec">Sin ventas este mes.</p> : (
                  <div className="lista">
                    {R.masVendidos.map((m) => <ListItem key={m.nombre} icon="torta" title={m.nombre} detail={`${m.pedidos} pedido${m.pedidos > 1 ? 's' : ''}`} value={pesos(m.monto)} />)}
                  </div>
                )}
              </Card>
              <Card as="section" className="solo-desktop flex">
                <h2>Horas del mes</h2>
                {R.horasLaborales ? (
                  <>
                    <p>Cargaste {R.horas} h de trabajo en pedidos. Con {R.horasLaborales} h configuradas{R.horas < R.horasLaborales ? ', los gastos del negocio no se cubren del todo' : ''}.</p>
                    <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={R.horasLaborales} aria-valuenow={R.horas} aria-label="Horas trabajadas">
                      <span style={{ width: `${Math.min(100, (R.horas / R.horasLaborales) * 100)}%` }} />
                    </div>
                    <div className="fila sec" style={{ fontSize: 12 }}><span>{R.horas} h trabajadas</span><span>{R.horasLaborales} h configuradas</span></div>
                  </>
                ) : <p>Todavía no cargaste las horas laborales del mes.</p>}
                <Button variant="soft" block to="/costos">Ajustar horas del mes</Button>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
