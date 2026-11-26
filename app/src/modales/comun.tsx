/* Piezas compartidas por los modales de catálogo. */
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import type { Receta } from '../api/tipos';
import { duracion, leerNumero, num } from '../lib/formato';

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
