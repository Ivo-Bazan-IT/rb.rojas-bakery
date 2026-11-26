/* Formato de montos, tiempos y fechas (es-AR). Los montos llegan en centavos. */

const miles = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** $60.300 (redondea a peso) */
export function pesos(centavos: number | null | undefined) {
  if (centavos == null) return '—';
  const p = Math.round(centavos / 100);
  return `${p < 0 ? '-' : ''}$${miles(Math.abs(p))}`;
}

/** $12.087,40 */
export function pesosDec(centavos: number) {
  const c = Math.round(centavos);
  const ent = Math.floor(Math.abs(c) / 100);
  return `${c < 0 ? '-' : ''}$${miles(ent)},${String(Math.abs(c) % 100).padStart(2, '0')}`;
}

/** 3 h 30 · 45 min · 2 h */
export function duracion(min: number) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export const num = (n: number, d = 0) => n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Lee un número escrito con coma o punto decimal. */
export function leerNumero(s: string) {
  const t = s.trim().replace(/\s|\$/g, '');
  // "0.5" o "1.25" (sin coma y sin grupos de 3) se toman como decimales; "4.500" como miles.
  if (!t.includes(',') && /^\d+\.\d{1,2}$|^0\.\d+$/.test(t)) return Number(t) || 0;
  return Number(t.replace(/\./g, '').replace(',', '.')) || 0;
}
/** Lee pesos escritos por la usuaria ("4.500" o "4500,50") y devuelve centavos. */
export const leerPesos = (s: string) => Math.round(leerNumero(s) * 100);

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "2026-12-05" → Date local a medianoche */
export const aFecha = (iso: string) => { const [a, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(a!, m! - 1, d!); };
/** Date → "2026-12-05" */
export const aISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoyISO = () => aISO(new Date());

/** Jueves 3 de diciembre */
export const fechaLarga = (d: Date) => `${cap(DIAS[d.getDay()]!)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
/** Sáb 5/12 */
export const fechaCorta = (iso: string) => { const d = aFecha(iso); return `${DIAS_CORTO[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
/** 5/12/2026 */
export const fechaNum = (iso: string | Date) => { const d = typeof iso === 'string' ? (iso.length > 10 ? new Date(iso) : aFecha(iso)) : iso; return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
export const diaCorto = (d: Date) => DIAS_CORTO[d.getDay()]!;
export const nombreMes = (mes: string) => { const [a, m] = mes.split('-').map(Number); return `${cap(MESES[m! - 1]!)} ${a}`; };
export const mesActual = () => aISO(new Date()).slice(0, 7);
export const moverMes = (mes: string, delta: number) => { const [a, m] = mes.split('-').map(Number); const d = new Date(a!, m! - 1 + delta, 1); return aISO(d).slice(0, 7); };

/** Faltan 2 días · Hoy · Mañana */
export const faltan = (dias: number) => (dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : dias < 0 ? `Hace ${-dias} días` : `Faltan ${dias} días`);
