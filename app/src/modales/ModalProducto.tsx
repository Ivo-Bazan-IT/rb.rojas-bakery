/* Alta y edición de un producto: datos, tiempos, recetas base e ingredientes sueltos.
   El tamaño de las tortas no se define acá: se elige en cada presupuesto (las recetas se cargan para 20 cm). */
import { useEffect, useState } from 'react';
import { Button, ErrorMsg, Field, IconButton, Segmented } from '../components/ui';
import { Area, Confirmar, Modal, PieFormulario, avisar, useModal } from '../components/Modal';
import { useBorrarProducto, useGuardarProducto, useInsumos, useProductos, useRecetas } from '../api/hooks';
import { CampoFoto } from '../components/CampoFoto';
import type { Producto, TipoProducto } from '../api/tipos';
import { leerNumero, pesos } from '../lib/formato';
import {
  EditorSueltos, OpcionesRecetas, SelectCaja, aFilasSueltos, aTexto, ayudaMinutos, entero, hayRepetidos, nuevaClave, sueltosBody, type FilaSuelto,
} from './comun';

type Rol = 'base' | 'forrado_buttercream' | 'forrado_pasta';
const TIPOS: { value: TipoProducto; label: string }[] = [{ value: 'torta', label: 'Torta' }, { value: 'budin', label: 'Budín' }, { value: 'mesa_dulce', label: 'Mesa dulce' }];

interface Fila { key: number; recetaId: string; rol: Rol; cantidad: string }
interface Form {
  nombre: string; tipo: TipoProducto; descripcion: string; armado: string; decoracion: string; porMin: string; porMax: string;
  recetas: Fila[]; insumos: FilaSuelto[];
}

const fila = (r?: Partial<Fila>): Fila => ({ key: nuevaClave(), recetaId: '', rol: 'base', cantidad: '1', ...r });
function aForm(p?: Producto): Form {
  if (!p) return { nombre: '', tipo: 'torta', descripcion: '', armado: '', decoracion: '', porMin: '', porMax: '', recetas: [fila()], insumos: [] };
  return {
    nombre: p.nombre, tipo: p.tipo, descripcion: p.descripcion, armado: p.armadoMin ? String(p.armadoMin) : '',
    decoracion: p.decoracionMinUnidad ? String(p.decoracionMinUnidad) : '', porMin: p.porcionesMin ? String(p.porcionesMin) : '',
    porMax: p.porcionesMax ? String(p.porcionesMax) : '',
    recetas: p.recetas.map((r) => fila({ recetaId: String(r.recetaId), rol: r.rol as Rol, cantidad: aTexto(r.cantidad) })),
    insumos: aFilasSueltos(p.insumos),
  };
}

