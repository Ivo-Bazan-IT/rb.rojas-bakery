/* Costos y ajustes: gastos fijos, equipos, extras, zonas de envío y datos del negocio. */
import { useEffect, useState } from 'react';
import { ErrorMsg, Field, Segmented } from '../components/ui';
import { Area, Confirmar, Modal, PieFormulario, avisar, useModal } from '../components/Modal';
import {
  useBorrarEnvio, useBorrarEquipo, useBorrarExtra, useBorrarGasto, useEnvios, useGuardarEnvio, useGuardarEquipo, useGuardarExtra,
  useGuardarGasto, useGuardarNegocio, useNegocio,
} from '../api/hooks';
import type { Equipo, Extra, Gasto, Negocio, ZonaEnvio } from '../api/tipos';
import { leerNumero, leerPesos, num, pesos } from '../lib/formato';
import { CampoFoto } from '../components/CampoFoto';

const aPesos = (c: number | null | undefined) => (c == null ? '' : num(c / 100, c % 100 ? 2 : 0));

/** Confirmación de borrado de los catálogos simples (sin archivo). */
function useBorrado(borrar: { mutateAsync: (id: number) => Promise<unknown> }, texto: string, onListo: () => void) {
  const m = useModal<{ id: number; nombre: string }>();
  const dialogo = (
    <Confirmar abierto={m.abierto} onCerrar={m.cerrar} titulo="¿Eliminar?" accion="Eliminar"
      onConfirmar={async () => { await borrar.mutateAsync(m.item!.id); avisar(texto); onListo(); }}>
      <p>Se borra <strong>{m.item?.nombre}</strong>.</p>
      <p className="sec">Los presupuestos ya enviados no cambian: guardaron sus montos.</p>
    </Confirmar>
  );
  return { pedir: (id: number, nombre: string) => m.abrir({ id, nombre }), dialogo };
}

// ---------- Gasto fijo ----------
export function ModalGasto({ abierto, onCerrar, gasto, tipo = 'compartido' }: { abierto: boolean; onCerrar: () => void; gasto?: Gasto; tipo?: Gasto['tipo'] }) {
  const ini = () => ({
    nombre: gasto?.nombre ?? '', monto: aPesos(gasto?.monto), tipo: gasto?.tipo ?? tipo, factor: gasto ? num(gasto.factor, 2) : '1',
    usaHoras: gasto?.usaHoras ?? 'trabajo', detalle: gasto?.detalle ?? '',
  });
  const [f, setF] = useState(ini);
  const guardar = useGuardarGasto();
  const borrado = useBorrado(useBorrarGasto(), 'Gasto eliminado', onCerrar);
  useEffect(() => { if (abierto) { setF(ini()); guardar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (d: Partial<typeof f>) => setF((x) => ({ ...x, ...d }));
  const compartido = f.tipo === 'compartido';

  const enviar = () => guardar.mutate({
    id: gasto?.id, nombre: f.nombre.trim(), monto: leerPesos(f.monto), tipo: f.tipo,
    factor: compartido ? leerNumero(f.factor) : 1, usaHoras: compartido ? f.usaHoras : 'trabajo', detalle: f.detalle.trim(),
  }, { onSuccess: () => { avisar(gasto ? 'Gasto guardado' : 'Gasto agregado'); onCerrar(); } });

  return (
    <>
      <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} titulo={gasto ? 'Editar gasto' : 'Nuevo gasto'} sub="Monto mensual. Actualizalo cuando llegue la factura."
        pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!f.nombre.trim() && !!f.monto.trim()}
          textoGuardar={gasto ? 'Guardar' : 'Agregar gasto'} onEliminar={gasto ? () => borrado.pedir(gasto.id, gasto.nombre) : undefined} />}>
        <div className="field">
          <span className="field__label">Tipo</span>
          <Segmented<Gasto['tipo']> label="Tipo de gasto" value={f.tipo} onChange={(t) => set({ tipo: t })}
            options={[{ value: 'compartido', label: 'Compartido con la casa' }, { value: 'exclusivo', label: 'Del negocio' }]} />
          <div className="field__ayuda">{compartido
            ? 'Luz, gas, agua, internet: se reparten por las horas que usa cada pedido.'
            : 'Monotributo, contador, publicidad: se reparten entre las horas laborales del mes.'}</div>
        </div>
        <Field id="mg1" label="Nombre" value={f.nombre} placeholder={compartido ? 'Ej.: Luz' : 'Ej.: Monotributo'} autoFocus onChange={(e) => set({ nombre: e.target.value })} />
        <Field id="mg2" label="Monto por mes" prefix="$" inputMode="decimal" value={f.monto} placeholder="0" onChange={(e) => set({ monto: e.target.value })} />
        {compartido ? (
          <>
            <div className="field">
              <span className="field__label">Se reparte por</span>
              <Segmented<Gasto['usaHoras']> label="Horas" value={f.usaHoras} onChange={(u) => set({ usaHoras: u })}
                options={[{ value: 'trabajo', label: 'Horas de trabajo' }, { value: 'horno', label: 'Horas de horno' }]} />
              <div className="field__ayuda">El gas del horno va por <strong>horas de horno</strong>. Luz, agua e internet, por horas de trabajo.</div>
            </div>
            <Field id="mg3" label="Factor de intensidad" prefix="×" inputMode="decimal" value={f.factor}
              help="Cuánto más se usa mientras trabajás. 1 = normal. Ej.: luz × 1,5 por batidora y heladera." onChange={(e) => set({ factor: e.target.value })} />
          </>
        ) : (
          <Field id="mg4" label="Detalle" value={f.detalle} placeholder="Opcional. Ej.: categoría A" onChange={(e) => set({ detalle: e.target.value })} />
        )}
        <ErrorMsg error={guardar.error} />
      </Modal>
      {borrado.dialogo}
    </>
  );
}

