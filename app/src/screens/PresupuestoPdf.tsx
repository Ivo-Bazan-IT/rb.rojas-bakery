import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Cargando, ErrorMsg } from '../components/ui';
import { Icon } from '../components/Icon';
import { useDocumento } from '../api/hooks';
import { fechaNum, num, pesos } from '../lib/formato';
import logoMarca from '../design/assets/logo-rb-rojo.png';

const falta = (v: string, que: string) => v || `[${que}]`;

/* Presupuesto de pedido (A4, 794 px). Nunca muestra costos internos: usa /documento, que no los trae. */
export default function PresupuestoPdf() {
  const { numero } = useParams();
  const id = Number(numero);
  const doc = useDocumento(id);
  const wrap = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const ajustar = () => setEscala(Math.min(1, (wrap.current?.clientWidth ?? 794) / 794));
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [doc.data]);

  if (doc.isPending) return <div className="page"><Cargando /></div>;
  if (doc.error) return <div className="page"><ErrorMsg error={doc.error} /><Button variant="ghost" icon="volver" to="/presupuestos">Volver</Button></div>;

  const { presupuesto: p, negocio: n } = doc.data;
  const producto = p.lineas.find((l) => l.tipo === 'producto');
  const otras = p.lineas.filter((l) => l.tipo !== 'producto');
  const envio = p.lineas.find((l) => l.tipo === 'envio');
  const forrado = p.forrado === 'pasta' ? 'forrado de pasta de azúcar' : p.forrado === 'buttercream' ? 'forrado de buttercream' : '';
  const rinde = p.porcionesMin ? `Rinde ${p.porcionesMin} a ${p.porcionesMax} porciones` : p.cantidad ? `${p.cantidad} unidades` : '';
  const descripcion = [rinde, forrado, p.detalle].filter(Boolean).join(' · ');
  const emitido = p.emitidoAt ? fechaNum(p.emitidoAt) : fechaNum(new Date());
  const entrega = p.fechaEntrega ? `${fechaNum(p.fechaEntrega)}${p.horaEntrega ? ` · ${p.horaEntrega}` : ''}` : '[FECHA DE ENTREGA]';

  return (
    <div className="pdf-pantalla">
      <div className="pdf-toolbar">
        <Button variant="ghost" icon="volver" to={p.estado === 'borrador' ? `/presupuestos/${p.id}` : '/presupuestos'}>Volver</Button>
        <Button icon="imprimir" onClick={() => window.print()}>Imprimir o guardar PDF</Button>
      </div>
      <div className="pdf-wrap" ref={wrap} style={{ height: 1123 * escala }}>
        <article className="pdf" style={{ transform: `scale(${escala})` }} aria-label="Presupuesto de pedido">
          <header className="pdf__head">
            <img src={n.logoUrl ?? logoMarca} alt={`Logo de ${n.nombre}`} className="pdf__logo" />
            <div className="grow">
              <h1 className="pdf__titulo">Presupuesto de pedido</h1>
              <div className="pdf__contacto">{[n.instagram, n.whatsapp && `WhatsApp ${n.whatsapp}`, n.zona].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="pdf__numero"><span>N.º</span><strong>{p.numeroLabel}</strong></div>
          </header>
          <svg className="pdf__ola" aria-hidden="true" width="794" height="24" viewBox="0 0 794 24" preserveAspectRatio="none">
            <path d="M0 0 H794 V12 C 700 24, 560 0, 397 12 S 100 24, 0 12 Z" />
          </svg>

          <div className="pdf__cuerpo">
            <div className="pdf__tres">
              <div><div className="etiqueta">Cliente</div><p className="pdf__dato">{falta(p.clienteNombre, 'NOMBRE')}</p><div className="pdf__sub">{p.clienteTelefono}</div></div>
              <div><div className="etiqueta">Entrega</div><p className="pdf__dato">{entrega}</p>
                <div className="pdf__sub">{envio ? (envio.descripcion === 'Retira el cliente' ? 'Retira el cliente' : `${envio.descripcion}${p.direccion ? ` · ${p.direccion}` : ''}`) : ''}</div></div>
              <div><div className="etiqueta">Emitido</div><p className="pdf__dato">{emitido}</p>
                <div className="pdf__sub">{p.validoHasta ? `Válido hasta el ${fechaNum(p.validoHasta)}` : `Válido por ${n.validezDias} días`}</div></div>
            </div>

            <div className="pdf__detalle">
              <div className="grow">
                <div className="etiqueta">Detalle del pedido</div>
                {producto && (
                  <div className="pdf__linea">
                    <div className="grow">
                      <div className="pdf__item">{producto.descripcion}</div>
                      {descripcion && <div className="pdf__sub">{descripcion}</div>}
                    </div>
                    <div className="pdf__item tab">{pesos(producto.precio)}</div>
                  </div>
                )}
                {otras.map((l) => (
                  <div className="pdf__linea" key={l.id}><div className="pdf__item grow">{l.descripcion}</div><div className="pdf__item tab">{pesos(l.precio)}</div></div>
                ))}
              </div>
              <div className="pdf__foto">
                <div className="etiqueta">Foto de referencia</div>
                {p.fotoReferenciaUrl
                  ? <img src={p.fotoReferenciaUrl} alt="Foto de referencia enviada por el cliente" className="pdf__foto-img" />
                  : <div role="img" aria-label="Sin foto de referencia" className="pdf__foto-img"><Icon name="imagen" size={36} /></div>}
                <div className="pdf__sub">{p.fotoReferenciaUrl ? 'Foto enviada por el cliente' : 'Sin foto de referencia'}</div>
              </div>
            </div>

            <div className="pdf__dos">
              <div className="pdf__total">
                <div className="fila"><span className="pdf__total-label">Total</span><span className="pdf__total-monto">{pesos(p.total)}</span></div>
                <div className="fila strong"><span>Seña para confirmar ({num(p.senaPct)}%)</span><span className="tab">{pesos(p.sena)}</span></div>
                <div className="fila pdf__gris"><span>Saldo a la entrega</span><span className="tab">{pesos(p.saldo)}</span></div>
                {p.porPorcion != null && (
                  <div className="fila pdf__gris"><span>{p.cantidad ? 'Precio por unidad' : 'Precio por porción de referencia'}</span>
                    <span className="tab">{p.cantidad ? `$${num(p.porPorcion / 100, 2)}` : pesos(p.porPorcion)}</span></div>
                )}
              </div>
              <div className="pdf__pago">
                <div className="etiqueta">Medios de pago</div>
                <p className="pdf__dato">{falta(n.mediosPago, 'MEDIOS DE PAGO')}</p>
                <div className="pdf__sub">Alias: {falta(n.alias, 'ALIAS')} · CBU: {falta(n.cbu, 'CBU')}</div>
              </div>
            </div>

            <div className="pdf__tres">
              <div><div className="etiqueta">Validez</div><p className="pdf__texto">Este presupuesto vale {n.validezDias} días. Pasado ese plazo, los precios pueden cambiar.</p></div>
              <div><div className="etiqueta">Cancelaciones y cambios</div><p className="pdf__texto">{falta(n.politicas, 'POLÍTICA DE CANCELACIÓN')}</p></div>
              <div><div className="etiqueta">Cuidados</div><p className="pdf__texto">{falta(n.cuidados, 'CUIDADOS')}</p></div>
            </div>
          </div>

          <footer className="pdf__pie">
            <span className="pdf__gracias">Gracias por elegir {n.nombre || 'Rojas Bakery'}.</span>
            <span>Presupuesto de pedido · no válido como factura</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