export function ModalProducto({ abierto, onCerrar, producto, onGuardado, onEliminado }: {
  abierto: boolean; onCerrar: () => void; producto?: Producto; onGuardado?: (p: Producto) => void; onEliminado?: () => void;
}) {
  const [f, setF] = useState<Form>(() => aForm(producto));
  const recetas = useRecetas();
  const insumos = useInsumos();
  const productos = useProductos();
  // La foto se sube aparte: se lee del catálogo para ver la nueva al instante.
  const fotoUrl = productos.data?.find((x) => x.id === producto?.id)?.fotoUrl ?? producto?.fotoUrl;
  const guardar = useGuardarProducto();
  const borrar = useBorrarProducto();
  const confirmar = useModal();
  useEffect(() => { if (abierto) { setF(aForm(producto)); guardar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (d: Partial<Form>) => setF((x) => ({ ...x, ...d }));
  const setFila = (key: number, d: Partial<Fila>) => set({ recetas: f.recetas.map((r) => (r.key === key ? { ...r, ...d } : r)) });
  const todas = recetas.data ?? [];
  const costo = f.recetas.reduce((s, r) => s + (todas.find((x) => x.id === Number(r.recetaId))?.costo ?? 0) * (leerNumero(r.cantidad) || 1), 0);
  const torta = f.tipo === 'torta', mesa = f.tipo === 'mesa_dulce', budin = f.tipo === 'budin';
  // Una receta que no escala deja la torta en un único tamaño y un único precio.
  const sinEscala = torta ? todas.find((x) => x.escala === 'ninguna' && f.recetas.some((r) => Number(r.recetaId) === x.id)) : undefined;
  const repetido = hayRepetidos(f.insumos);

  const enviar = () => guardar.mutate({
    id: producto?.id, nombre: f.nombre.trim(), tipo: f.tipo, descripcion: f.descripcion.trim(),
    armadoMin: entero(f.armado), decoracionMinUnidad: mesa ? entero(f.decoracion) : 0,
    porcionesMin: budin && entero(f.porMin) ? entero(f.porMin) : null,
    porcionesMax: budin && entero(f.porMax) ? entero(f.porMax) : null,
    recetas: f.recetas.filter((r) => r.recetaId).map((r) => ({ recetaId: Number(r.recetaId), rol: torta ? r.rol : 'base', cantidad: leerNumero(r.cantidad) || 1 })),
    insumos: sueltosBody(f.insumos),
  }, {
    onSuccess: (p) => { avisar(producto ? 'Producto guardado' : 'Producto creado'); onCerrar(); onGuardado?.(p); },
  });

  const eliminar = async () => {
    const r = await borrar.mutateAsync(producto!.id);
    avisar(r.archivado ? 'Producto archivado: ya tenía presupuestos' : 'Producto eliminado');
    onCerrar(); onEliminado?.();
  };

  return (
    <>
      <Modal abierto={abierto} onCerrar={onCerrar} tamano="grande" onEnviar={enviar}
        titulo={producto ? 'Editar producto' : 'Nuevo producto'}
        sub="El precio se calcula solo con las recetas, los tiempos y tus costos."
        pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!f.nombre.trim() && !repetido}
          textoGuardar={producto ? 'Guardar cambios' : 'Crear producto'} onEliminar={producto ? () => confirmar.abrir() : undefined} />}>
        <div className="modal__seccion">
          <Field id="mp1" label="Nombre" value={f.nombre} placeholder="Ej.: Torta Rogel" autoFocus onChange={(e) => set({ nombre: e.target.value })} />
          <div className="field">
            <span className="field__label">Tipo</span>
            <Segmented<TipoProducto> label="Tipo de producto" value={f.tipo} onChange={(tipo) => set({ tipo })} options={TIPOS} />
            <div className="field__ayuda">
              {torta ? 'Las recetas se cargan para 20 cm. El tamaño se elige en cada presupuesto y el precio se escala solo.'
                : budin ? 'Se vende entero, sin tamaños.' : 'Se vende por unidad, de 4 a 36 unidades.'}
            </div>
          </div>
          {producto
            ? <CampoFoto recurso="productos" id={producto.id} url={fotoUrl} alt="foto del producto" clase="insumo-foto" icono="torta" />
            : <p className="field__ayuda">Después de crearlo vas a poder sumarle una foto.</p>}
          <Area id="mp2" label="Descripción" value={f.descripcion} placeholder="Opcional. Ej.: dulce de leche, merengue y chocolate." onChange={(e) => set({ descripcion: e.target.value })} />
        </div>

        <div className="modal__seccion">
          <div className="modal__seccion-titulo">Tiempo y porciones</div>
          <div className="grid-2">
            <Field id="mp3" label={mesa ? 'Armado general' : torta && !sinEscala ? 'Armado y decoración (20 cm)' : 'Armado y decoración'} suffix="min" inputMode="numeric"
              value={f.armado} placeholder="0" help={ayudaMinutos(f.armado)} onChange={(e) => set({ armado: e.target.value })} />
            {mesa && <Field id="mp4" label="Decoración por unidad" suffix="min" inputMode="numeric" value={f.decoracion} placeholder="0"
              onChange={(e) => set({ decoracion: e.target.value })} />}
            {budin && <>
              <Field id="mp5" label="Porciones (mínimo)" inputMode="numeric" value={f.porMin} placeholder="Ej.: 10" onChange={(e) => set({ porMin: e.target.value })} />
              <Field id="mp6" label="Porciones (máximo)" inputMode="numeric" value={f.porMax} placeholder="Ej.: 12" onChange={(e) => set({ porMax: e.target.value })} />
            </>}
          </div>
          {torta && <p className="field__ayuda">Las porciones salen del tamaño que elijas al presupuestar (20 cm: 30–35). Si un tamaño tarda más o menos, lo ajustás en el presupuesto.</p>}
        </div>

        <div className="modal__seccion">
          <div className="modal__seccion-head">
            <div className="modal__seccion-titulo">Recetas base</div>
            <Button variant="ghost" icon="sumar" onClick={() => set({ recetas: [...f.recetas, fila()] })}>Agregar receta</Button>
          </div>
          {todas.length === 0 && <p className="sec">Todavía no hay recetas base. Cargalas en Recetas base y después sumalas acá.</p>}
          <div className="editor-cab sec solo-desktop grid" style={{ gridTemplateColumns: torta ? 'minmax(0,1fr) 170px 96px 44px' : 'minmax(0,1fr) 110px 44px' }}>
            <span>Receta</span>{torta && <span>Se usa en</span>}<span>Cantidad</span><span />
          </div>
          <div className="editor-filas">
            {f.recetas.map((r) => (
              <div key={r.key} className={`editor-fila${torta ? ' editor-fila--4' : ''}`}>
                <SelectCaja label="Receta" value={r.recetaId} onChange={(v) => setFila(r.key, { recetaId: v })}>
                  <option value="">Elegí una receta</option>
                  <OpcionesRecetas recetas={todas} />
                </SelectCaja>
                {torta && (
                  <SelectCaja label="Se usa en" value={r.rol} onChange={(v) => setFila(r.key, { rol: v as Rol })}>
                    <option value="base">Siempre</option>
                    <option value="forrado_buttercream">Forrado buttercream</option>
                    <option value="forrado_pasta">Forrado pasta</option>
                  </SelectCaja>
                )}
                <div className="field__box"><span className="field__afijo">×</span><input aria-label="Cantidad" inputMode="decimal" value={r.cantidad} onChange={(e) => setFila(r.key, { cantidad: e.target.value })} /></div>
                <IconButton icon="basura" label="Quitar receta" onClick={() => set({ recetas: f.recetas.filter((x) => x.key !== r.key) })} />
              </div>
            ))}
          </div>
          <p className="field__ayuda">
            {torta ? '«Siempre» es la base (bizcocho, relleno). Si cargás forrados de los dos tipos, el presupuesto te deja elegir.'
              : mesa ? 'Cantidad 1 = la receta tal cual. El presupuesto la multiplica según las unidades pedidas y lo que rinde cada receta.'
                : 'Cantidad = cuántas veces se hace la receta. 1 es una receta.'}
          </p>
          {sinEscala && (
            <p className="field__ayuda">
              <strong>Tamaño único:</strong> «{sinEscala.nombre}» no escala, así que esta torta tiene un solo precio, con las recetas tal cual están cargadas.
              El presupuesto no va a pedir tamaño.
            </p>
          )}
          {costo > 0 && <div className="editor-total"><span>Ingredientes{torta ? ` (${sinEscala ? 'tamaño único' : '20 cm'}, todos los forrados)` : ''}</span><span>{pesos(costo)}</span></div>}
        </div>

        <div className="modal__seccion">
          <div className="modal__seccion-titulo">Ingredientes sueltos <span className="sec">(opcional)</span></div>
          <p className="field__ayuda">
            Lo que el producto lleva además de las recetas base: frutas, toppers, cajas, velitas…
            {mesa ? ' La cantidad es por unidad: el presupuesto la multiplica por las unidades pedidas.' : ' La cantidad es fija: no cambia con el tamaño.'}
          </p>
          <EditorSueltos filas={f.insumos} onChange={(insumos) => set({ insumos })} insumos={insumos.data ?? []}
            textoTotal={mesa ? 'Ingredientes sueltos (por unidad)' : 'Ingredientes sueltos'} />
        </div>

        <ErrorMsg error={guardar.error} />
      </Modal>

      <Confirmar abierto={confirmar.abierto} onCerrar={confirmar.cerrar} titulo="¿Eliminar este producto?" accion="Eliminar" onConfirmar={eliminar}>
        <p><strong>{producto?.nombre}</strong> deja de aparecer en el catálogo.</p>
        <p className="sec">Si ya se usó en presupuestos, se archiva en vez de borrarse y esos presupuestos no cambian.</p>
      </Confirmar>
    </>
  );
}