// ---------- Equipo ----------
export function ModalEquipo({ abierto, onCerrar, equipo }: { abierto: boolean; onCerrar: () => void; equipo?: Equipo }) {
  const ini = () => ({ nombre: equipo?.nombre ?? '', valor: aPesos(equipo?.valor), vida: equipo ? num(equipo.vidaUtilAnios, 1) : '' });
  const [f, setF] = useState(ini);
  const guardar = useGuardarEquipo();
  const borrado = useBorrado(useBorrarEquipo(), 'Equipo eliminado', onCerrar);
  useEffect(() => { if (abierto) { setF(ini()); guardar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (d: Partial<typeof f>) => setF((x) => ({ ...x, ...d }));
  const vida = leerNumero(f.vida);
  const amort = vida > 0 ? leerPesos(f.valor) / (vida * 12) : 0;

  const enviar = () => guardar.mutate({ id: equipo?.id, nombre: f.nombre.trim(), valor: leerPesos(f.valor), vidaUtilAnios: vida },
    { onSuccess: () => { avisar(equipo ? 'Equipo guardado' : 'Equipo agregado'); onCerrar(); } });

  return (
    <>
      <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} titulo={equipo ? 'Editar equipo' : 'Nuevo equipo'} sub="Su desgaste se suma a los gastos del negocio cada mes."
        pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!f.nombre.trim() && vida > 0}
          textoGuardar={equipo ? 'Guardar' : 'Agregar equipo'} onEliminar={equipo ? () => borrado.pedir(equipo.id, equipo.nombre) : undefined} />}>
        <Field id="me1" label="Nombre" value={f.nombre} placeholder="Ej.: Horno eléctrico" autoFocus onChange={(e) => set({ nombre: e.target.value })} />
        <div className="grid-2">
          <Field id="me2" label="Valor actual" prefix="$" inputMode="decimal" value={f.valor} placeholder="0" help="Lo que costaría comprarlo hoy." onChange={(e) => set({ valor: e.target.value })} />
          <Field id="me3" label="Vida útil" suffix="años" inputMode="decimal" value={f.vida} placeholder="Ej.: 5" onChange={(e) => set({ vida: e.target.value })} />
        </div>
        <div className="editor-total"><span>Amortización por mes</span><span>{pesos(amort)}</span></div>
        <ErrorMsg error={guardar.error} />
      </Modal>
      {borrado.dialogo}
    </>
  );
}

