import type { ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLogo, useLogout, useUsuario } from '../api/hooks';
import { ApiError } from '../api/cliente';
import { Icon, type IconName } from './Icon';
import { IconButton } from './ui';
import logoMarca from '../design/assets/logo-rb-rojo.png';
import { Campana } from '../modales/Campana';
import { ModalPassword } from '../modales/ModalPassword';
import { useModal } from './Modal';

const GRUPOS: { titulo?: string; links: { to: string; label: string; icon: IconName; match?: string }[] }[] = [
  { links: [{ to: '/', label: 'Inicio', icon: 'inicio' }] },
  { titulo: 'Ventas', links: [
    { to: '/presupuestos', label: 'Presupuestos', icon: 'presupuesto' },
    { to: '/pedidos', label: 'Pedidos', icon: 'pedidos' },
  ] },
  { titulo: 'Catálogo', links: [
    { to: '/catalogo', label: 'Productos', icon: 'torta' },
    { to: '/recetas', label: 'Recetas base', icon: 'receta' },
    { to: '/insumos', label: 'Insumos', icon: 'insumo' },
  ] },
  { titulo: 'Gestión', links: [
    { to: '/compras', label: 'Lista de compras', icon: 'carrito' },
    { to: '/resumen', label: 'Resumen mensual', icon: 'resumen' },
    { to: '/costos', label: 'Costos y ajustes', icon: 'ajustes' },
  ] },
];

function activo(path: string, to: string, match?: string) {
  const base = match ?? to;
  return base === '/' ? path === '/' : path.startsWith(base);
}

/** Cierra la sesión en el back y vuelve al login. */
export function useCerrarSesion() {
  const logout = useLogout();
  const navigate = useNavigate();
  return () => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) });
}

function Sidebar() {
  const logo = useLogo(logoMarca);
  const password = useModal();
  const { pathname } = useLocation();
  const cerrar = useCerrarSesion();
  const { data: u } = useUsuario();
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar__marca" aria-label="Rojas Bakery, ir al inicio">
        <img src={logo} alt="" />
        <div className="sidebar__marca-texto">
          <div className="sidebar__marca-nombre">Rojas Bakery</div>
          <div className="sidebar__marca-sub">Pastelería creativa</div>
        </div>
      </NavLink>
      <nav aria-label="Principal">
        {GRUPOS.map((g, i) => (
          <div className="sidebar__grupo" key={i}>
            {g.titulo && <div className="sidebar__grupo-titulo etiqueta">{g.titulo}</div>}
            {g.links.map((l) => {
              const on = activo(pathname, l.to, l.match);
              return (
                <NavLink key={l.to} to={l.to} className={`sidebar__link${on ? ' is-activo' : ''}`} aria-current={on ? 'page' : undefined} title={l.label}>
                  <Icon name={l.icon} size={20} />
                  <span className="sidebar__label">{l.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar__espacio" />
      <div className="sidebar__cuenta">
        <span className="avatar"><Icon name="usuario" size={18} /></span>
        <span className="sidebar__cuenta-texto ellipsis" title={u?.email}>{u?.nombre ?? 'Mi cuenta'}</span>
        <IconButton icon="candado" label="Cambiar contraseña" onClick={() => password.abrir()} />
        <IconButton icon="salir" label="Cerrar sesión" onClick={cerrar} />
      </div>
      <ModalPassword abierto={password.abierto} onCerrar={password.cerrar} />
    </aside>
  );
}

const MAS = ['/mas', '/insumos', '/recetas', '/compras', '/resumen', '/costos'];

function BottomNav() {
  const { pathname } = useLocation();
  const is = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));
  const item = (to: string, label: string, icon: IconName, on: boolean) => (
    <NavLink to={to} className={on ? 'is-activo' : ''} aria-current={on ? 'page' : undefined}>
      <Icon name={icon} size={24} stroke={on ? 2 : 1.75} />
      <span className="bn-label">{label}</span>
    </NavLink>
  );
  return (
    <nav className="bottomnav" aria-label="Principal">
      {item('/', 'Inicio', 'inicio', is('/'))}
      {item('/pedidos', 'Pedidos', 'pedidos', is('/pedidos'))}
      <NavLink to="/presupuestos/nuevo" className="bn-centro">
        <span className="bn-fab"><Icon name="sumar" size={24} stroke={2.25} /></span>
        <span className="bn-label">Presupuesto</span>
      </NavLink>
      {item('/catalogo', 'Catálogo', 'torta', is('/catalogo'))}
      {item('/mas', 'Más', 'mas', MAS.some(is))}
    </nav>
  );
}

/** Muestra el contenido solo con sesión iniciada; si no, manda al login. */
export function SesionGate({ children }: { children: ReactNode }) {
  const sesion = useUsuario();
  if (sesion.isPending) return <div className="page"><p className="sec">Cargando…</p></div>;
  if (sesion.error) {
    if (sesion.error instanceof ApiError && sesion.error.status === 401) return <Navigate to="/login" replace />;
    return <div className="page"><p className="error-msg">{sesion.error.message}</p></div>;
  }
  return <>{children}</>;
}

export function Layout() {
  return <SesionGate><Shell /></SesionGate>;
}

function Shell() {
  const { pathname } = useLocation();
  const conBarra = /^\/presupuestos\/(nuevo|\d+)$/.test(pathname);
  return (
    <div className="shell">
      <Sidebar />
      <main className={conBarra ? 'shell__main--conbarra shell__main' : 'shell__main'}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

/* Cabeceras de página */
export function MobileHeader({ title, back, action }: { title: string; back?: string | true; action?: ReactNode }) {
  const navigate = useNavigate();
  if (back) {
    return (
      <header className="mhead mhead--volver">
        <IconButton icon="volver" label="Volver" onClick={() => (back === true ? navigate(-1) : navigate(back))} />
        <h1 className="grow">{title}</h1>
        {action}
      </header>
    );
  }
  return <header className="mhead"><h1>{title}</h1>{action ?? <Campana size={24} />}</header>;
}

export function DesktopHeader({ title, sub, miga, children }: { title: string; sub?: ReactNode; miga?: string; children?: ReactNode }) {
  return (
    <header className="dhead">
      <div>
        {miga && <div className="dhead__miga">{miga}</div>}
        <h1>{title}</h1>
        {sub && <div className="sec">{sub}</div>}
      </div>
      <div className="dhead__acciones">
        <Campana />
        {children}
      </div>
    </header>
  );
}
