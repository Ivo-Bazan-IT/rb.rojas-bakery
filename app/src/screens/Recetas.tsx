import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Button, Card, Cargando, ErrorMsg, Field, IconButton, StatusPill, Vacio } from '../components/ui';
import { useRecetas } from '../api/hooks';
import type { Receta } from '../api/tipos';
import { duracion, num, pesosDec } from '../lib/formato';
import { useModal } from '../components/Modal';
import { ConfirmarDuplicar, ModalIngrediente, ModalReceta } from '../modales/ModalReceta';

const ORDEN = ['bizcochos', 'rellenos', 'ganache', 'forrados', 'decoraciones'];
const PRES: Record<string, string> = { kg: 'kg', litro: 'L', unidad: 'u' };

function Detalle({ r, onEditar }: { r: Receta; onEditar: () => void }) {
  const navigate = useNavigate();
  const ing = useModal<number>();
  const dup = useModal();
  const usada = r.usadaEn.length === 0 ? 'Todavía no se usa en productos'
    : `Usada en ${r.usadaEn.length} producto${r.usadaEn.length > 1 ? 's' : ''} · ${r.usadaEn.map((u) => u.nombre).join(', ')}`;
  const stats = [
    { l: 'Costo de la receta', v: pesosDec(r.costo), monto: true },
    { l: 'Rinde', v: r.rendimiento ? `${num(r.rendimiento)} u` : r.escala === 'ninguna' ? '1 receta' : 'Torta de 20 cm' },
    { l: 'Trabajo', v: duracion(r.trabajoMin) },
    { l: 'Horno', v: r.hornoMin ? duracion(r.hornoMin) : 'Sin horno' },
  ];
  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="fila" style={{ alignItems: 'flex-start' }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="receta-nombre">{r.nombre}</h1>
          <div className="fila" style={{ justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
            <StatusPill estado="marca">{r.categoriaLabel}</StatusPill>
            <span className="sec">{usada}</span>
          </div>
        </div>
        <div className="solo-desktop flex" style={{ gap: 10 }}>
          <Button variant="secondary" icon="copiar" onClick={() => dup.abrir()}>Duplicar</Button>
          <Button icon="lapiz" onClick={onEditar}>Editar</Button>
        </div>
        <span className="solo-mobile flex">
          <IconButton icon="copiar" label="Duplicar receta" onClick={() => dup.abrir()} />
          <IconButton icon="lapiz" label="Editar receta" onClick={onEditar} />
        </span>
      </div>
      <div className="grid-4 receta-stats">
        {stats.map((s) => (
          <div className="stat" key={s.l}>
            <div className="sec">{s.l}</div>
            <div className={`stat__valor${s.monto ? ' monto' : ''}`}>{s.v}</div>
          </div>
        ))}
      </div>
      <Card as="section">
        <div className="card__head">
          <h2>Ingredientes</h2>
          <Button variant="ghost" icon="sumar" onClick={() => ing.abrir()}><span className="solo-desktop">Agregar ingrediente</span><span className="solo-mobile">Agregar</span></Button>
        </div>
        {r.ingredientes.length === 0 ? <p className="sec">Esta receta todavía no tiene ingredientes.</p> : (
          <table className="tabla">
            <thead><tr><th>Ingrediente</th><th>Cantidad</th><th className="solo-desktop">Precio compra</th><th className="r">Costo</th></tr></thead>
            <tbody>
              {r.ingredientes.map((i) => (
                <tr key={i.id} className="fila-click" onClick={() => ing.abrir(i.id)} title="Cambiar cantidad o quitar">
                  <td className="b7">{i.nombre}{i.insumoArchivado && <span className="sec"> (archivado)</span>}</td>
                  <td>{num(i.cantidad, i.cantidad % 1 ? 1 : 0)} {i.unidad}</td>
                  <td className="solo-desktop sec" style={{ fontWeight: 400 }}>${num(i.precio / 100)} / {num(i.presentacion, i.presentacion % 1 ? 2 : 0)} {PRES[i.unidadCompra]}</td>
                  <td className="r strong">{pesosDec(i.costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="sec">Si cambia el precio de un insumo, el costo se recalcula solo.</p>
      </Card>
      {r.notas && <Card as="section"><h2>Notas</h2><p style={{ whiteSpace: 'pre-line' }}>{r.notas}</p></Card>}
      <ModalIngrediente abierto={ing.abierto} onCerrar={ing.cerrar} receta={r} ingredienteId={ing.item} />
      <ConfirmarDuplicar abierto={dup.abierto} onCerrar={dup.cerrar} receta={r} onCreada={(n) => navigate(`/recetas/${n.id}`)} />
    </div>
  );
}

export default function Recetas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recetas = useRecetas();
  const modal = useModal<Receta>();
  const [q, setQ] = useState('');
  const todas = recetas.data ?? [];
  const sel = todas.find((r) => r.id === Number(id)) ?? (id ? undefined : todas[0]);
  const grupos = ORDEN.map((cat) => ({
    cat, label: todas.find((r) => r.categoria === cat)?.categoriaLabel ?? cat,
    rs: todas.filter((r) => r.categoria === cat && r.nombre.toLowerCase().includes(q.toLowerCase())),
  })).filter((g) => g.rs.length);

  return (
    <>
      <MobileHeader title={id ? 'Receta' : 'Recetas base'} back={id ? '/recetas' : undefined} />
      <div className="page">
        <DesktopHeader title="Recetas base"><Button icon="sumar" onClick={() => modal.abrir()}>Nueva receta</Button></DesktopHeader>
        <ErrorMsg error={recetas.error} />
        {recetas.isPending ? <Cargando /> : todas.length === 0 ? (
          <Vacio titulo="Todavía no hay recetas base" accion={<Button variant="soft" icon="sumar" onClick={() => modal.abrir()}>Nueva receta</Button>}>
            Cada receta base (bizcochuelo, relleno, forrado…) se arma con insumos. Cargá primero los insumos.
          </Vacio>
        ) : (
          <div className={`split split--recetas${id ? ' split--detalle' : ''}`}>
            <Card className="split__lista recetas-lista">
              <Button icon="sumar" block className="solo-mobile" onClick={() => modal.abrir()}>Nueva receta</Button>
              <Field id="s8" label="Buscar" placeholder="Buscar receta" value={q} onChange={(e) => setQ(e.target.value)} />
              {grupos.map((g) => (
                <div key={g.cat} className="col" style={{ gap: 2 }}>
                  <div className="etiqueta" style={{ marginTop: 6 }}>{g.label}</div>
                  {g.rs.map((r) => (
                    <Link key={r.id} to={`/recetas/${r.id}`} className={`receta-link${sel?.id === r.id ? ' is-activo' : ''}`}
                      aria-current={sel?.id === r.id ? 'page' : undefined}>{r.nombre}</Link>
                  ))}
                </div>
              ))}
              {grupos.length === 0 && <p className="sec">No hay recetas con ese nombre.</p>}
            </Card>
            <div className="split__detalle">{sel ? <Detalle key={sel.id} r={sel} onEditar={() => modal.abrir(sel)} /> : <p className="sec">La receta no existe.</p>}</div>
          </div>
        )}
      </div>
      <ModalReceta abierto={modal.abierto} onCerrar={modal.cerrar} receta={modal.item}
        onGuardada={(r) => navigate(`/recetas/${r.id}`)} onEliminada={() => navigate('/recetas')} />
    </>
  );
}
