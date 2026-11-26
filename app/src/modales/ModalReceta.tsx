/* Recetas base: alta y edición completa, agregar o editar un ingrediente suelto y duplicar. */
import { useEffect, useState } from 'react';
import { Button, ErrorMsg, Field, IconButton, Segmented, Select } from '../components/ui';
import { Area, Confirmar, Modal, PieFormulario, avisar, useModal } from '../components/Modal';
import { useBorrarReceta, useGuardarReceta, useInsumos } from '../api/hooks';
import type { Insumo, Receta } from '../api/tipos';
import { leerNumero, num, pesosDec } from '../lib/formato';
import { CATEGORIAS, OpcionesInsumos, SelectCaja, aTexto, ayudaMinutos, entero, nuevaClave } from './comun';

type Escala = Receta['escala'];
const ESCALAS: { value: Escala; label: string }[] = [{ value: 'volumen', label: 'Volumen' }, { value: 'superficie', label: 'Superficie' }, { value: 'ninguna', label: 'No escala' }];
const AYUDA_ESCALA: Record<Escala, string> = {
  volumen: 'Bizcochos, rellenos y almíbar: crecen con el volumen de la torta (18 cm × 0,81 · 22 cm × 1,21).',
  superficie: 'Forrados, ganache y cubiertas: crecen con la superficie (18 cm × 0,88 · 22 cm × 1,12).',
  ninguna: 'Decoraciones fijas: se usa la misma cantidad en cualquier tamaño.',
};
const escalaPara = (cat: string): Escala => (cat === 'forrados' || cat === 'ganache' ? 'superficie' : cat === 'decoraciones' ? 'ninguna' : 'volumen');

interface FilaIng { key: number; insumoId: string; cantidad: string }
interface Form { nombre: string; categoria: string; escala: Escala; rendimiento: string; trabajo: string; horno: string; notas: string; ingredientes: FilaIng[] }

const filaIng = (d?: Partial<FilaIng>): FilaIng => ({ key: nuevaClave(), insumoId: '', cantidad: '', ...d });
const aForm = (r?: Receta): Form => (r ? {
  nombre: r.nombre, categoria: r.categoria, escala: r.escala, rendimiento: aTexto(r.rendimiento), trabajo: r.trabajoMin ? String(r.trabajoMin) : '',
  horno: r.hornoMin ? String(r.hornoMin) : '', notas: r.notas,
  ingredientes: r.ingredientes.map((i) => filaIng({ insumoId: String(i.insumoId), cantidad: aTexto(i.cantidad) })),
} : { nombre: '', categoria: 'bizcochos', escala: 'volumen', rendimiento: '', trabajo: '', horno: '', notas: '', ingredientes: [filaIng()] });

const costoDe = (ins: Insumo | undefined, cantidad: string) => (ins ? ins.costoUnitario * leerNumero(cantidad) : 0);

/** Cuerpo para el back: los ingredientes van con su unidad de uso para que valide g / ml / u. */
const ingredientesBody = (filas: { insumoId: string; cantidad: string }[], insumos: Insumo[]) => filas
  .filter((i) => i.insumoId && leerNumero(i.cantidad) > 0)
  .map((i) => ({ insumoId: Number(i.insumoId), cantidad: leerNumero(i.cantidad), unidad: insumos.find((x) => x.id === Number(i.insumoId))?.unidadUso }));