// ---------- Extra ----------
export function ModalExtra({ abierto, onCerrar, extra }: { abierto: boolean; onCerrar: () => void; extra?: Extra }) {
  const ini = () => ({ nombre: extra?.nombre ?? '', precio: aPesos(extra?.precio) });
  const [f, setF] = useState(ini);
  const guardar = useGuardarExtra();
  const borrado = useBorrado(useBorrarExtra(), 'Extra eliminado', onCerrar);
  useEffect(() => { if (abierto) { setF(ini()); guardar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = () => guardar.mutate({ id: extra?.id, nombre: f.nombre.trim(), precio: leerPesos(f.precio) },
    { onSuccess: () => { avisar(extra ? 'Extra guardado' : 'Extra agregado'); onCerrar(); } });

  return (
    <>
      <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} tamano="chico" titulo={extra ? 'Editar extra' : 'Nuevo extra'} sub="Precio final al cliente, se suma tal cual al presupuesto."
        pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!f.nombre.trim() && !!f.precio.trim()}
          textoGuardar={extra ? 'Guardar' : 'Agregar extra'} onEliminar={extra ? () => borrado.pedir(extra.id, extra.nombre) : undefined} />}>
        <Field id="mx1" label="Nombre" value={f.nombre} placeholder="Ej.: Topper personalizado" autoFocus onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <Field id="mx2" label="Precio" prefix="$" inputMode="decimal" value={f.precio} placeholder="0" onChange={(e) => setF({ ...f, precio: e.target.value })} />
        <ErrorMsg error={guardar.error} />
      </Modal>
      {borrado.dialogo}
    </>
  );
}

// ---------- Zona de envío ----------
export function ModalZona({ abierto, onCerrar, zona }: { abierto: boolean; onCerrar: () => void; zona?: ZonaEnvio }) {
  const ini = () => ({ nombre: zona?.nombre ?? '', precio: aPesos(zona?.precio) });
  const [f, setF] = useState(ini);
  const envios = useEnvios();
  const guardar = useGuardarEnvio();
  const borrado = useBorrado(useBorrarEnvio(), 'Zona eliminada', onCerrar);
  useEffect(() => { if (abierto) { setF(ini()); guardar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const retiro = !!zona?.esRetiro;

  const enviar = () => guardar.mutate({
    id: zona?.id, nombre: f.nombre.trim(), precio: f.precio.trim() ? leerPesos(f.precio) : null,
    ...(zona ? {} : { orden: Math.max(0, ...(envios.data ?? []).map((e) => e.orden)) + 1 }),
  }, { onSuccess: () => { avisar(zona ? 'Zona guardada' : 'Zona agregada'); onCerrar(); } });

  return (
    <>
      <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} tamano="chico"
        titulo={retiro ? 'Retiro en el local' : zona ? `Envío a ${zona.nombre}` : 'Nueva zona de envío'} sub="Precio final al cliente."
        pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!f.nombre.trim()}
          textoGuardar={zona ? 'Guardar' : 'Agregar zona'} onEliminar={zona && !retiro ? () => borrado.pedir(zona.id, `la zona ${zona.nombre}`) : undefined} />}>
        <Field id="mz1" label={retiro ? 'Texto que ve el cliente' : 'Zona'} value={f.nombre} placeholder="Ej.: Lanús" autoFocus={!zona}
          onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <Field id="mz2" label="Precio del envío" prefix="$" inputMode="decimal" value={f.precio} placeholder="Sin precio" autoFocus={!!zona}
          help={retiro ? 'Normalmente $0.' : 'Si lo dejás vacío, no se va a poder presupuestar un envío a esta zona.'}
          onChange={(e) => setF({ ...f, precio: e.target.value })} />
        <ErrorMsg error={guardar.error} />
      </Modal>
      {borrado.dialogo}
    </>
  );
}

