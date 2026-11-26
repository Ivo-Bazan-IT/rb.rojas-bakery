import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Avisos, Button, Card, Cargando, Chip, ErrorMsg, Field, IconButton, ListItem, Segmented, Vacio } from '../components/ui';
import { Icon } from '../components/Icon';
import { useProductos } from '../api/hooks';
import type { Forrado, Producto, TipoProducto } from '../api/tipos';
import { duracion, num, pesos } from '../lib/formato';
import { useModal } from '../components/Modal';
import { ModalProducto } from '../modales/ModalProducto';

const FILTROS: { v: 'todos' | TipoProducto; l: string }[] = [{ v: 'todos', l: 'Todos' }, { v: 'torta', l: 'Tortas' }, { v: 'budin', l: 'Budines' }, { v: 'mesa_dulce', l: 'Mesa dulce' }];
const ROL: Record<string, string> = { base: 'Base', forrado_buttercream: 'Forrado buttercream', forrado_pasta: 'Forrado pasta' };

function precioDesde(p: Producto) {
  if (p.error) return 'Revisar';
  if (!p.precios.length) return '—';
  const min = Math.min(...p.precios.map((x) => x.precio));
  if (p.tipo === 'mesa_dulce') return `$${num(p.precios[0]!.porPorcion! / 100, 2)} c/u`;
  const desde = p.precios.length > 1 ? 'desde ' : '';
  return p.tipo === 'torta' && !p.recetaSinEscala ? `${desde}${pesos(min)} · 20 cm` : `${desde}${pesos(min)}`;
}
function detalleTipo(p: Producto) {
  if (p.tipo === 'torta') return p.recetaSinEscala ? 'Torta · tamaño único' : 'Torta · tamaño a elegir (ref. 20 cm)';
  if (p.tipo === 'budin') return `Budín · entero${p.porcionesMin ? ` · ${p.porcionesMin} porc.` : ''}`;
  return 'Mesa dulce · por unidad';
}