export function ModalReceta({ abierto, onCerrar, receta, onGuardada, onEliminada }: {
  abierto: boolean; onCerrar: () => void; receta?: Receta; onGuardada?: (r: Receta) => void; onEliminada?: () => void;
}) {
  const [f, setF] = useState<Form>(() => aForm(receta));
  const insumos = useInsumos();
  const guardar = useGuardarReceta();
  const borrar = useBorrarReceta();
  const confirmar = useModal();
  useEffect(() => { if (abierto) { setF(aForm(receta)); guardar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const lista = insumos.data ?? [];
  const set = (d: Partial<Form>) => setF((x) => ({ ...x, ...d }));
  const setFila = (key: number, d: Partial<FilaIng>) => set({ ingredientes: f.ingredientes.map((i) => (i.key === key ? { ...i, ...d } : i)) });
  const total = f.ingredientes.reduce((s, i) => s + costoDe(lista.find((x) => x.id === Number(i.insumoId)), i.cantidad), 0);
  const usados = f.ingredientes.map((i) => i.insumoId).filter(Boolean);
  const repetido = usados.length !== new Set(usados).size;

  const enviar = () => guardar.mutate({
    id: receta?.id, nombre: f.nombre.trim(), categoria: f.categoria, escala: f.escala,
    rendimiento: f.rendimiento.trim() ? leerNumero(f.rendimiento) || null : null,
    trabajoMin: entero(f.trabajo), hornoMin: entero(f.horno), notas: f.notas.trim(),
    ingredientes: ingredientesBody(f.ingredientes, lista),
  }, { onSuccess: (r) => { avisar(receta ? 'Receta guardada' : 'Receta creada'); onCerrar(); onGuardada?.(r); } });

  const eliminar = async () => {
    const r = await borrar.mutateAsync(receta!.id);
    avisar(r.archivado ? 'Receta archivada: la usa algún producto' : 'Receta eliminada');
    onCerrar(); onEliminada?.();
  };

  return (
    <>
      <Modal abierto={abierto} onCerrar={onCerrar} tamano="grande" onEnviar={enviar}
        titulo={receta ? 'Editar receta' : 'Nueva receta base'} sub="Cargá las cantidades para una torta de 20 cm (o para lo que rinde la receta)."
        pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!f.nombre.trim() && !repetido}
          textoGuardar={receta ? 'Guardar cambios' : 'Crear receta'} onEliminar={receta ? () => confirmar.abrir() : undefined} />}>
        <div className="modal__seccion">
          <Field id="mr1" label="Nombre" value={f.nombre} placeholder="Ej.: Bizcochuelo de vainilla" autoFocus onChange={(e) => set({ nombre: e.target.value })} />
          <Select id="mr2" label="Categoría" value={f.categoria} options={CATEGORIAS}
            onChange={(categoria) => set(receta ? { categoria } : { categoria, escala: escalaPara(categoria) })} />
          <div className="field">
            <span className="field__label">Cómo escala con el tamaño</span>
            <Segmented<Escala> label="Escala" value={f.escala} onChange={(escala) => set({ escala })} options={ESCALAS} />
            <div className="field__ayuda">{AYUDA_ESCALA[f.escala]}</div>
          </div>
        </div>

        <div className="modal__seccion">
          <div className="modal__seccion-titulo">Tiempos y rendimiento</div>
          <div className="grid-2">
            <Field id="mr3" label="Trabajo" suffix="min" inputMode="numeric" placeholder="0" value={f.trabajo} help={ayudaMinutos(f.trabajo)} onChange={(e) => set({ trabajo: e.target.value })} />
            <Field id="mr4" label="Horno" suffix="min" inputMode="numeric" placeholder="0" value={f.horno} help={ayudaMinutos(f.horno)} onChange={(e) => set({ horno: e.target.value })} />
          </div>
          <Field id="mr5" label="Rinde" suffix="u" inputMode="decimal" placeholder="Opcional" value={f.rendimiento}
            help="Solo para mesa dulce: cuántas unidades salen de una receta. Ej.: 24 alfajorcitos." onChange={(e) => set({ rendimiento: e.target.value })} />
        </div>

        <div className="modal__seccion">
          <div className="modal__seccion-head">
            <div className="modal__seccion-titulo">Ingredientes</div>
            <Button variant="ghost" icon="sumar" onClick={() => set({ ingredientes: [...f.ingredientes, filaIng()] })}>Agregar</Button>
          </div>
          {lista.length === 0 && <p className="sec">Todavía no hay insumos. Cargalos en Insumos y después sumalos acá.</p>}
          <div className="editor-cab sec solo-desktop grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 130px 92px 44px' }}>
            <span>Insumo</span><span>Cantidad</span><span className="right">Costo</span><span />
          </div>
          <div className="editor-filas">
            {f.ingredientes.map((i) => {
              const ins = lista.find((x) => x.id === Number(i.insumoId));
              return (
                <div key={i.key} className="editor-fila editor-fila--costo">
                  <SelectCaja label="Insumo" value={i.insumoId} onChange={(v) => setFila(i.key, { insumoId: v })}>
                    <option value="">Elegí un insumo</option>
                    <OpcionesInsumos insumos={lista} incluir={i.insumoId} />
                  </SelectCaja>
                  <div className="field__box">
                    <input aria-label="Cantidad" inputMode="decimal" placeholder="0" value={i.cantidad} onChange={(e) => setFila(i.key, { cantidad: e.target.value })} />
                    <span className="field__afijo">{ins?.unidadUso ?? ''}</span>
                  </div>
                  <span className="editor-fila__costo">{ins && leerNumero(i.cantidad) > 0 ? pesosDec(costoDe(ins, i.cantidad)) : '—'}</span>
                  <IconButton icon="basura" label="Quitar ingrediente" onClick={() => set({ ingredientes: f.ingredientes.filter((x) => x.key !== i.key) })} />
                </div>
              );
            })}
          </div>
          {repetido && <p className="error-msg">Hay un insumo repetido. Sumá las cantidades en una sola fila.</p>}
          <div className="editor-total"><span>Costo de la receta</span><span>{pesosDec(total)}</span></div>
        </div>

        <Area id="mr6" label="Notas" value={f.notas} placeholder="Opcional. Pasos, temperatura del horno, trucos…" onChange={(e) => set({ notas: e.target.value })} />
        <ErrorMsg error={guardar.error} />
      </Modal>

      <Confirmar abierto={confirmar.abierto} onCerrar={confirmar.cerrar} titulo="¿Eliminar esta receta?" accion="Eliminar" onConfirmar={eliminar}>
        <p><strong>{receta?.nombre}</strong> deja de aparecer en Recetas base.</p>
        <p className="sec">{receta?.usadaEn.length
          ? `La usan ${receta.usadaEn.length} producto${receta.usadaEn.length > 1 ? 's' : ''}, así que se archiva: esos productos siguen calculando su precio.`
          : 'No la usa ningún producto, así que se borra.'}</p>
      </Confirmar>
    </>
  );
}

/** Agregar un ingrediente a una receta ya creada, o cambiar la cantidad / quitar uno existente. */
export function ModalIngrediente({ abierto, onCerrar, receta, ingredienteId }: {
  abierto: boolean; onCerrar: () => void; receta: Receta; ingredienteId?: number;
}) {
  const actual = receta.ingredientes.find((i) => i.id === ingredienteId);
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const insumos = useInsumos();
  const guardar = useGuardarReceta();
  useEffect(() => {
    if (!abierto) return;
    setInsumoId(actual ? String(actual.insumoId) : ''); setCantidad(actual ? aTexto(actual.cantidad) : ''); guardar.reset();
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const lista = insumos.data ?? [];
  const ins = lista.find((x) => x.id === Number(insumoId));
  const yaEsta = !actual && receta.ingredientes.some((i) => String(i.insumoId) === insumoId);
  const filas = receta.ingredientes.map((i) => ({ id: i.id, insumoId: String(i.insumoId), cantidad: String(i.cantidad) }));

  const mandar = (nuevas: { insumoId: string; cantidad: string }[], texto: string) =>
    guardar.mutate({ id: receta.id, ingredientes: ingredientesBody(nuevas, lista) }, { onSuccess: () => { avisar(texto); onCerrar(); } });
  const enviar = () => {
    if (!ins || leerNumero(cantidad) <= 0 || yaEsta) return;
    const nuevas = actual
      ? filas.map((x) => (x.id === actual.id ? { insumoId, cantidad: String(leerNumero(cantidad)) } : x))
      : [...filas, { insumoId, cantidad: String(leerNumero(cantidad)) }];
    mandar(nuevas, actual ? 'Ingrediente actualizado' : 'Ingrediente agregado');
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} tamano="chico" onEnviar={enviar}
      titulo={actual ? actual.nombre : 'Agregar ingrediente'} sub={receta.nombre}
      pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!ins && leerNumero(cantidad) > 0 && !yaEsta}
        textoGuardar={actual ? 'Guardar' : 'Agregar'} textoEliminar="Quitar"
        onEliminar={actual ? () => mandar(filas.filter((x) => x.id !== actual.id), 'Ingrediente quitado') : undefined} />}>
      <Select id="mi1" label="Insumo" value={insumoId} onChange={setInsumoId}
        options={[{ value: '', label: 'Elegí un insumo' }, ...lista.filter((i) => !i.archivado || String(i.id) === insumoId).map((i) => ({ value: String(i.id), label: i.nombre }))]} />
      {yaEsta && <p className="error-msg">Ese insumo ya está en la receta. Tocalo en la tabla para cambiar la cantidad.</p>}
      <Field id="mi2" label="Cantidad" suffix={ins?.unidadUso ?? ''} inputMode="decimal" placeholder="0" value={cantidad} autoFocus={!!actual}
        help={ins ? `$${num(ins.costoUnitario / 100, 2)} por ${ins.unidadUso}` : undefined} onChange={(e) => setCantidad(e.target.value)} />
      <div className="editor-total"><span>Costo</span><span>{pesosDec(costoDe(ins, cantidad))}</span></div>
      <ErrorMsg error={guardar.error} />
    </Modal>
  );
}

