import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, ErrorMsg, Field } from '../components/ui';
import { useLogin, useUsuario } from '../api/hooks';
import { Modal, useModal } from '../components/Modal';
import { Icon } from '../components/Icon';
import logo from '../design/assets/logo-rb-rojo.png';

export default function Login() {
  const navigate = useNavigate();
  const sesion = useUsuario();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const olvide = useModal();

  if (sesion.data) return <Navigate to="/" replace />;

  return (
    <div className="login">
      <div className="login__marca">
        <img src={logo} alt="Rojas Bakery, pastelería creativa" className="login__logo" />
        <p className="login__lema solo-desktop">Costos, presupuestos y pedidos, todo en un mismo lugar.</p>
      </div>
      <svg className="login__ola solo-mobile" aria-hidden="true" width="100%" height="24" viewBox="0 0 390 24" preserveAspectRatio="none">
        <path d="M0 12 C 32 0, 65 0, 97 12 S 162 24, 195 12 S 260 0, 292 12 S 357 24, 390 12 V24 H0 Z" />
      </svg>
      <div className="login__panel">
        <form className="login__form" onSubmit={(e) => {
          e.preventDefault();
          login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) });
        }}>
          <div className="col" style={{ gap: 4 }}>
            <h1 className="login__titulo">¡Hola de nuevo!</h1>
            <p className="sec login__sub">Ingresá para ver tus pedidos y presupuestos.</p>
          </div>
          <Field id="u1" label="Email" placeholder="Tu email" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field id="p1" label="Contraseña" placeholder="Tu contraseña" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorMsg error={login.error} />
          <Button type="submit" block disabled={login.isPending}>{login.isPending ? 'Ingresando…' : 'Ingresar'}</Button>
          <button type="button" className="login__olvide btn--link" onClick={() => olvide.abrir()}>Olvidé mi contraseña</button>
        </form>
      </div>
      <Modal abierto={olvide.abierto} onCerrar={olvide.cerrar} tamano="chico" titulo="¿Olvidaste tu contraseña?"
        pie={<Button onClick={olvide.cerrar}>Entendido</Button>}>
        <div className="confirmar">
          <span className="confirmar__icono"><Icon name="candado" size={26} /></span>
          <div className="confirmar__texto">
            <p>Por ahora la app tiene una sola cuenta y la contraseña no se puede recuperar por email.</p>
            <p className="sec">Pedile a quien te instaló la app que la restablezca. Mientras tanto, revisá mayúsculas y que el email esté bien escrito.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
