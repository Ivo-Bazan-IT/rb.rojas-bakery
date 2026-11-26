import type { ReactNode, InputHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import type { Estado, EstadoPresupuesto } from '../api/tipos';

/* Componentes base: Button, Field, Select, Chip, Segmented, StatusPill, Card, ListItem, Checkbox. */

type Variante = 'primary' | 'secondary' | 'soft' | 'ghost';

export function Button({ variant = 'primary', icon, block, children, className = '', to, ...rest }:
  { variant?: Variante; icon?: IconName; block?: boolean; to?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `btn btn--${variant}${block ? ' btn--block' : ''} ${className}`;
  const inner = <>{icon && <Icon name={icon} size={20} stroke={variant === 'primary' ? 2 : 1.75} />}{children}</>;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}

export function IconButton({ icon, label, onClick, size = 22 }: { icon: IconName; label: string; onClick?: () => void; size?: number }) {
  return <button type="button" className="btn btn--icono" aria-label={label} onClick={onClick}><Icon name={icon} size={size} /></button>;
}

export function Field({ id, label, prefix, suffix, help, ...rest }:
  { id: string; label: ReactNode; prefix?: string; suffix?: string; help?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">{label}</label>
      <div className="field__box">
        {prefix && <span className="field__afijo">{prefix}</span>}
        <input id={id} {...rest} />
        {suffix && <span className="field__afijo">{suffix}</span>}
      </div>
      {help && <div className="field__ayuda">{help}</div>}
    </div>
  );
}

export function Select({ id, label, value, onChange, options }:
  { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">{label}</label>
      <div className="field__box">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="select-icono"><Icon name="abajo" size={18} /></span>
      </div>
    </div>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return <button type="button" className={`chip${active ? ' is-activo' : ''}`} aria-pressed={active} onClick={onClick}>{children}</button>;
}

export function Segmented<T extends string>({ options, value, onChange, label, className = '' }:
  { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div className={`seg ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'is-activo' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

const ESTADO_LABEL: Record<Estado, string> = { presupuestado: 'Presupuestado', senado: 'Señado', realizado: 'Realizado', pago: 'Pago', enviado: 'Enviado', cancelado: 'Cancelado' };
export function StatusPill({ estado, children }: { estado: Estado | 'alerta' | 'marca'; children?: ReactNode }) {
  return <span className={`pill pill--${estado}`}>{children ?? ESTADO_LABEL[estado as Estado]}</span>;
}
export const estadoLabel = (e: Estado) => ESTADO_LABEL[e];

/* Estados de un presupuesto, con los colores que ya existen en la guía. */
const PRESU: Record<EstadoPresupuesto, { label: string; clase: Estado | 'alerta' | 'marca' }> = {
  borrador: { label: 'Borrador', clase: 'marca' }, enviado: { label: 'Enviado', clase: 'senado' },
  convertido: { label: 'Pedido', clase: 'pago' }, vencido: { label: 'Vencido', clase: 'alerta' },
  cancelado: { label: 'Cancelado', clase: 'cancelado' },
};
export function PillPresupuesto({ estado }: { estado: EstadoPresupuesto }) {
  return <StatusPill estado={PRESU[estado].clase}>{PRESU[estado].label}</StatusPill>;
}

/* Estados vacíos, de carga y de error */
export function Vacio({ titulo, children, accion }: { titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="strong">{titulo}</div>
      {children && <p className="sec">{children}</p>}
      {accion}
    </div>
  );
}
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="sec cargando" role="status">{texto}</p>;
}
export function ErrorMsg({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="error-msg" role="alert">{error instanceof Error ? error.message : String(error)}</p>;
}
export function Avisos({ avisos }: { avisos?: string[] }) {
  if (!avisos?.length) return null;
  return (
    <div className="alerta" role="status">
      <Icon name="campana" size={20} />
      <div className="alerta__texto">{avisos.map((a) => <div key={a} className="sec">{a}</div>)}</div>
    </div>
  );
}

export function Card({ children, crema, className = '', as: As = 'div' }: { children: ReactNode; crema?: boolean; className?: string; as?: 'div' | 'section' }) {
  return <As className={`card${crema ? ' card--crema' : ''} ${className}`}>{children}</As>;
}

export function ListItem({ icon, thumb, title, detail, value, chevron, to, onClick, active, extra }:
  { icon?: IconName; thumb?: ReactNode; title: ReactNode; detail?: ReactNode; value?: ReactNode; chevron?: boolean; to?: string; onClick?: () => void; active?: boolean; extra?: ReactNode }) {
  const inner = (
    <>
      {thumb ?? (icon && <span className="item__mini"><Icon name={icon} size={19} /></span>)}
      <span className="grow">
        <span className="item__titulo ellipsis" style={{ display: 'block' }}>{title}</span>
        {detail && <span className="sec" style={{ display: 'block' }}>{detail}</span>}
      </span>
      {extra}
      {value != null && <span className="item__valor tab">{value}</span>}
      {chevron && <span className="item__chev"><Icon name="derecha" size={18} /></span>}
    </>
  );
  const cls = `item${active ? ' is-activo' : ''}`;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" className={cls} onClick={onClick}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export function Checkbox({ checked, onChange, children, extra }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; extra?: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__caja">{checked && <Icon name="check" size={16} stroke={2.25} />}</span>
      <span className="check__texto">{children}</span>
      {extra && <span className="check__cant tab">{extra}</span>}
    </label>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><div className="sec">{label}</div><div className="stat__valor">{value}</div></div>;
}
