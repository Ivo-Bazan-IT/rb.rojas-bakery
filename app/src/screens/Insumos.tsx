import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Button, Card, Cargando, Chip, ErrorMsg, Field, ListItem, Segmented, StatusPill, Vacio } from '../components/ui';
import { Icon } from '../components/Icon';
import { CampoFoto } from '../components/CampoFoto';
import { useBorrarInsumo, useGuardarInsumo, useInsumos } from '../api/hooks';
import { Confirmar, avisar, useModal } from '../components/Modal';
import type { Insumo, Unidad } from '../api/tipos';
import { leerNumero, leerPesos, num } from '../lib/formato';

const FILTROS: { v: 'todos' | Unidad; l: string }[] = [{ v: 'todos', l: 'Todos' }, { v: 'kg', l: 'Por kg' }, { v: 'litro', l: 'Por litro' }, { v: 'unidad', l: 'Por unidad' }];
const SUF: Record<Unidad, { pres: string; uso: string; nombre: string; factor: number }> = {
  kg: { pres: 'kg', uso: 'g', nombre: 'gramo', factor: 1000 }, litro: { pres: 'L', uso: 'ml', nombre: 'mililitro', factor: 1000 }, unidad: { pres: 'u', uso: 'u', nombre: 'unidad', factor: 1 },
};
const presentacion = (i: Insumo) => (i.unidad !== 'unidad' && i.presentacion < 1 ? `${num(i.presentacion * 1000)} ${SUF[i.unidad].uso}` : `${num(i.presentacion, i.presentacion % 1 ? 2 : 0)} ${SUF[i.unidad].pres}`);
const unitLabel = (i: Insumo) => `$${num(i.costoUnitario / 100, 2)} / ${i.unidadUso}`;
const presLabel = (i: Insumo) => `${presentacion(i)} · $${num(i.precio / 100)}`;
const actualizado = (i: Insumo) => (i.diasDesdeActualizacion === 0 ? 'Actualizado hoy' : `Actualizado hace ${i.diasDesdeActualizacion} día${i.diasDesdeActualizacion > 1 ? 's' : ''}`);
const thumb = (i?: Insumo) => (i?.fotoUrl
  ? <img src={i.fotoUrl} alt="" className="item__mini item__mini--grande" />
  : <span className="item__mini item__mini--grande"><Icon name="imagen" size={19} /></span>);

interface Form { nombre: string; unidad: Unidad; cantidad: string; precio: string; merma: string }
const aForm = (i?: Insumo): Form => (i
  ? { nombre: i.nombre, unidad: i.unidad, cantidad: String(i.presentacion).replace('.', ','), precio: num(i.precio / 100), merma: String(i.mermaPct) }
  : { nombre: '', unidad: 'kg', cantidad: '1', precio: '', merma: '0' });

