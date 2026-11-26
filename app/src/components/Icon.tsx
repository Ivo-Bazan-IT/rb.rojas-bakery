/* Iconos de las maquetas: trazo 1,75 px, redondeados, 24×24. */
const PATHS = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  presupuesto: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  pedidos: 'M4 4h5v16H4zM10.5 4h4v10h-4zM16 4h4v13h-4z',
  torta: 'M4 20h16M5 20v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 15.5c2 1.5 3.5 1.5 5 0s3-1.5 5 0 3 1.5 4 0M12 11V7.5M12 4.5v.5',
  receta: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10',
  insumo: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9',
  carrito: 'M3 4h2l2.2 11h10.6L20 7H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  resumen: 'M4 20V10M10 20V4M16 20v-7M3 20h18',
  ajustes: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  campana: 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  mas: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  sumar: 'M12 5v14M5 12h14',
  derecha: 'M9 6l6 6-6 6',
  izquierda: 'M15 6l-6 6 6 6',
  abajo: 'M6 9l6 6 6-6',
  imagen: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check: 'M5 12.5 10 17l9-10',
  lapiz: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  camara: 'M4 8h3l2-2.5h6L17 8h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  candado: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  basura: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  enviar: 'M4 12 20 4l-6 16-3-7z',
  descargar: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14',
  fuego: 'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.4 3.8-8.3.6 1.9 1.6 3.1 2.9 3.6.3-2.6 1.4-4.7 3.3-6.1-.2 2.9 3 5.6 3 10.2 0 4-2.9 6.8-6.5 6.8z',
  volver: 'M15 6l-6 6 6 6',
  cerrar: 'M6 6l12 12M18 6 6 18',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  telefono: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  imprimir: 'M7 9V4h10v5M7 17H5v-7h14v7h-2M7 14h10v6H7z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 1.75, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }} className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
