/* Cambiar la contraseña de la cuenta: pide la actual y la nueva dos veces. */
import { useEffect, useState } from 'react';
import { ErrorMsg, Field } from '../components/ui';
import { Modal, PieFormulario, avisar } from '../components/Modal';
import { useCambiarPassword } from '../api/hooks';

export function ModalPassword({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [f, setF] = useState({ actual: '', nueva: '', repetida: '' });
  const cambiar = useCambiarPassword();
  useEffect(() => { if (abierto) { setF({ actual: '', nueva: '', repetida: '' }); cambiar.reset(); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const corta = f.nueva.length > 0 && f.nueva.length < 8;
  const distintas = f.repetida.length > 0 && f.nueva !== f.repetida;
  const valido = !!f.actual && f.nueva.length >= 8 && f.nueva === f.repetida;

  const enviar = () => {
    if (!valido) return;
    cambiar.mutate({ actual: f.actual, nueva: f.nueva }, { onSuccess: () => { avisar('Contraseña cambiada'); onCerrar(); } });
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} onEnviar={enviar} tamano="chico" titulo="Cambiar contraseña"
      sub="La vas a usar la próxima vez que ingreses."
      pie={<PieFormulario onCancelar={onCerrar} guardando={cambiar.isPending} puedeGuardar={valido} textoGuardar="Cambiar contraseña" />}>
      <Field id="pw1" label="Contraseña actual" type="password" autoComplete="current-password" autoFocus value={f.actual} onChange={set('actual')} />
      <Field id="pw2" label="Contraseña nueva" type="password" autoComplete="new-password" value={f.nueva} onChange={set('nueva')}
        help={corta ? 'Tiene que tener al menos 8 caracteres.' : 'Al menos 8 caracteres. Mejor una frase que solo vos recuerdes.'} />
      <Field id="pw3" label="Repetí la contraseña nueva" type="password" autoComplete="new-password" value={f.repetida} onChange={set('repetida')}
        help={distintas ? 'No coincide con la nueva.' : undefined} />
      <ErrorMsg error={cambiar.error} />
    </Modal>
  );
}