/** Alta y edición de un insumo. Sin `insumo` crea uno nuevo. */
function Editor({ insumo, onGuardado, onEliminado }: { insumo?: Insumo; onGuardado?: (i: Insumo) => void; onEliminado?: () => void }) {
  const [f, setF] = useState<Form>(aForm(insumo));
  const guardar = useGuardarInsumo();
  const borrar = useBorrarInsumo();
  const confirmar = useModal();
  useEffect(() => { setF(aForm(insumo)); guardar.reset(); }, [insumo?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cantidad = leerNumero(f.cantidad);
  const precio = leerPesos(f.precio);
  const merma = Math.min(99, leerNumero(f.merma));
  const costo = cantidad > 0 ? precio / (cantidad * SUF[f.unidad].factor * (1 - merma / 100)) : 0;

  const enviar = () => guardar.mutate(
    { id: insumo?.id, nombre: f.nombre.trim(), unidad: f.unidad, presentacion: cantidad, precio, mermaPct: merma },
    { onSuccess: (i) => { avisar(insumo ? 'Insumo guardado. Los costos ya se recalcularon' : 'Insumo creado'); onGuardado?.(i); } },
  );

  return (
    <Card as="section" className="insumo-editor">
      <h2>{insumo ? 'Editar insumo' : 'Nuevo insumo'}</h2>
      {insumo
        ? <CampoFoto recurso="insumos" id={insumo.id} url={insumo.fotoUrl} alt="foto del insumo" clase="insumo-foto" />
        : <div className="fila" style={{ justifyContent: 'flex-start', gap: 14 }}>
          <div role="img" aria-label="Sin foto del insumo" className="insumo-foto"><Icon name="imagen" size={24} /></div>
          <span className="sec">Después de crearlo vas a poder sumarle una foto.</span>
        </div>}
      <Field id="e1" label="Nombre" value={f.nombre} placeholder="Ej.: Harina 0000" onChange={(e) => setF({ ...f, nombre: e.target.value })} />
      <div className="field">
        <span className="field__label">Se compra por</span>
        <Segmented<Unidad> label="Se compra por" value={f.unidad} onChange={(v) => setF({ ...f, unidad: v })}
          options={[{ value: 'kg', label: 'kg' }, { value: 'litro', label: 'Litro' }, { value: 'unidad', label: 'Unidad' }]} />
      </div>
      <div className="grid-2">
        <Field id="e2" label="Cantidad" suffix={SUF[f.unidad].pres} inputMode="decimal" value={f.cantidad}
          help={f.unidad !== 'unidad' ? 'Ej.: 0,2 para 200 g' : undefined} onChange={(e) => setF({ ...f, cantidad: e.target.value })} />
        <Field id="e3" label="Precio" prefix="$" inputMode="decimal" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} />
      </div>
      <Field id="e4" label="Merma" suffix="%" inputMode="numeric" value={f.merma} help="Opcional. Ej.: frutillas 15%."
        onChange={(e) => setF({ ...f, merma: e.target.value.replace(/[^\d,]/g, '') })} />
      <div className="total-caja fila"><span className="strong">Costo por {SUF[f.unidad].nombre}</span><span className="strong tab">${num(costo / 100, 2)}</span></div>
      {insumo?.desactualizado && <StatusPill estado="alerta">{actualizado(insumo)}: revisá el precio</StatusPill>}
      <ErrorMsg error={guardar.error} />
      <Button block onClick={enviar} disabled={guardar.isPending || !f.nombre.trim()}>{insumo ? 'Guardar cambios' : 'Crear insumo'}</Button>
      {insumo && <Button variant="ghost" icon="basura" block onClick={() => confirmar.abrir()}>Eliminar insumo</Button>}
      <Confirmar abierto={confirmar.abierto} onCerrar={confirmar.cerrar} titulo="¿Eliminar este insumo?" accion="Eliminar"
        onConfirmar={async () => {
          const r = await borrar.mutateAsync(insumo!.id);
          avisar(r.archivado ? 'Insumo archivado: lo usa alguna receta' : 'Insumo eliminado');
          onEliminado?.();
        }}>
        <p><strong>{insumo?.nombre}</strong> deja de aparecer en Insumos.</p>
        <p className="sec">Si lo usa alguna receta, se archiva en vez de borrarse y esas recetas siguen calculando su costo con el último precio.</p>
      </Confirmar>
    </Card>
  );
}

export default function Insumos() {
  const { id } = useParams();
  const navigate = useNavigate();
  const insumos = useInsumos();
  const [filtro, setFiltro] = useState<'todos' | Unidad>('todos');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<number | 'nuevo' | null>(null);
  const todos = insumos.data ?? [];
  const lista = todos.filter((i) => (filtro === 'todos' || i.unidad === filtro) && i.nombre.toLowerCase().includes(q.toLowerCase()));
  const nuevo = id === 'nuevo' || sel === 'nuevo';
  const actual = nuevo ? undefined : todos.find((i) => i.id === (id ? Number(id) : sel)) ?? (id ? undefined : todos[0]);

  const buscador = (
    <>
      <Field id="s9" label="Buscar" placeholder="Buscar insumo" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips" role="group" aria-label="Unidad de compra">
        {FILTROS.map((f) => <Chip key={f.v} active={filtro === f.v} onClick={() => setFiltro(f.v)}>{f.l}</Chip>)}
      </div>
    </>
  );
  const vacio = <Vacio titulo="Todavía no hay insumos">Cargá cada insumo con su presentación y su precio. Es la base de todos los costos.</Vacio>;

  return (
    <>
      <MobileHeader title={id ? (nuevo ? 'Nuevo insumo' : 'Insumo') : 'Insumos'} back={id ? '/insumos' : undefined} />
      <div className="page">
        <DesktopHeader title="Insumos"><Button icon="sumar" onClick={() => setSel('nuevo')}>Nuevo insumo</Button></DesktopHeader>
        <ErrorMsg error={insumos.error} />
        {insumos.isPending && <Cargando />}

        {/* Mobile */}
        {insumos.data && (
          <div className="solo-mobile col" style={{ gap: 16 }}>
            {id ? <Editor insumo={actual} onGuardado={(i) => { if (nuevo) navigate(`/insumos/${i.id}`, { replace: true }); }} onEliminado={() => navigate('/insumos')} /> : (
              <>
                <Button icon="sumar" block to="/insumos/nuevo">Nuevo insumo</Button>
                {todos.length === 0 ? vacio : (
                  <>
                    {buscador}
                    <Card className="card--lista">
                      <div className="lista">
                        {lista.map((i) => (
                          <ListItem key={i.id} thumb={thumb(i)} title={i.nombre} detail={`${presLabel(i)} · ${unitLabel(i)}`} chevron to={`/insumos/${i.id}`}
                            extra={i.desactualizado ? <StatusPill estado="alerta">Actualizar precio</StatusPill> : undefined} />
                        ))}
                      </div>
                    </Card>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Desktop */}
        {insumos.data && (
          <div className="insumos-dos solo-desktop grid">
            {todos.length === 0 ? vacio : (
              <Card>
                <div className="insumos-filtros">{buscador}</div>
                <table className="tabla tabla--insumos">
                  <thead><tr><th style={{ width: 56 }}><span className="sr-only">Foto</span></th><th>Insumo</th><th>Presentación</th><th>Costo unitario</th><th>Precio</th></tr></thead>
                  <tbody>
                    {lista.map((i) => (
                      <tr key={i.id} className={`fila-click${actual?.id === i.id ? ' is-sel' : ''}`} onClick={() => setSel(i.id)}>
                        <td>{thumb(i)}</td>
                        <td><button type="button" className="link-fila" onClick={() => setSel(i.id)}>{i.nombre}</button></td>
                        <td>{presLabel(i)}</td>
                        <td className="strong">{unitLabel(i)}</td>
                        <td>{i.desactualizado ? <StatusPill estado="alerta">Actualizar precio</StatusPill> : <span className="sec" style={{ fontSize: 12 }}>{actualizado(i)}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
            <Editor insumo={actual} onGuardado={(i) => setSel(i.id)} onEliminado={() => { setSel(null); if (id) navigate('/insumos'); }} />
          </div>
        )}
      </div>
    </>
  );
}