// ---------- Datos del negocio ----------
const CAMPOS_NEGOCIO: (keyof Negocio)[] = ['nombre', 'instagram', 'whatsapp', 'zona', 'mediosPago', 'alias', 'cbu', 'politicas', 'cuidados'];

export function ModalNegocio({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const negocio = useNegocio();
  const guardar = useGuardarNegocio();
  const aForm = (n?: Negocio) => ({ ...Object.fromEntries(CAMPOS_NEGOCIO.map((k) => [k, String(n?.[k] ?? '')])), validez: String(n?.validezDias ?? 7) }) as Record<string, string>;
  const [f, setF] = useState(() => aForm(negocio.data));
  useEffect(() => { if (abierto) { setF(aForm(negocio.data)); guardar.reset(); } }, [abierto, !!negocio.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const campo = (k: string) => ({ value: f[k] ?? '', onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })) });

  const enviar = () => guardar.mutate({
    ...Object.fromEntries(CAMPOS_NEGOCIO.map((k) => [k, (f[k] ?? '').trim()])),
    cbu: (f.cbu ?? '').replace(/\D/g, ''), validezDias: Math.max(1, Math.round(leerNumero(f.validez ?? '7'))),
  }, { onSuccess: () => { avisar('Datos del negocio guardados'); onCerrar(); } });

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} tamano="grande" titulo="Datos del negocio" sub="Salen en el encabezado y el pie de cada presupuesto en PDF."
      pie={<PieFormulario onCancelar={onCerrar} guardando={guardar.isPending} puedeGuardar={!!negocio.data} />}>
      <div className="modal__seccion">
        <div className="modal__seccion-titulo">Logo</div>
        <CampoFoto recurso="negocio" id={1} url={negocio.data?.logoUrl} alt="logo" clase="logo-mini" icono="torta"
          opciones={{ ladoMax: 800, transparente: true }} textoSubir="Subir logo" textoCambiar="Cambiar logo"
          ayuda="Sale en el encabezado del PDF y en el menú. Mejor un PNG con fondo transparente. Si no cargás uno, se usa el de Rojas Bakery." />
      </div>
      <div className="modal__seccion">
        <div className="modal__seccion-titulo">Contacto</div>
        <div className="form-grid">
          <Field id="mn1" label="Nombre del negocio" {...campo('nombre')} />
          <Field id="mn2" label="Instagram" placeholder="@usuario" {...campo('instagram')} />
          <Field id="mn3" label="WhatsApp" inputMode="tel" placeholder="+54 9 11 1234-5678" {...campo('whatsapp')} />
          <Field id="mn4" label="Zona" placeholder="Ej.: Wilde, Avellaneda" {...campo('zona')} />
        </div>
      </div>
      <div className="modal__seccion">
        <div className="modal__seccion-titulo">Pago</div>
        <div className="form-grid">
          <Field id="mn5" label="Medios de pago" {...campo('mediosPago')} />
          <Field id="mn6" label="Alias" {...campo('alias')} />
          <Field id="mn7" label="CBU / CVU" inputMode="numeric" help="22 números." {...campo('cbu')} />
          <Field id="mn8" label="Validez del presupuesto" suffix="días" inputMode="numeric" {...campo('validez')} />
        </div>
      </div>
      <div className="modal__seccion">
        <div className="modal__seccion-titulo">Condiciones</div>
        <Area id="mn9" label="Cancelaciones y cambios" {...campo('politicas')} />
        <Area id="mn10" label="Cuidados" {...campo('cuidados')} />
      </div>
      <ErrorMsg error={guardar.error ?? negocio.error} />
    </Modal>
  );
}
