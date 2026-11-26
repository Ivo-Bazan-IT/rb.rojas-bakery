import { useState } from 'react';
import { DesktopHeader, MobileHeader } from '../components/Layout';
import { Button, Card, Cargando, Checkbox, ErrorMsg, Field, IconButton, ListItem, Segmented, Vacio } from '../components/ui';
import { useBorrarLista, useGenerarLista, useListas, useMarcarItem } from '../api/hooks';
import { Confirmar, avisar, useModal } from '../components/Modal';
import { ModalLista } from '../modales/ModalLista';
import type { ListaCompra } from '../api/tipos';
import { aISO, hoyISO, num, pesos } from '../lib/formato';

type Grupo = 'pedidos' | 'estandar' | 'personalizada';
const cant = (c: number, u: string) => (u !== 'u' && c >= 1000 ? `${num(c / 1000, 2)} ${u === 'g' ? 'kg' : 'L'}` : `${num(c)} ${u}`);
const detalle = (l: ListaCompra) => `${l.items.length} insumo${l.items.length === 1 ? '' : 's'}${l.tipo === 'pedidos' ? ` · ${l.comprados} comprados` : ''}`;

/** Comparte la lista por WhatsApp u otra app (o la copia si el navegador no deja compartir). */
async function compartir(l: ListaCompra) {
  const texto = `${l.nombre}\n${l.items.map((i) => `${i.comprado ? '✓' : '•'} ${i.nombre}: ${cant(i.cantidad, i.unidad)}`).join('\n')}`;
  if (navigator.share) { await navigator.share({ title: l.nombre, text: texto }).catch(() => {}); return 'compartida'; }
  await navigator.clipboard.writeText(texto);
  return 'copiada';
}

