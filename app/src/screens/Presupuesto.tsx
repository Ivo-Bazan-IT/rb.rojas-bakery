import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Avisos, Button, Card, Cargando, Chip, ErrorMsg, Field, Segmented, Select, Vacio } from '../components/ui';
import { Icon } from '../components/Icon';
import { CampoFoto } from '../components/CampoFoto';
import { ConfirmarCancelar, ConfirmarEliminar } from '../modales/ConfirmarPresupuesto';
import { Confirmar, avisar, useModal } from '../components/Modal';
import {
  useAccionPresupuesto, useCotizacion, useEnvios, useExtras, useGuardarPresupuesto, usePresupuesto, useProductos,
} from '../api/hooks';
import type { Forrado, Presupuesto as P, Tamano } from '../api/tipos';
import { duracion, num, pesos } from '../lib/formato';

const PORCIONES: Record<Tamano, string> = { 18: '25–28', 20: '30–35', 22: '40–45' };

interface Form {
  clienteNombre: string; clienteTelefono: string; direccion: string; fechaEntrega: string; horaEntrega: string;
  productoId: number | null; tamano: Tamano; forrado: Forrado | null; cantidad: number; detalle: string;
  extras: number[]; zonaEnvioId: number | null;
}
const VACIO: Form = {
  clienteNombre: '', clienteTelefono: '', direccion: '', fechaEntrega: '', horaEntrega: '',
  productoId: null, tamano: 20, forrado: null, cantidad: 12, detalle: '', extras: [], zonaEnvioId: null,
};
const desde = (p: P): Form => ({
  clienteNombre: p.clienteNombre, clienteTelefono: p.clienteTelefono, direccion: p.direccion, fechaEntrega: p.fechaEntrega ?? '',
  horaEntrega: p.horaEntrega, productoId: p.productoId, tamano: p.tamano ?? 20, forrado: p.forrado, cantidad: p.cantidad ?? 12,
  detalle: p.detalle, extras: p.calculo?.extras?.map((e) => e.id) ?? [], zonaEnvioId: p.zonaEnvioId,
});

