# Rojas Bakery: identidad visual de la app

Nov 25, 2026 · @Ivo

La app de costos, presupuestos y pedidos usa la identidad de Rojas Bakery con criterio mobile-first: cada pantalla se diseña primero para el celular y después se amplía a la PC. Todo lo que sigue sale del [canvas de diseño](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x), que sigue siendo la versión editable.

## Principios

La app tiene que sentirse elegante, prolija y familiar, con lo justo en cada pantalla.

- **Elegancia:** mucho aire y un solo color fuerte, usado con medida. El rojo marca lo importante: la acción principal y el total.
- **Prolijidad:** grilla de 8 px, alineaciones limpias y números tabulares para que los precios se lean en columna.
- **Familiaridad:** formas redondeadas, tipografía amable y un tono de voz cercano, con voseo (“Ingresá”, “Revisá la lista”).
- **Mobile-first:** se diseña primero para el celular (390 px) y después se amplía a la PC (1280 px), sin sumar funciones que el mobile no tenga.
- **Keep it simple:** una acción principal por pantalla y solo los componentes base de esta guía.

## Logo

El logo se usa en rojo cereza sobre fondos claros, o en blanco sobre cereza 700, y nunca se modifica.

| Versión | Fondo | Dónde se usa |
| --- | --- | --- |
| Rojo cereza (#FF3131) | Blanco o rosa 50 | Uso principal: menú lateral, inicio |
| Rojo cereza | Rosa (#FFE5E5) | Cabeceras, login y PDF del presupuesto |
| Blanco | Cereza 700 (#C81E28) | Piezas sobre fondo rojo |

- Tamaño mínimo: 56 px de ancho en pantalla.
- No se estira, no se recolorea con otros tonos y no lleva sombras.
- La letra script vive solo en el logo; la app usa Fredoka y Nunito.
- Hay dos archivos con fondo transparente, uno rojo y uno blanco, recortados del PNG original (que tenía el cuadriculado de transparencia pegado en la imagen).

## Paleta

Un rojo fuerte para la marca, un rojo más oscuro para la acción y fondos rosa y crema tomados del flyer.

| Color | Hex | Uso | Contraste con blanco |
| --- | --- | --- | --- |
| Cereza | #FF3131 | Logo, iconos, gráficos y títulos de 24 px o más. No para texto chico | 3,7:1 |
| Cereza 700 | #C81E28 | Botones primarios, enlaces y montos destacados | 5,7:1 |
| Malva | #A8414F | Acento secundario: estado “Realizado”, gráficos | 5,9:1 |
| Tinta | #3B1E22 | Texto principal y títulos | 15:1 |
| Tinta suave | #6E4F54 | Texto secundario, etiquetas, iconos inactivos | 7,2:1 |
| Rosa | #FFE5E5 | Superficie de marca: menú activo, chips, cabeceras | Fondo |
| Rosa 50 | #FFF4F3 | Fondo general de las pantallas | Fondo |
| Crema | #FFF2E1 | Totales, alertas suaves y destacados | Fondo |
| Blanco | #FFFFFF | Tarjetas, campos y barra de navegación | Fondo |
| Línea | #F0D6D6 | Divisores y bordes de tarjetas | Decorativo |
| Borde | #A0858A | Borde de campos de formulario | 3:1 |

**Estados de pedido.** Cada estado lleva fondo suave y texto oscuro del mismo tono, y siempre muestra la palabra, nunca solo el color.

| Estado | Fondo | Texto |
| --- | --- | --- |
| Presupuestado | #EEEAEA | #5F5557 |
| Señado | #FDEFD6 | #8A5300 |
| Realizado | #FFE5E5 | #A8414F |
| Pago | #E3F1E7 | #2F6B47 |
| Enviado | #E4EEF8 | #2C5A86 |
| Cancelado | #EEEAEA | #5F5557 |

## Tipografía

Dos familias de Google Fonts: Fredoka para títulos y números, redondeada como el “Rojas Bakery” del logo, y Nunito para el texto y la interfaz, cálida y muy legible en tamaños chicos.

| Estilo | Familia | Tamaño / interlineado | Ejemplo |
| --- | --- | --- | --- |
| Display | Fredoka 600 | 30 / 38 desktop · 24 / 32 mobile | Pedidos |
| Título de sección | Fredoka 600 | 19 / 26 | Próximas entregas |
| Número grande | Fredoka 600, tabular | 26 / 32 | $69.800 |
| Texto | Nunito 400 | 15 / 22 | La torta se entrega el sábado a las 16:00. |
| Texto destacado | Nunito 700–800 | 15 / 22 | Torta Red Velvet · 20 cm |
| Secundario | Nunito 600 | 13 / 18 | Lucía M. · Envío CABA |
| Etiqueta | Nunito 700, mayúsculas, +6% de espaciado | 12 / 16 | DETALLE DEL PEDIDO |

## Espaciado, formas y navegación

Todo se mide en pasos de 4 y 8 px, con esquinas redondeadas y una navegación que cambia según el ancho de pantalla.

- **Espaciado:** 4 · 8 · 12 · 16 · 24 · 32 · 48 px. Márgenes de 16 px en el celular y 40 px en la PC.
- **Radios:** 12 px en botones y campos, 16 px en tarjetas, redondo completo (999 px) en chips y estados.
- **Áreas táctiles:** 44 px como mínimo.
- **Sombras:** casi invisibles. La separación la dan el fondo y las líneas.

| Ancho de pantalla | Navegación | Contenido |
| --- | --- | --- |
| Celular, menos de 768 px | Barra inferior con 5 accesos: Inicio, Pedidos, Presupuesto (botón central), Catálogo y Más | Una columna, formularios a lo ancho, total fijo abajo |
| Tablet, 768 a 1023 px | Menú lateral reducido a iconos | Dos columnas donde hay espacio: formulario y cálculo lado a lado |
| PC, 1024 px o más | Menú lateral completo: Inicio, Ventas, Catálogo y Gestión | Tablas, kanban de 5 columnas y agenda semanal |

“Más” agrupa en el celular lo que en la PC está en el menú lateral: insumos, recetas, compras, resumen y costos.

## Componentes base

La app se arma con nueve componentes. Si una pantalla necesita otro, primero se suma acá.

| Componente | Variantes | Cuándo se usa |
| --- | --- | --- |
| Botón | Primario (cereza 700), secundario (borde), suave (rosa), texto | Uno solo primario por pantalla: “Nuevo presupuesto”, “Generar PDF” |
| Campo | Con prefijo ($) o sufijo (kg, %, h) | Precios, cantidades, porcentajes |
| Selector | Lista desplegable | Producto del catálogo, zona de envío |
| Chip | Activo (cereza 700) o inactivo (blanco) | Tamaños, extras, filtros |
| Segmentado | 2 a 4 opciones | Buttercream / Pasta, Estados / Agenda, kg / Litro / Unidad |
| Estado | Uno por estado de pedido | Kanban, listas, agenda |
| Tarjeta | Blanca con línea, o crema para totales | Agrupar bloques de información |
| Ítem de lista | Miniatura, título, detalle y valor a la derecha | Pedidos, insumos, recetas, productos |
| Check | Marcado o vacío | Lista de compras |

Los iconos son de trazo fino (1,75 px) y redondeados. Los botones que solo tienen icono llevan una etiqueta accesible.

## Tono de voz

La app habla como hablaría Rojas Bakery: cercana, con voseo, en frases cortas que dicen qué hacer.

| Así sí | Así no |
| --- | --- |
| “Faltan 2 días para la entrega de Lucía.” | “ATENCIÓN: pedido próximo a vencer.” |
| “Actualizá el precio del azúcar: tiene 41 días.” | “Error: dato inválido.” |
| “El desglose es solo para vos.” | “Usted debe completar el campo.” |

## Pantallas

Son 12 pantallas, cada una con versión mobile y desktop. El PDF del presupuesto se diseña una sola vez en A4, porque es el mismo documento en los dos dispositivos.

| Pantalla | Qué muestra | Mobile | Desktop |
| --- | --- | --- | --- |
| Login | Logo sobre rosa, usuario, contraseña y “Ingresar” | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-01-login-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-01-login-desktop) |
| Inicio | Aviso de entregas en 5 días, próximas entregas, presupuestos sin respuesta y números del mes | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-02-inicio-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-02-inicio-desktop) |
| Nuevo presupuesto | Cliente, producto, tamaño, forrado, extras, envío, foto de referencia y desglose de costos (solo interno) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-03-presupuesto-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-03-presupuesto-desktop) |
| Presupuesto de pedido (PDF) | Datos del negocio y del cliente, detalle, foto del cliente, total, seña, medios de pago y condiciones | [Ver A4](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-04-presupuesto-pdf) | — |
| Pedidos · estados | Kanban Señado → Realizado → Pago → Enviado, más Cancelado. En mobile, un estado por vez | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-05-pedidos-kanban-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-05-pedidos-kanban-desktop) |
| Pedidos · agenda | Semana con las entregas por día y horario | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-06-pedidos-agenda-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-06-pedidos-agenda-desktop) |
| Catálogo · producto | Precio por tamaño (18 / 20 / 22 cm), precio por porción, forrado y composición | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-07-catalogo-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-07-catalogo-desktop) |
| Recetas base | Ingredientes con cantidad y costo, rendimiento y tiempos | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-08-recetas-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-08-recetas-desktop) |
| Insumos | Lista con foto, presentación, costo unitario y aviso de precio viejo; editor del insumo | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-09-insumos-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-09-insumos-desktop) |
| Lista de compras | Lista generada desde pedidos, listas estándar y propias, con checks | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-10-compras-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-10-compras-desktop) |
| Resumen mensual | Ventas, ganancia, pedidos, horas, ventas por semana, composición del costo y más vendidos | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-11-resumen-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-11-resumen-desktop) |
| Costos y ajustes | Gastos compartidos y del negocio, equipos, tarifarios y ajustes de precio | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-12-costos-mobile) | [Ver](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x#artboard-12-costos-desktop) |

Los números de las maquetas salen de la fórmula acordada: la Red Velvet de 20 cm cuesta $60.300, y con topper y envío el total es $69.800. Los datos del negocio que faltan están entre corchetes en el PDF.
