# Rojas Bakery: calculadora de costos, presupuestos y pedidos

App para una pastelería que vende tortas por pedido. Calcula el costo real y el precio de venta, arma presupuestos en PDF y sigue cada pedido hasta la entrega. La usa una sola persona, desde un Android (Motorola Razr 60) y desde la PC. Todo el texto de la app va en español rioplatense, con voseo.

## Qué leer antes de escribir código

1. `docs/requerimientos.md`: qué hace la app, la fórmula de costo y precio, las reglas y los casos límite. Es la fuente de verdad del negocio.
2. `docs/casos-de-prueba.md`: valores esperados del motor de cálculo. Los tests tienen que dar exactamente estos números.
3. `docs/identidad-visual.md`: principios, paleta, tipografía, componentes, navegación y tono de voz.
4. `design/tokens.css` y `design/tokens.json`: los valores de diseño. Son la única fuente de colores, fuentes, espaciado y radios.
5. `design/screens/`: maquetas de cada pantalla. Hay un `.html` (se abre en el navegador, con medidas exactas) y un `.png` en `design/screens/png/`. Para cada pantalla, mirá el PNG y leé el HTML antes de implementarla.

## Stack

- Frontend: React + TypeScript + Vite + vite-plugin-pwa (PWA instalable). TanStack Query, React Hook Form + Zod.
- Backend: Node + TypeScript con arquitectura hexagonal. El motor de cálculo es dominio puro, sin dependencias de framework, y se testea primero.
- Base de datos: PostgreSQL + Prisma. Imágenes en almacenamiento de objetos. PDF generado en el back. Web Push para avisos.
- Dinero: siempre en enteros (centavos) dentro del dominio. Se formatea recién al mostrar (`$60.300`, separador de miles con punto).

## Orden de trabajo

1. Motor de cálculo (dominio) con tests que reproduzcan `docs/casos-de-prueba.md`.
2. Modelo de datos y API: insumos, recetas base, productos, gastos, equipos, tarifarios, configuración, presupuestos, pedidos.
3. Frontend: primero `tokens.css` y los componentes base, después las pantallas en el orden de `design/screens/`.

## Reglas de UI

- **Mobile-first.** Los estilos base son los del celular (390 px). Después, `min-width: 768px` y `min-width: 1024px`. Cada pantalla tiene que verse como su maqueta mobile y su maqueta desktop.
- **Usá solo tokens.** No escribas colores hex, tamaños de fuente ni radios sueltos en los componentes: usá las variables `--rb-*` de `design/tokens.css`.
- **Usá solo los componentes base:** Button (primary, secondary, soft, ghost), Field (con prefijo y sufijo), Select, Chip, Segmented, StatusPill, Card, ListItem, Checkbox. Si una pantalla necesita otro, preguntá antes de crearlo.
- **Una acción primaria por pantalla.** Los botones primarios van en `--rb-cereza-700`. `--rb-cereza` nunca se usa para texto chico.
- **Navegación.** Mobile: barra inferior con Inicio, Pedidos, Presupuesto (botón central), Catálogo y Más. Desktop: menú lateral de 248 px con Inicio, Ventas (Presupuestos, Pedidos), Catálogo (Productos, Recetas base, Insumos) y Gestión (Lista de compras, Resumen mensual, Costos y ajustes).
- **Accesibilidad.** Usá `<button>`, `<a>`, `<label>` e `<input>` reales. Los botones que solo tienen icono llevan `aria-label`. Áreas táctiles de 44 px como mínimo. Los estados de pedido siempre muestran la palabra, no solo el color.
- **Números.** Fredoka con `font-variant-numeric: tabular-nums`.
- **Iconos.** De trazo de 1,75 px, redondeados. Lucide es una buena opción: es el mismo estilo de las maquetas.

## Qué NO hacer

- No uses los estilos inline de las maquetas HTML como código final. Son una referencia visual: reconstruí cada pantalla con componentes y tokens.
- No muestres en el PDF ni al cliente los costos internos (ingredientes, horas, servicios, margen).
- No recalcules presupuestos ya enviados ni pedidos: al generar un presupuesto se guarda un snapshot de precios y configuración.
- No llames "factura" al PDF: es un "Presupuesto de pedido".
- No inventes datos del negocio. En las maquetas, lo que falta aparece entre corchetes (`[TU WHATSAPP]`, `[TU ALIAS]`) y en la app se carga desde Configuración.

## Assets

- Logo: `design/assets/logo-rb-rojo.png` (fondos claros) y `design/assets/logo-rb-blanco.png` (sobre `--rb-cereza-700`). Fondo transparente. Mínimo 56 px de ancho; no se estira ni se recolorea.
- Fuentes: `design/assets/fonts/Fredoka.ttf` y `Nunito.ttf` (fuentes variables, licencia SIL Open Font License). Van autoalojadas para que la PWA funcione sin conexión.
