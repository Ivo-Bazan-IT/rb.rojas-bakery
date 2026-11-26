/* Piezas compartidas por los modales de catálogo. */
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { Button, IconButton } from '../components/ui';
import type { Insumo, InsumoSuelto, Receta } from '../api/tipos';
import { duracion, leerNumero, num, pesosDec } from '../lib/formato';

export const CATEGORIAS = [
  { value: 'bizcochos', label: 'Bizcochos, masas y almíbar' },
  { value: 'rellenos', label: 'Rellenos' },
  { value: 'ganache', label: 'Ganache y sellado' },
  { value: 'forrados', label: 'Forrados y cubiertas' },
  { value: 'decoraciones', label: 'Decoraciones' },
];

let clave = 1;
/** Clave estable para filas que se agregan y quitan en un editor. */
export const nuevaClave = () => clave++;

/** Número escrito por la usuaria → entero (minutos, porciones). Vacío = 0. */
export const entero = (s: string) => Math.max(0, Math.round(leerNumero(s)));
/** Número con decimales para mostrar en un campo ("1,5"). */
export const aTexto = (n: number | null | undefined, d = 2) => (n == null ? '' : num(n, n % 1 ? d : 0));

/** <select> compacto dentro de una caja de campo, con grupos opcionales. */
export function SelectCaja({ value, onChange, label, children, disabled }: {
  value: string; onChange: (v: string) => void; label: string; children: ReactNode; disabled?: boolean;
}) {
  return (
    <div className="field__box">
      <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>{children}</select>
      <span className="select-icono"><Icon name="abajo" size={18} /></span>
    </div>
  );
}

/** Opciones de recetas agrupadas por categoría. */
export function OpcionesRecetas({ recetas }: { recetas: Receta[] }) {
  return (
    <>
      {CATEGORIAS.map((c) => {
        const rs = recetas.filter((r) => r.categoria === c.value);
        return rs.length ? <optgroup key={c.value} label={c.label}>{rs.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</optgroup> : null;
      })}
    </>
  );
}

/** Ayuda debajo de un campo de minutos: "= 1 h 30". */
export const ayudaMinutos = (s: string) => (entero(s) >= 60 ? `= ${duracion(entero(s))}` : undefined);

/** Opciones de insumos (los archivados solo si ya estaban elegidos). */
export function OpcionesInsumos({ insumos, incluir }: { insumos: Insumo[]; incluir?: string }) {
  return <>{insumos.filter((i) => !i.archivado || String(i.id) === incluir).map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidadUso})</option>)}</>;
}

// ---------- Ingredientes sueltos (producto y presupuesto) ----------

export interface FilaSuelto { key: number; insumoId: string; cantidad: string }
export const filaSuelto = (d?: Partial<FilaSuelto>): FilaSuelto => ({ key: nuevaClave(), insumoId: '', cantidad: '', ...d });
export const aFilasSueltos = (lista: InsumoSuelto[]) => lista.map((i) => filaSuelto({ insumoId: String(i.insumoId), cantidad: aTexto(i.cantidad) }));
/** Filas completas → cuerpo para la API. */
export const sueltosBody = (filas: FilaSuelto[]): InsumoSuelto[] => filas
  .filter((i) => i.insumoId && leerNumero(i.cantidad) > 0)
  .map((i) => ({ insumoId: Number(i.insumoId), cantidad: leerNumero(i.cantidad) }));
export const hayRepetidos = (filas: FilaSuelto[]) => {
  const usados = filas.map((i) => i.insumoId).filter(Boolean);
  return usados.length !== new Set(usados).size;
};

/** Lista editable de insumos + cantidad, con el costo de cada fila y el total. */
export function EditorSueltos({ filas, onChange, insumos, disabled, multiplicador = 1, textoTotal = 'Ingredientes sueltos' }: {
  filas: FilaSuelto[]; onChange: (f: FilaSuelto[]) => void; insumos: Insumo[]; disabled?: boolean;
  /** Para mostrar el costo real cuando la cantidad es por unidad (mesa dulce). */
  multiplicador?: number; textoTotal?: string;
}) {
  const setFila = (key: number, d: Partial<FilaSuelto>) => onChange(filas.map((i) => (i.key === key ? { ...i, ...d } : i)));
  const costo = (i: FilaSuelto) => (insumos.find((x) => x.id === Number(i.insumoId))?.costoUnitario ?? 0) * leerNumero(i.cantidad) * multiplicador;
  const total = filas.reduce((s, i) => s + costo(i), 0);
  return (
    <div className="col" style={{ gap: 8 }}>
      {filas.length > 0 && (
        <div className="editor-filas">
          {filas.map((i) => {
            const ins = insumos.find((x) => x.id === Number(i.insumoId));
            return (
              <div key={i.key} className="editor-fila editor-fila--costo">
                <SelectCaja label="Insumo" value={i.insumoId} disabled={disabled} onChange={(v) => setFila(i.key, { insumoId: v })}>
                  <option value="">Elegí un insumo</option>
                  <OpcionesInsumos insumos={insumos} incluir={i.insumoId} />
                </SelectCaja>
                <div className="field__box">
                  <input aria-label="Cantidad" inputMode="decimal" placeholder="0" value={i.cantidad} disabled={disabled}
                    onChange={(e) => setFila(i.key, { cantidad: e.target.value })} />
                  <span className="field__afijo">{ins?.unidadUso ?? ''}</span>
                </div>
                <span className="editor-fila__costo">{ins && leerNumero(i.cantidad) > 0 ? pesosDec(costo(i)) : '—'}</span>
                {!disabled && <IconButton icon="basura" label="Quitar ingrediente" onClick={() => onChange(filas.filter((x) => x.key !== i.key))} />}
              </div>
            );
          })}
        </div>
      )}
      {hayRepetidos(filas) && <p className="error-msg">Hay un insumo repetido. Sumá las cantidades en una sola fila.</p>}
      {!disabled && (
        <div><Button variant="ghost" icon="sumar" onClick={() => onChange([...filas, filaSuelto()])}>Agregar ingrediente</Button></div>
      )}
      {total > 0 && <div className="editor-total"><span>{textoTotal}</span><span>{pesosDec(total)}</span></div>}
    </div>
  );
}