export default function Presupuesto() {
  const { id: idParam } = useParams();
  const id = idParam && idParam !== 'nuevo' ? Number(idParam) : null;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const existente = usePresupuesto(id);
  const productos = useProductos();
  const extras = useExtras();
  const envios = useEnvios();
  const guardar = useGuardarPresupuesto();
  const enviar = useAccionPresupuesto('enviar');
  const duplicar = useAccionPresupuesto('duplicar');
  const reactivar = useAccionPresupuesto('reactivar');
  const cancelarM = useModal();
  const eliminarM = useModal();
  const [f, setF] = useState<Form>(VACIO);
  const [cargado, setCargado] = useState<number | null>(null);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  // Al abrir un presupuesto guardado, se carga en el formulario una sola vez.
  useEffect(() => {
    if (existente.data && cargado !== existente.data.id) { setF(desde(existente.data)); setCargado(existente.data.id); }
  }, [existente.data, cargado]);
  // "Presupuestar este producto" desde el catálogo llega con ?producto=id.
  useEffect(() => {
    const pid = Number(params.get('producto'));
    const p = productos.data?.find((x) => x.id === pid);
    if (!id && p && f.productoId == null) {
      const fs = (['buttercream', 'pasta'] as Forrado[]).filter((x) => p.recetas.some((r) => r.rol === `forrado_${x}`));
      set({ productoId: p.id, forrado: fs[0] ?? null });
    }
  }, [params, productos.data, id, f.productoId]);
  // Entrega por defecto: "Retira el cliente".
  useEffect(() => {
    if (!id && f.zonaEnvioId == null && envios.data?.length) set({ zonaEnvioId: (envios.data.find((e) => e.esRetiro) ?? envios.data[0])!.id });
  }, [envios.data, id, f.zonaEnvioId]);

  const producto = productos.data?.find((p) => p.id === f.productoId) ?? null;
  const forrados = (['buttercream', 'pasta'] as Forrado[]).filter((x) => producto?.recetas.some((r) => r.rol === `forrado_${x}`));
  const bloqueado = !!existente.data && existente.data.estado !== 'borrador';

  const opciones = useMemo(() => (producto ? {
    productoId: producto.id,
    tamano: producto.tipo === 'torta' ? f.tamano : null,
    forrado: producto.tipo === 'torta' ? (f.forrado ?? forrados[0] ?? null) : null,
    cantidad: producto.tipo === 'mesa_dulce' ? f.cantidad : null,
    extras: f.extras, zonaEnvioId: f.zonaEnvioId,
  } : null), [producto, f.tamano, f.forrado, f.cantidad, f.extras, f.zonaEnvioId, forrados]);
  const cot = useCotizacion(bloqueado ? null : opciones);
  const c = cot.data;

  const cuerpo = () => ({
    ...f, fechaEntrega: f.fechaEntrega || null, productoId: f.productoId,
    tamano: producto?.tipo === 'torta' ? f.tamano : null,
    forrado: producto?.tipo === 'torta' ? (f.forrado ?? forrados[0] ?? null) : null,
    cantidad: producto?.tipo === 'mesa_dulce' ? f.cantidad : null,
  });
  const onGuardar = () => guardar.mutate({ id, ...cuerpo() }, { onSuccess: (p) => { avisar('Presupuesto guardado'); if (!id) navigate(`/presupuestos/${p.id}`, { replace: true }); } });
  const confirmarPdf = useModal();
  const onPdf = () => {
    if (bloqueado) { navigate(`/presupuestos/${id}/pdf`); return; }
    confirmarPdf.abrir();
  };
  const generarPdf = async () => {
    const p = await guardar.mutateAsync({ id, ...cuerpo() });
    await enviar.mutateAsync(p.id);
    navigate(`/presupuestos/${p.id}/pdf`);
  };
  const onDuplicar = () => duplicar.mutate(id!, { onSuccess: (p) => { avisar(`Copia creada: #${p.numeroLabel}`); navigate(`/presupuestos/${p.id}`); } });
  const ocupado = guardar.isPending || enviar.isPending;
  const numero = existente.data ? `#${existente.data.numeroLabel}` : 'Nuevo';
  const titulo = id ? `Presupuesto ${numero}` : 'Nuevo presupuesto';

  if (id && existente.isPending) return <div className="page"><Cargando /></div>;
  if (id && existente.error) return <div className="page"><ErrorMsg error={existente.error} /></div>;

  const cliente = (
    <Card as="section">
      <h2>Cliente</h2>
      <div className="form-grid">
        <Field id="c1" label="Nombre" value={f.clienteNombre} disabled={bloqueado} onChange={(e) => set({ clienteNombre: e.target.value })} />
        <Field id="c2" label="WhatsApp" value={f.clienteTelefono} inputMode="tel" disabled={bloqueado} onChange={(e) => set({ clienteTelefono: e.target.value })} />
        <Field id="c3" label="Fecha de entrega" type="date" value={f.fechaEntrega} disabled={bloqueado} onChange={(e) => set({ fechaEntrega: e.target.value })} />
        <Field id="c4" label="Hora" type="time" value={f.horaEntrega} disabled={bloqueado} onChange={(e) => set({ horaEntrega: e.target.value })} />
      </div>
      <Select id="c5" label="Entrega" value={String(f.zonaEnvioId ?? '')} onChange={(v) => set({ zonaEnvioId: Number(v) || null })}
        options={(envios.data ?? []).map((e) => ({
          value: String(e.id),
          label: e.esRetiro ? e.nombre : e.precio == null ? `Envío · ${e.nombre} (precio sin cargar)` : `Envío · ${e.nombre} (${pesos(e.precio)})`,
        }))} />
      {!envios.data?.find((e) => e.id === f.zonaEnvioId)?.esRetiro && (
        <Field id="c7" label="Dirección" value={f.direccion} disabled={bloqueado} onChange={(e) => set({ direccion: e.target.value })} />
      )}
    </Card>
  );

  const productoCard = (
    <Card as="section">
      <h2>Producto</h2>
      {productos.data && productos.data.length === 0 ? (
        <Vacio titulo="Todavía no hay productos" accion={<Button variant="soft" to="/catalogo">Ir al catálogo</Button>}>
          Cargá insumos, recetas base y productos para poder presupuestar.
        </Vacio>
      ) : (
        <Select id="c6" label="Producto del catálogo" value={String(f.productoId ?? '')}
          onChange={(v) => {
            const p = productos.data?.find((x) => x.id === Number(v));
            const fs = (['buttercream', 'pasta'] as Forrado[]).filter((x) => p?.recetas.some((r) => r.rol === `forrado_${x}`));
            set({ productoId: p?.id ?? null, forrado: fs[0] ?? null });
          }}
          options={[{ value: '', label: 'Elegí un producto' }, ...(productos.data ?? []).map((p) => ({ value: String(p.id), label: `${p.nombre} · ${p.tipoLabel}` }))]} />
      )}
      {producto?.tipo === 'torta' && (
        <div className="field">
          <span className="field__label">Tamaño</span>
          <div className="chips" role="group" aria-label="Tamaño">
            {([18, 20, 22] as Tamano[]).map((t) => (
              <Chip key={t} active={f.tamano === t} onClick={() => !bloqueado && set({ tamano: t })}>{t} cm · {PORCIONES[t]} porc.</Chip>
            ))}
          </div>
        </div>
      )}
      {producto?.tipo === 'torta' && forrados.length > 1 && (
        <div className="field">
          <span className="field__label">Forrado</span>
          <Segmented<Forrado> label="Forrado" value={f.forrado ?? forrados[0]!} onChange={(v) => !bloqueado && set({ forrado: v })}
            options={[{ value: 'buttercream', label: 'Buttercream' }, { value: 'pasta', label: 'Pasta' }]} />
        </div>
      )}
      {producto?.tipo === 'mesa_dulce' && (
        <Field id="c8" label="Cantidad (4 a 36)" type="number" min={4} max={36} suffix="u" value={f.cantidad} disabled={bloqueado}
          onChange={(e) => set({ cantidad: Math.max(0, Math.min(36, Number(e.target.value) || 0)) })} />
      )}
      <div className="field">
        <span className="field__label">Extras (precio final)</span>
        {extras.data?.length ? (
          <div className="chips" role="group" aria-label="Extras">
            {extras.data.map((e) => {
              const on = f.extras.includes(e.id);
              return <Chip key={e.id} active={on} onClick={() => !bloqueado && set({ extras: on ? f.extras.filter((x) => x !== e.id) : [...f.extras, e.id] })}>{e.nombre} · {pesos(e.precio)}</Chip>;
            })}
          </div>
        ) : <span className="sec">No hay extras cargados. Se agregan en Costos y ajustes → Tarifarios.</span>}
      </div>
    </Card>
  );

  const detalle = (
    <Card as="section">
      <h2>Detalle para el cliente</h2>
      <Field id="n1" label="Sabores y decoración" value={f.detalle} disabled={bloqueado} onChange={(e) => set({ detalle: e.target.value })} />
    </Card>
  );

  // Para subir la foto el presupuesto tiene que existir: si es nuevo, se guarda primero.
  const prepararId = async () => {
    const p = await guardar.mutateAsync({ id, ...cuerpo() });
    if (!id) navigate(`/presupuestos/${p.id}`, { replace: true });
    return p.id;
  };
  const foto = (
    <Card as="section" className="o-foto">
      <h2>Foto de referencia del cliente</h2>
      <CampoFoto recurso="presupuestos" id={id ?? undefined} url={existente.data?.fotoReferenciaUrl} alt="foto de referencia" clase="foto-ref__img"
        bloqueada={bloqueado} prepararId={prepararId} ayuda="La que te mandó el cliente. Sale en el PDF del presupuesto." />
    </Card>
  );

  // Si el presupuesto ya se envió, se muestran los montos congelados.
  const k = bloqueado ? existente.data!.calculo : c?.calculo;
  const total = bloqueado ? existente.data!.total : c?.total;
  const sena = bloqueado ? existente.data!.sena : c?.sena;
  const senaPct = bloqueado ? existente.data!.senaPct : c?.senaPct;
  const lineasExtra = bloqueado
    ? existente.data!.lineas.filter((l) => l.tipo !== 'producto').map((l) => ({ id: l.id, nombre: l.descripcion, precio: l.precio }))
    : [...(c?.extras ?? []), ...(c?.envio ? [{ id: -1, nombre: c.envio.esRetiro ? 'Retira el cliente' : `Envío ${c.envio.nombre}`, precio: c.envio.precio }] : [])];

  const calculo = (
    <Card as="section" className="o-calc">
      <h2>Cálculo</h2>
      {!producto && !bloqueado && <p className="sec">Elegí un producto para ver el cálculo.</p>}
      <ErrorMsg error={cot.error} />
      {k && (
        <>
          <Avisos avisos={k.avisos} />
          <div className="desglose">
            <div className="fila"><span>Ingredientes</span><span>{pesos(k.ingredientes)}</span></div>
            <div className="fila"><span>Servicios: luz, gas, agua ({duracion(k.trabajoMin)} trabajo · {duracion(k.hornoMin)} horno)</span><span>{pesos(k.servicios)}</span></div>
            <div className="fila"><span>Gastos del negocio</span><span>{pesos(k.gastosNegocio)}</span></div>
            <div className="fila"><span>Mano de obra ({duracion(k.trabajoMin)}{k.trabajoMin > 0 && k.manoDeObra > 0 ? ` × ${pesos(k.manoDeObra / (k.trabajoMin / 60))} la hora` : ''})</span><span>{pesos(k.manoDeObra)}</span></div>
            <div className="divisor" />
            <div className="fila fuerte"><span>Costo total</span><span>{pesos(k.costoTotal)}</span></div>
            <div className="fila"><span>Ganancia {num(c?.contexto.margenPct ?? existente.data?.calculo?.contexto?.margenPct ?? 30)}%</span><span>{pesos(k.ganancia)}</span></div>
            <div className="fila fuerte"><span>Producto (redondeado)</span><span>{pesos(k.precio)}</span></div>
            {lineasExtra.map((e) => <div className="fila" key={e.id}><span>{e.nombre}</span><span>{pesos(e.precio)}</span></div>)}
          </div>
          <div className="total-caja">
            <div className="fila"><span className="strong">Total al cliente</span><span className="total-caja__monto">{pesos(total)}</span></div>
            <div className="fila sec-14"><span>Seña {num(senaPct ?? 0)}%</span><span>{pesos(sena)}</span></div>
            {k.porPorcion != null && (
              <div className="fila sec-14">
                <span>{k.unidades ? 'Por unidad' : 'Por porción (referencia)'}</span>
                <span>{k.unidades ? `$${num(k.porPorcion / 100, 2)}` : `${pesos(k.porPorcion)} · ÷ ${k.porciones?.[0]}`}</span>
              </div>
            )}
          </div>
        </>
      )}
      <div className="nota"><Icon name="candado" size={16} />El desglose es solo para vos. No sale en el PDF.</div>
    </Card>
  );

  return (
    <>
      <MobileHeader title={titulo} back="/presupuestos" />
      <div className="page">
        <DesktopHeader title={titulo} miga="Presupuestos" sub={existente.data ? `${numero} · ${({ borrador: 'borrador', enviado: 'enviado, precios congelados', vencido: 'vencido, precios congelados', convertido: 'ya es un pedido', cancelado: 'cancelado' } as const)[existente.data.estadoVista]}` : 'Borrador sin guardar'}>
          {!bloqueado && <Button variant="secondary" onClick={onGuardar} disabled={ocupado}>Guardar</Button>}
          {bloqueado && <Button variant="secondary" icon="copiar" onClick={onDuplicar} disabled={duplicar.isPending}>Duplicar</Button>}
          <Button icon="descargar" onClick={onPdf} disabled={ocupado || (!bloqueado && !producto)}>{bloqueado ? 'Ver PDF' : 'Generar PDF'}</Button>
        </DesktopHeader>
        {bloqueado && (() => {
          const e = existente.data!;
          const titulo = e.estado === 'convertido' ? 'Este presupuesto ya es un pedido'
            : e.estado === 'cancelado' ? 'Este presupuesto está cancelado' : 'Este presupuesto ya se envió';
          const texto = e.estado === 'convertido' ? 'Para cancelarlo, cambiá el estado del pedido en Pedidos.'
            : e.estado === 'cancelado' ? 'El cliente no siguió. Si vuelve, reactivalo con los mismos precios.'
              : 'Sus precios quedaron congelados. Para cambiarlo, duplicalo.';
          return (
            <div className="alerta" role="status">
              <Icon name={e.estado === 'cancelado' ? 'cerrar' : 'candado'} size={20} />
              <div className="alerta__texto col" style={{ gap: 8 }}>
                <div>
                  <div className="strong">{titulo}</div>
                  <div className="sec">{texto} <Link to={e.estado === 'convertido' ? '/pedidos' : `/presupuestos/${id}/pdf`}>{e.estado === 'convertido' ? 'Ir a Pedidos' : 'Ver PDF'}</Link></div>
                </div>
                {e.estado !== 'convertido' && (
                  <div className="fila" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    {e.estado === 'cancelado'
                      ? <Button variant="soft" icon="volver" disabled={reactivar.isPending}
                        onClick={() => reactivar.mutate(e.id, { onSuccess: () => avisar('Presupuesto reactivado') })}>Reactivar</Button>
                      : <Button variant="secondary" icon="cerrar" onClick={() => cancelarM.abrir()}>Cancelar presupuesto</Button>}
                    <Button variant="ghost" icon="basura" onClick={() => eliminarM.abrir()}>Eliminar</Button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {!bloqueado && existente.data && (
          <div><Button variant="ghost" icon="basura" onClick={() => eliminarM.abrir()}>Eliminar borrador</Button></div>
        )}
        <ErrorMsg error={guardar.error ?? enviar.error ?? duplicar.error ?? reactivar.error} />
        <div className="presu-cols">
          <div className="col presu-form" style={{ gap: 'var(--rb-space-6)' }}>
            {cliente}{productoCard}{detalle}
          </div>
          <div className="col presu-lado" style={{ gap: 'var(--rb-space-6)' }}>
            {calculo}{foto}
          </div>
        </div>
      </div>
      <div className="barra-total">
        <div className="grow"><div className="sec">Total</div><div className="barra-total__monto">{pesos(total ?? 0)}</div></div>
        {!bloqueado && <Button variant="secondary" onClick={onGuardar} disabled={ocupado}>Guardar</Button>}
        <Button icon="descargar" onClick={onPdf} disabled={ocupado || (!bloqueado && !producto)}>{bloqueado ? 'PDF' : 'Generar PDF'}</Button>
      </div>
      <ConfirmarCancelar abierto={cancelarM.abierto} onCerrar={cancelarM.cerrar} p={existente.data} />
      <ConfirmarEliminar abierto={eliminarM.abierto} onCerrar={eliminarM.cerrar} p={existente.data} onListo={() => navigate('/presupuestos', { replace: true })} />
      <Confirmar abierto={confirmarPdf.abierto} onCerrar={confirmarPdf.cerrar} titulo="¿Generar el PDF?" accion="Generar PDF" icono="candado" onConfirmar={generarPdf}>
        <p>El presupuesto pasa a <strong>enviado</strong> y sus precios quedan congelados{total != null ? <> en <strong>{pesos(total)}</strong></> : null}.</p>
        <p className="sec">Si después cambia un costo, este presupuesto no se modifica. Para cambiarlo vas a poder duplicarlo.</p>
      </Confirmar>
    </>
  );
}
