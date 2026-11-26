import { DesktopHeader, MobileHeader, useCerrarSesion } from '../components/Layout';
import { Card, ListItem } from '../components/ui';
import { useModal } from '../components/Modal';
import { ModalNegocio } from '../modales/ModalesCostos';
import { ModalPassword } from '../modales/ModalPassword';

/* "Más" en el celular: lo que en la PC está en el menú lateral. */
export default function Mas() {
  const cerrar = useCerrarSesion();
  const negocio = useModal();
  const password = useModal();
  return (
    <>
      <MobileHeader title="Más" />
      <div className="page">
        <DesktopHeader title="Más" />
        <Card>
          <div className="lista">
            <ListItem icon="presupuesto" title="Presupuestos" chevron to="/presupuestos" />
            <ListItem icon="insumo" title="Insumos" chevron to="/insumos" />
            <ListItem icon="receta" title="Recetas base" chevron to="/recetas" />
            <ListItem icon="carrito" title="Lista de compras" chevron to="/compras" />
            <ListItem icon="resumen" title="Resumen mensual" chevron to="/resumen" />
            <ListItem icon="ajustes" title="Costos y ajustes" chevron to="/costos" />
            <ListItem icon="usuario" title="Datos del negocio" detail="WhatsApp, alias, CBU y condiciones del PDF" chevron onClick={() => negocio.abrir()} />
            <ListItem icon="candado" title="Cambiar contraseña" chevron onClick={() => password.abrir()} />
            <ListItem icon="salir" title="Cerrar sesión" chevron onClick={cerrar} />
          </div>
        </Card>
      </div>
      <ModalNegocio abierto={negocio.abierto} onCerrar={negocio.cerrar} />
      <ModalPassword abierto={password.abierto} onCerrar={password.cerrar} />
    </>
  );
}
