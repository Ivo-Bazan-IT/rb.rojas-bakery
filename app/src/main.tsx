import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './design/tokens.css';
import './design/tokens-extra.css';
import './styles/app.css';
import './styles/screens.css';
import './styles/modales.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout, SesionGate } from './components/Layout';
import { Toasts } from './components/Modal';
import Login from './screens/Login';
import Inicio from './screens/Inicio';
import Presupuesto from './screens/Presupuesto';
import Presupuestos from './screens/Presupuestos';
import PresupuestoPdf from './screens/PresupuestoPdf';
import { PedidosAgenda, PedidosEstados } from './screens/Pedidos';
import Catalogo from './screens/Catalogo';
import Recetas from './screens/Recetas';
import Insumos from './screens/Insumos';
import Compras from './screens/Compras';
import Resumen from './screens/Resumen';
import Costos from './screens/Costos';
import Mas from './screens/Mas';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/presupuestos/:numero/pdf" element={<SesionGate><PresupuestoPdf /></SesionGate>} />
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="presupuestos" element={<Presupuestos />} />
            <Route path="presupuestos/:id" element={<Presupuesto />} />
            <Route path="pedidos" element={<PedidosEstados />} />
            <Route path="pedidos/agenda" element={<PedidosAgenda />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="catalogo/:id" element={<Catalogo />} />
            <Route path="recetas" element={<Recetas />} />
            <Route path="recetas/:id" element={<Recetas />} />
            <Route path="insumos" element={<Insumos />} />
            <Route path="insumos/:id" element={<Insumos />} />
            <Route path="compras" element={<Compras />} />
            <Route path="resumen" element={<Resumen />} />
            <Route path="costos" element={<Costos />} />
            <Route path="mas" element={<Mas />} />
            <Route path="*" element={<Inicio />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toasts />
    </QueryClientProvider>
  </StrictMode>,
);
