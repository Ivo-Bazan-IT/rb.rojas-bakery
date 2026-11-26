# Rojas Bakery: identidad visual de la app

La app usa la identidad de Rojas Bakery con criterio mobile-first: cada pantalla se diseña primero para el celular y después se amplía a la PC. La lámina completa está en `design/screens/00-identidad-visual.html` (y en `.png`), y los valores en `design/tokens.css`.

## Principios

- **Elegancia:** mucho aire y un solo color fuerte, usado con medida. El rojo marca lo importante: la acción principal y el total.
- **Prolijidad:** grilla de 8 px, alineaciones limpias y números tabulares para que los precios se lean en columna.
- **Familiaridad:** formas redondeadas, tipografía amable y tono cercano, con voseo ("Ingresá", "Revisá la lista").
- **Mobile-first:** se diseña primero para el celular (390 px) y después se amplía a la PC (1280 px), sin sumar funciones que el mobile no tenga.
- **Keep it simple:** una acción principal por pantalla y solo los componentes base de esta guía.

## Logo

| Versión | Archivo | Fondo | Dónde se usa |
| --- | --- | --- | --- |
| Rojo cereza | `design/assets/logo-rb-rojo.png` | Blanco, rosa 50 o rosa | Menú lateral, inicio, login, PDF |
| Blanco | `design/assets/logo-rb-blanco.png` | Cereza 700 | Piezas sobre fondo rojo |

- Tamaño mínimo: 56 px de ancho en pantalla.
- No se estira, no se recolorea con otros tonos y no lleva sombras.
- La letra script vive solo en el logo; la app usa Fredoka y Nunito.

## Paleta

| Token | Hex | Uso | Contraste con blanco |
| --- | --- | --- | --- |
| `--rb-cereza` | #FF3131 | Logo, iconos, gráficos y títulos de 24 px o más. No para texto chico | 3,7:1 |
| `--rb-cereza-700` | #C81E28 | Botones primarios, enlaces y montos destacados | 5,7:1 |
| `--rb-malva` | #A8414F | Acento secundario: estado "Realizado", gráficos | 5,9:1 |
| `--rb-tinta` | #3B1E22 | Texto principal y títulos | 15:1 |
| `--rb-tinta-suave` | #6E4F54 | Texto secundario, etiquetas, iconos inactivos | 7,2:1 |
| `--rb-rosa` | #FFE5E5 | Superficie de marca: menú activo, chips, cabeceras | Fondo |
| `--rb-rosa-50` | #FFF4F3 | Fondo general de las pantallas | Fondo |
| `--rb-crema` | #FFF2E1 | Totales, alertas suaves y destacados | Fondo |
| `--rb-blanco` | #FFFFFF | Tarjetas, campos y barra de navegación | Fondo |
| `--rb-linea` | #F0D6D6 | Divisores y bordes de tarjetas | Decorativo |
| `--rb-borde` | #A0858A | Borde de campos de formulario | 3:1 |

**Estados de pedido.** Fondo suave y texto oscuro del mismo tono. Siempre muestran la palabra, nunca solo el color.

| Estado | Fondo | Texto |
| --- | --- | --- |
| Presupuestado | #EEEAEA | #5F5557 |
| Señado | #FDEFD6 | #8A5300 |
| Realizado | #FFE5E5 | #A8414F |
| Pago | #E3F1E7 | #2F6B47 |
| Enviado | #E4EEF8 | #2C5A86 |
| Cancelado | #EEEAEA | #5F5557 |

## Tipografía

Fredoka para títulos y números, redondeada como el "Rojas Bakery" del logo. Nunito para el texto y la interfaz. Las dos van autoalojadas en `design/assets/fonts/`.

| Estilo | Familia | Tamaño / interlineado | Ejemplo |
| --- | --- | --- | --- |
| Display | Fredoka 600 | 30/38 desktop · 24/32 mobile | Pedidos |
| Título de sección | Fredoka 600 | 19/26 | Próximas entregas |
| Número grande | Fredoka 600, tabular | 26/32 | $69.800 |
| Texto | Nunito 400 | 15/22 | La torta se entrega el sábado a las 16:00. |
| Texto destacado | Nunito 700–800 | 15/22 | Torta Red Velvet · 20 cm |
| Secundario | Nunito 600 | 13/18 | Lucía M. · Envío CABA |
| Etiqueta | Nunito 700, mayúsculas, +6% de espaciado | 12/16 | DETALLE DEL PEDIDO |

## Espaciado, formas y navegación