function Detalle({ p, onEditar }: { p: Producto; onEditar: () => void }) {
  const navigate = useNavigate();
  const forrados = (['buttercream', 'pasta'] as Forrado[]).filter((f) => p.precios.some((x) => x.forrado === f));
  const [forrado, setForrado] = useState<Forrado | null>(forrados[0] ?? null);
  const precios = p.tipo === 'torta' ? p.precios.filter((x) => (x.forrado ?? null) === (forrados.length ? forrado : null)) : p.precios;
  const recetas = p.recetas.filter((r) => r.rol === 'base' || !forrado || r.rol === `forrado_${forrado}`);
  const presupuestar = () => navigate(`/presupuestos/nuevo?producto=${p.id}`);
  const avisos = p.precios[0]?.avisos;

  const tabla = (
    <Card as="section">
      <h2>{p.tipo === 'torta' && !p.recetaSinEscala ? 'Precio de referencia (20 cm)' : p.tipo === 'mesa_dulce' ? 'Precio de referencia' : 'Precio'}</h2>
      <ErrorMsg error={p.error} />
      <table className="tabla">
        <thead><tr><th>{p.tipo === 'mesa_dulce' ? 'Cantidad' : 'Tamaño'}</th><th>Porciones</th><th>Precio</th><th>{p.tipo === 'mesa_dulce' ? 'Por unidad' : 'Por porción'}</th></tr></thead>
        <tbody>
          {precios.map((x, i) => (
            <tr key={i}>
              <td className="strong">{x.tamano ? `${x.tamano} cm` : x.cantidad ? `${x.cantidad} u` : p.tipo === 'torta' ? 'Único' : 'Entero'}</td>
              <td>{x.porciones ? `${x.porciones[0]}–${x.porciones[1]}` : '—'}</td>
              <td className="strong monto">{pesos(x.precio)}</td>
              <td>{x.porPorcion == null ? '—' : p.tipo === 'mesa_dulce' ? `$${num(x.porPorcion / 100, 2)}` : pesos(x.porPorcion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sec">
        {p.tipo === 'mesa_dulce' ? 'Calculado para 12 unidades. El presupuesto ajusta las tandas según la cantidad.'
          : p.tipo === 'torta' && p.recetaSinEscala ? `Tamaño único: «${p.recetaSinEscala}» no escala, así que la torta tiene un solo precio.`
            : p.tipo === 'torta' ? 'Otro tamaño se elige al presupuestar y el precio se escala desde 20 cm. Por porción = precio ÷ mínimo de porciones.'
              : 'Por porción = precio ÷ mínimo de porciones.'}
      </p>
    </Card>
  );

  const composicion = (
    <Card as="section">
      <h2>Composición{p.tipo === 'torta' && !p.recetaSinEscala ? ' (20 cm)' : ''}</h2>
      {recetas.length === 0 && p.insumos.length === 0 ? <p className="sec">Este producto todavía no tiene recetas base.</p> : (
        <div className="lista">
          {recetas.map((r) => (
            <ListItem key={r.id} icon="receta" title={r.nombre} detail={`${ROL[r.rol] ?? r.rol}${r.cantidad !== 1 ? ` · × ${num(r.cantidad, 2)}` : ''}`}
              value={<><span style={{ display: 'block' }}>{pesos(r.costo * r.cantidad)}</span>
                <span className="sec" style={{ display: 'block', fontWeight: 600 }}>{duracion(r.trabajoMin)}{r.hornoMin ? ` · ${duracion(r.hornoMin)} horno` : ''}</span></>} to={`/recetas/${r.recetaId}`} />
          ))}
          {p.insumos.map((i) => (
            <ListItem key={`i${i.id}`} icon="insumo" title={i.nombre}
              detail={`Ingrediente suelto · ${num(i.cantidad, i.cantidad % 1 ? 2 : 0)} ${i.unidad}${p.tipo === 'mesa_dulce' ? ' por unidad' : ''}`}
              value={pesos(i.costo)} to={`/insumos/${i.insumoId}`} />
          ))}
          <ListItem icon="reloj" title={p.tipo === 'mesa_dulce' ? 'Decoración por unidad' : 'Armado y decoración'} detail="Tiempo del producto"
            value={duracion(p.tipo === 'mesa_dulce' ? p.decoracionMinUnidad : p.armadoMin)} />
        </div>
      )}
    </Card>
  );

  const seg = forrados.length > 1 && (
    <div className="field"><span className="field__label">Forrado</span>
      <div style={{ maxWidth: 280 }}>
        <Segmented<Forrado> label="Forrado" value={forrado!} onChange={setForrado} options={[{ value: 'buttercream', label: 'Buttercream' }, { value: 'pasta', label: 'Pasta' }]} />
      </div>
    </div>
  );
  const foto = (cls: string, size: number) => p.fotoUrl
    ? <img src={p.fotoUrl} alt={p.nombre} className={cls} />
    : <div role="img" aria-label="Sin foto del producto" className={cls}><Icon name="torta" size={size} /></div>;

  return (
    <>
      {/* Mobile */}
      <div className="solo-mobile col" style={{ gap: 16 }}>
        {foto('prod-foto prod-foto--mobile', 44)}
        <div className="fila" style={{ alignItems: 'flex-start' }}>
          <div><h1 className="prod-nombre">{p.nombre}</h1><div className="sec">{detalleTipo(p)}</div></div>
          <IconButton icon="lapiz" label="Editar producto" onClick={onEditar} />
        </div>
        <Avisos avisos={avisos} />
        {seg}{tabla}{composicion}
        <Button icon="sumar" block onClick={presupuestar}>Presupuestar este producto</Button>
      </div>

      {/* Desktop */}
      <div className="solo-desktop col" style={{ gap: 24 }}>
        <div className="prod-cab">
          {foto('prod-foto', 52)}
          <div className="col" style={{ gap: 8 }}>
            <h1 className="prod-nombre">{p.nombre}</h1>
            <div className="sec">{detalleTipo(p)}{p.descripcion && ` · ${p.descripcion}`}</div>
            {seg}
            <div className="fila" style={{ justifyContent: 'flex-start', gap: 10 }}>
              <Button icon="sumar" onClick={presupuestar}>Presupuestar</Button>
              <Button variant="secondary" icon="lapiz" onClick={onEditar}>Editar</Button>
            </div>
          </div>
        </div>
        <Avisos avisos={avisos} />
        <div className="prod-dos">{tabla}{composicion}</div>
      </div>
    </>
  );
}

export default function Catalogo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const productos = useProductos();
  const modal = useModal<Producto>();
  const [filtro, setFiltro] = useState<'todos' | TipoProducto>('todos');
  const [q, setQ] = useState('');
  const todos = productos.data ?? [];
  const lista = todos.filter((p) => (filtro === 'todos' || p.tipo === filtro) && p.nombre.toLowerCase().includes(q.toLowerCase()));
  const sel = todos.find((p) => p.id === Number(id)) ?? (id ? undefined : todos[0]);

  return (
    <>
      <MobileHeader title={id ? 'Producto' : 'Productos'} back={id ? '/catalogo' : undefined} />
      <div className="page">
        <DesktopHeader title="Productos"><Button icon="sumar" onClick={() => modal.abrir()}>Nuevo producto</Button></DesktopHeader>
        <ErrorMsg error={productos.error} />
        {productos.isPending ? <Cargando /> : todos.length === 0 ? (
          <Vacio titulo="Todavía no hay productos" accion={<Button variant="soft" icon="sumar" onClick={() => modal.abrir()}>Nuevo producto</Button>}>
            Primero cargá los insumos y las recetas base. Después armá cada producto combinando recetas.
          </Vacio>
        ) : (
          <div className={`split split--catalogo${id ? ' split--detalle' : ''}`}>
            <div className="split__lista col">
              <Button icon="sumar" block className="solo-mobile" onClick={() => modal.abrir()}>Nuevo producto</Button>
              <Field id="s7" label="Buscar" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="chips" role="group" aria-label="Tipo de producto">
                {FILTROS.map((f) => <Chip key={f.v} active={filtro === f.v} onClick={() => setFiltro(f.v)}>{f.l}</Chip>)}
              </div>
              <div className="col" style={{ gap: 10 }}>
                {lista.map((p) => (
                  <div key={p.id} className={`card card--item${sel?.id === p.id ? ' is-sel' : ''}`}>
                    <ListItem icon="torta" thumb={p.fotoUrl ? <img src={p.fotoUrl} alt="" className="item__mini" /> : undefined} title={p.nombre} detail={detalleTipo(p)} value={<span style={{ fontSize: 13 }}>{precioDesde(p)}</span>} to={`/catalogo/${p.id}`} />
                  </div>
                ))}
                {lista.length === 0 && <p className="sec">No hay productos con ese filtro.</p>}
              </div>
            </div>
            <div className="split__detalle">{sel ? <Detalle key={sel.id} p={sel} onEditar={() => modal.abrir(sel)} /> : <p className="sec">El producto no existe.</p>}</div>
          </div>
        )}
      </div>
      <ModalProducto abierto={modal.abierto} onCerrar={modal.cerrar} producto={modal.item}
        onGuardado={(p) => navigate(`/catalogo/${p.id}`)} onEliminado={() => navigate('/catalogo')} />
    </>
  );
}