/** Confirmación para duplicar una receta: crea «Nombre (copia)» con los mismos ingredientes. */
export function ConfirmarDuplicar({ abierto, onCerrar, receta, onCreada }: { abierto: boolean; onCerrar: () => void; receta: Receta; onCreada: (r: Receta) => void }) {
  const guardar = useGuardarReceta();
  const duplicar = async () => {
    const r = await guardar.mutateAsync({
      nombre: `${receta.nombre} (copia)`, categoria: receta.categoria, escala: receta.escala, rendimiento: receta.rendimiento,
      trabajoMin: receta.trabajoMin, hornoMin: receta.hornoMin, notas: receta.notas,
      ingredientes: receta.ingredientes.map((i) => ({ insumoId: i.insumoId, cantidad: i.cantidad })),
    });
    avisar('Receta duplicada'); onCreada(r);
  };
  return (
    <Confirmar abierto={abierto} onCerrar={onCerrar} titulo="¿Duplicar esta receta?" accion="Duplicar" icono="copiar" onConfirmar={duplicar}>
      <p>Se crea <strong>{receta.nombre} (copia)</strong> con los mismos {receta.ingredientes.length} ingredientes y tiempos.</p>
      <p className="sec">Sirve para armar una variante (por ejemplo, de chocolate) sin tocar la original.</p>
    </Confirmar>
  );
}