- **Espaciado:** 4 · 8 · 12 · 16 · 24 · 32 · 48 px. Márgenes de 16 px en el celular y 40 px en la PC.
- **Radios:** 12 px en botones y campos, 16 px en tarjetas, 999 px en chips y estados.
- **Áreas táctiles:** 44 px como mínimo. Campos de 46 px de alto, botones de 48 px (44 en desktop).
- **Sombras:** casi invisibles. La separación la dan el fondo y las líneas.

| Ancho de pantalla | Navegación | Contenido |
| --- | --- | --- |
| Menos de 768 px | Barra inferior de 72 px: Inicio, Pedidos, Presupuesto (botón central elevado), Catálogo y Más | Una columna, formularios a lo ancho, total fijo abajo en Nuevo presupuesto |
| 768 a 1023 px | Menú lateral reducido a iconos | Dos columnas donde haya espacio |
| 1024 px o más | Menú lateral de 248 px: Inicio · Ventas (Presupuestos, Pedidos) · Catálogo (Productos, Recetas base, Insumos) · Gestión (Lista de compras, Resumen mensual, Costos y ajustes) | Tablas, kanban de 5 columnas, agenda semanal |

"Más" agrupa en el celular lo que en la PC está en el menú lateral: insumos, recetas, compras, resumen y costos.

## Componentes base

| Componente | Variantes | Cuándo se usa |
| --- | --- | --- |
| Button | primary (cereza 700), secondary (borde), soft (rosa), ghost | Uno solo primario por pantalla |
| Field | Con prefijo ($) o sufijo (kg, %, h) | Precios, cantidades, porcentajes |
| Select | Lista desplegable | Producto del catálogo, zona de envío |
| Chip | Activo (cereza 700) o inactivo (blanco con línea) | Tamaños, extras, filtros |
| Segmented | 2 a 4 opciones, fondo rosa, opción activa en blanco | Buttercream / Pasta, Estados / Agenda, kg / Litro / Unidad |
| StatusPill | Uno por estado de pedido | Kanban, listas, agenda |
| Card | Blanca con línea, o crema para totales | Agrupar bloques de información |
| ListItem | Miniatura, título, detalle y valor a la derecha | Pedidos, insumos, recetas, productos |
| Checkbox | Marcado (cereza 700) o vacío | Lista de compras |

Los iconos son de trazo de 1,75 px y redondeados. Los botones que solo tienen icono llevan `aria-label`.

## Tono de voz

| Así sí | Así no |
| --- | --- |
| "Faltan 2 días para la entrega de Lucía." | "ATENCIÓN: pedido próximo a vencer." |
| "Actualizá el precio del azúcar: tiene 41 días." | "Error: dato inválido." |
| "El desglose es solo para vos." | "Usted debe completar el campo." |

## Pantallas

Cada pantalla tiene su HTML de referencia en `design/screens/` y su captura en `design/screens/png/`. Para ver todas juntas, abrí `design/screens/index.html`.

| Pantalla | Archivos | Qué muestra |
| --- | --- | --- |
| Identidad visual | `00-identidad-visual` | Lámina completa de la marca |
| Login | `01-login-mobile`, `01-login-desktop` | Logo sobre rosa, usuario, contraseña e "Ingresar" |
| Inicio | `02-inicio-*` | Aviso de entregas en 5 días, próximas entregas, presupuestos sin respuesta y números del mes |
| Nuevo presupuesto | `03-presupuesto-*` | Cliente, producto, tamaño, forrado, extras, envío, foto de referencia y desglose de costos (solo interno) |
| Presupuesto de pedido (PDF A4) | `04-presupuesto-pdf` | Datos del negocio y del cliente, detalle, foto del cliente, total, seña, medios de pago y condiciones |
| Pedidos · estados | `05-pedidos-kanban-*` | Kanban de 5 columnas en desktop; en mobile, un estado por vez con chips |
| Pedidos · agenda | `06-pedidos-agenda-*` | Semana con entregas por día; en mobile, tira de días y lista |
| Catálogo · producto | `07-catalogo-*` | Precio por tamaño, precio por porción, forrado y composición |
| Recetas base | `08-recetas-*` | Ingredientes con cantidad y costo, rendimiento y tiempos |
| Insumos | `09-insumos-*` | Lista con foto, presentación, costo unitario y aviso de precio viejo; editor del insumo |
| Lista de compras | `10-compras-*` | Lista desde pedidos, estándar y propias, con checks |
| Resumen mensual | `11-resumen-*` | Ventas, ganancia, pedidos, horas, ventas por semana, composición del costo y más vendidos |
| Costos y ajustes | `12-costos-*` | Gastos compartidos y del negocio, equipos, tarifarios y ajustes de precio |

Los datos de las maquetas son de ejemplo y salen de la fórmula acordada (ver `docs/casos-de-prueba.md`). Lo que falta del negocio aparece entre corchetes.