export default function Compras() {
  const listas = useListas();
  const marcar = useMarcarItem();
  const generar = useGenerarLista();
  const [grupo, setGrupo] = useState<Grupo>('pedidos');
  const [selId, setSelId] = useState<number | null>(null);
  const en7 = new Date(); en7.setDate(en7.getDate() + 7);
  const [rango, setRango] = useState({ desde: hoyISO(), hasta: aISO(en7) });
  const [aviso, setAviso] = useState('');
  const editor = useModal<ListaCompra | { tipo: ListaCompra['tipo'] }>();
  const borrarM = useModal<ListaCompra>();
  const borrar = useBorrarLista();
  const nueva = (tipo: ListaCompra['tipo'] = 'personalizada') => editor.abrir({ tipo });
  const todas = listas.data ?? [];
  const sel = todas.find((l) => l.id === selId) ?? todas.find((l) => l.tipo === 'pedidos') ?? todas[0];
  const deGrupo = (g: Grupo) => todas.filter((l) => l.tipo === g);

  const detalleLista = sel ? (
    <Card as="section" className="compras-lista">
      <div className="fila" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>{sel.nombre}</h2>
          <div className="sec">{sel.items.length} insumos · {sel.comprados} comprados</div>
        </div>
        <div className="fila" style={{ gap: 4 }}>
          <IconButton icon="lapiz" label="Editar lista" size={20} onClick={() => editor.abrir(sel)} />
          <IconButton icon="basura" label="Eliminar lista" size={20} onClick={() => borrarM.abrir(sel)} />
          <span className="boton-rosa"><IconButton icon="enviar" label="Compartir lista" size={20} onClick={() => compartir(sel).then((r) => avisar(`Lista ${r}`))} /></span>
        </div>
      </div>
      {aviso && <p className="ok-msg">{aviso}</p>}
      <div className="col" style={{ gap: 0 }}>
        {sel.items.map((it) => (
          <Checkbox key={it.id} checked={it.comprado} extra={cant(it.cantidad, it.unidad)}
            onChange={(v) => marcar.mutate({ listaId: sel.id, itemId: it.id, comprado: v })}>{it.nombre}</Checkbox>
        ))}
        {sel.items.length === 0 && <p className="sec">La lista está vacía.</p>}
      </div>
      <div className="divisor" />
      <div className="fila"><span className="strong">Costo estimado</span><span className="strong tab">{pesos(sel.costoEstimado)}</span></div>
    </Card>
  ) : <Vacio titulo="Todavía no hay listas" accion={<Button variant="soft" icon="sumar" onClick={() => nueva('estandar')}>Nueva lista</Button>}>Generá una desde los pedidos señados de un rango de fechas o armá la tuya.</Vacio>;

  const generador = (
    <Card as="section">
      <h2>Generar desde pedidos</h2>
      <div className="grid-2">
        <Field id="g1" label="Desde" type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
        <Field id="g2" label="Hasta" type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
      </div>
      <p className="sec">Suma los insumos de los pedidos señados en esas fechas.</p>
      <ErrorMsg error={generar.error} />
      <Button variant="soft" block disabled={generar.isPending}
        onClick={() => generar.mutate(rango, { onSuccess: (l) => { setSelId(l.id); setGrupo('pedidos'); setAviso(`Lista generada con ${l.pedidos} pedido${l.pedidos > 1 ? 's' : ''}.`); } })}>
        Generar lista
      </Button>
    </Card>
  );

  const tarjetas = (g: Grupo) => {
    const ls = deGrupo(g);
    if (!ls.length) return <p className="sec" style={{ margin: 0 }}>Sin listas.</p>;
    return ls.map((l) => (
      <div key={l.id} className={`card card--item${sel?.id === l.id ? ' is-sel' : ''}`}>
        <ListItem icon="carrito" title={l.nombre} detail={detalle(l)} chevron onClick={() => { setSelId(l.id); setAviso(''); }} />
      </div>
    ));
  };

  return (
    <>
      <MobileHeader title="Lista de compras" />
      <div className="page">
        <DesktopHeader title="Lista de compras" />
        <ErrorMsg error={listas.error ?? marcar.error} />
        {listas.isPending ? <Cargando /> : (
          <>
            <div className="solo-mobile col" style={{ gap: 16 }}>
              <Segmented<Grupo> label="Tipo de lista" value={grupo} onChange={setGrupo}
                options={[{ value: 'pedidos', label: 'Desde pedidos' }, { value: 'estandar', label: 'Estándar' }, { value: 'personalizada', label: 'Mías' }]} />
              {grupo === 'pedidos'
                ? <>{generador}{deGrupo('pedidos').length > 1 && <div className="col" style={{ gap: 10 }}>{tarjetas('pedidos')}</div>}{sel?.tipo === 'pedidos' && detalleLista}</>
                : <div className="col" style={{ gap: 10 }}>{tarjetas(grupo)}{sel?.tipo === grupo && detalleLista}<Button variant="secondary" icon="sumar" block onClick={() => nueva(grupo === 'estandar' ? 'estandar' : 'personalizada')}>Nueva lista</Button></div>}
            </div>

            <div className="compras-tres solo-desktop grid">
              <div className="col" style={{ gap: 10 }}>
                <div className="etiqueta">Desde pedidos</div>{tarjetas('pedidos')}
                <div className="etiqueta">Estándar</div>{tarjetas('estandar')}
                <div className="etiqueta">Mías</div>{tarjetas('personalizada')}
                <Button variant="secondary" icon="sumar" block onClick={() => nueva()}>Nueva lista</Button>
              </div>
              {detalleLista}
              {generador}
            </div>
          </>
        )}
      </div>
      <ModalLista abierto={editor.abierto} onCerrar={editor.cerrar}
        lista={editor.item && 'id' in editor.item ? editor.item : undefined}
        tipo={editor.item && !('id' in editor.item) ? editor.item.tipo : 'personalizada'}
        onGuardada={(l) => { setSelId(l.id); setGrupo(l.tipo); setAviso(''); }} />
      <Confirmar abierto={borrarM.abierto} onCerrar={borrarM.cerrar} titulo="¿Eliminar esta lista?" accion="Eliminar"
        onConfirmar={async () => { await borrar.mutateAsync(borrarM.item!.id); avisar('Lista eliminada'); setSelId(null); }}>
        <p>Se borra <strong>{borrarM.item?.nombre}</strong> con sus {borrarM.item?.items.length ?? 0} ítems.</p>
        <p className="sec">Los pedidos y los insumos no cambian.</p>
      </Confirmar>
    </>
  );
}
