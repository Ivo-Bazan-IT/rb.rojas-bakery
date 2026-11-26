# Calculadora de costos para pastelería: resumen final de requerimientos

Nov 25, 2026 · @Ivo

## Objetivo, usuaria y stack

La app calcula el costo real y el precio de venta de cada torta o producto de mesa dulce, genera el presupuesto en PDF y sigue el pedido hasta la entrega.

- **Usuaria:** una sola persona, la pastelera, con login por usuario y contraseña.
- **Dispositivos:** celular (Motorola Razr 60, Android) y PC, con los mismos datos en ambos.
- **Stack:** TypeScript + React (PWA instalable) + Node.js, con base de datos y almacenamiento de imágenes.
- **Problema que resuelve:** hoy el costo se calcula en una planilla con hojas copiadas, filas vacías y unidades mal cargadas. No hay seguimiento de pedidos ni presupuestos para el cliente.

## Módulos y entidades

La app se organiza en once módulos. Todo lo que tiene valores (precios, tiempos, porcentajes) es editable.

| Módulo | Qué guarda | Detalles clave |
| --- | --- | --- |
| Insumos | Nombre, foto, tipo de unidad (kg, L, unidad), cantidad de la presentación, precio | Calcula el costo por g, ml o unidad. Merma % opcional (arranca en 0). Muestra la fecha de la última actualización de precio. Foto reemplazable. |
| Recetas base | Nombre, categoría, ingredientes con cantidades, rendimiento, tiempo de trabajo, tiempo de horno | Categorías: Bizcochos/masas/almíbar, Rellenos, Ganache/sellado, Forrados/cubiertas, Decoraciones. Calibradas en 20 cm para tortas, o con rendimiento en unidades para mesa dulce. |
| Productos: tortas | Recetas base, tiempo de armado y decoración, variantes 18 / 20 / 22 cm | Altura 20 cm. Porciones: 18 cm 25–28, 20 cm 30–35, 22 cm 40–45. Forrado elegido por pedido: pasta o buttercream. |
| Productos: budines | Igual que las tortas, sin variantes | Se venden enteros, con porciones de referencia. |
| Productos: mesa dulce | Recetas base con rendimiento por tanda, tiempo de decoración por unidad | Cookies decoradas, cupcakes, cake pops. Pedidos de 4 a 36 unidades. |
| Gastos fijos | Nombre, monto mensual, tipo (compartido con la casa o exclusivo del negocio), factor de intensidad | Se actualizan cada mes. |
| Equipos | Nombre, valor, vida útil en años | Calcula la amortización mensual sola y la suma como gasto exclusivo. |
| Tarifario de extras | Nombre y precio final | Toppers, velas, muñecos, packaging. Sin el 30% ni redondeo. |
| Tarifario de envíos | Zona y precio final | Más la opción “Retira el cliente”. Sin el 30% ni redondeo. |
| Configuración | Margen (30%), redondeo de tortas (100), redondeo de mesa dulce (100 sobre el total), valor hora de mano de obra, horas laborales del mes (160), días de aviso (5) | Todo editable. |
| Datos del negocio | Logo, nombre, WhatsApp, Instagram, zona, medios de pago, alias o CBU, % de seña, validez, políticas | Se usan en el PDF. |

## Fórmula de costo y precio

El precio es el costo total (ingredientes, servicios, gastos del negocio y mano de obra) más el 30%, redondeado para arriba a la centena. A eso se le suman los extras y el envío a precio final.

```latex
Precio = \lceil (Ingredientes + Servicios + GastosNegocio + ManoDeObra) \times 1{,}30 \rceil_{100} + Extras + Env\acute{\imath}o
```

1. **Ingredientes:** precio de la presentación ÷ cantidad de la presentación × cantidad usada. Con merma, la cantidad útil es presentación × (1 − merma%).
2. **Escalado por tamaño (tortas):** bizcochos y rellenos escalan por volumen (18 cm ×0,81 · 20 cm ×1 · 22 cm ×1,21). El forrado escala por superficie, tapa más costados (×0,88 · ×1 · ×1,12). Los tiempos no escalan, aunque se pueden ajustar a mano por variante.
3. **Servicios compartidos con la casa:** factura ÷ 720 h × factor de intensidad × horas. Luz, agua e internet usan las horas de trabajo. El gas usa las horas de horno.
4. **Gastos exclusivos del negocio:** total mensual (incluida la amortización) ÷ horas laborales del mes × horas de trabajo del pedido.
5. **Mano de obra:** valor hora × horas de trabajo.
6. **Tiempos:** se suman los tiempos de cada receta base y los del armado y la decoración del producto. Cada cocción cuenta su tiempo completo, aunque se horneen dos cosas juntas.
7. **Margen y redondeo:** ×1,30, y redondeo para arriba al múltiplo configurado. Ejemplo: 1.150 × 1,30 = 1.495, que queda en 1.500.
8. **Precio por porción (referencia):** precio de la torta ÷ mínimo de porciones (18 cm ÷ 25 · 20 cm ÷ 30 · 22 cm ÷ 40).

**Mesa dulce:** los ingredientes son proporcionales a las unidades (30 cookies de una receta que rinde 24 = 1,25 recetas). Los tiempos de masa y horno cuentan tandas completas (30 cookies = 2 tandas). La decoración se calcula por unidad. Se redondea solo el total; el precio por unidad se muestra exacto.

**Ejemplo de servicios** (luz $60.000, gas $45.000, agua $15.000; factores 1,5 / 3 / 1): luz $125/h + gas $187/h + agua $21/h = $333 por hora de producción.

## Flujo de trabajo

Un pedido arranca como presupuesto, se convierte en pedido cuando el cliente seña y avanza por el kanban hasta la entrega.

1. **Presupuesto:** se arma desde un producto del catálogo, o personalizado combinando productos, recetas base, insumos, forrado, extras y envío. Se guarda en la sección **Presupuestos**, aparte del kanban.
2. **PDF “Presupuesto de pedido”:** lleva el logo y los datos del negocio, el número y la fecha, los datos del cliente (nombre, teléfono, fecha y hora de entrega, dirección), el detalle (producto, tamaño, porciones, sabores, forrado, decoración), la **foto de referencia del cliente**, los extras y el envío en líneas separadas, el total, el precio por porción o por unidad, la seña y el saldo, los medios de pago, la validez, las políticas y los cuidados. Nunca muestra costos internos.
3. **Convertir en pedido:** cuando el cliente seña, se crea el ticket directo en “Señado”.
4. **Kanban:** Señado → Realizado → Pago → Enviado, más Cancelado. Tiene una vista por estado y otra por día y horario (agenda).
5. **Notificaciones push:** avisan de los pedidos próximos con 5 días de anticipación como mínimo (días configurables).
6. **Lista de compras**, como sección propia: listas estándar (plantillas), listas personalizadas y una lista generada desde los pedidos señados de un rango de fechas, con los insumos sumados.
7. **Resumen mensual:** ventas, ganancia y horas trabajadas en el mes.

## Reglas y casos límite

La regla central: el catálogo siempre muestra precios actualizados, y un presupuesto enviado nunca cambia.

- **Snapshot de presupuesto:** al generar un presupuesto se congelan precios, costos y configuración. Si después cambian un insumo, el valor hora o un gasto, se recalculan el catálogo y los presupuestos nuevos, pero no los que ya se enviaron ni los pedidos.
- **Costos internos privados:** ingredientes, horas, servicios y margen nunca aparecen en el PDF.
- **No es factura legal:** el documento se llama “Presupuesto de pedido”. La factura con validez legal se emite aparte, desde ARCA.
- **Unidades coherentes:** un insumo por kg se usa en g, uno por L en ml, uno por unidad en unidades. La app no permite mezclarlos (el caso de las yemas cargadas como “G” en la planilla).
- **Horas laborales reales:** si ella trabaja menos de 160 h al mes, se carga el número real. Si no, los gastos del negocio no se cubren.
- **Extras y envío:** son precios finales, sin margen ni redondeo. La seña se calcula sobre el total.
- **Mesa dulce:** cantidad de 4 a 36 unidades. Ingredientes proporcionales, tandas completas para masa y horno, redondeo solo sobre el total.
- **Hornadas compartidas:** no se descuentan. Lo que se ahorra queda como ganancia extra.
- **Insumos desactualizados:** la fecha de la última actualización de precio queda visible en cada insumo.
- **Borrado seguro:** un insumo o una receta que se usa en un producto no se borra, se archiva.

## Validación con la planilla de alfajores

Con los mismos datos de la planilla, la app da $20.630 y la planilla da $20.593,62. La diferencia es solo el redondeo a la centena.

| Concepto | Planilla | App |
| --- | --- | --- |
| Ingredientes | $12.087,40 | $12.087,40 |
| Mano de obra (1 h × $3.500) | $3.500 | $3.500 |
| Gastos fijos (vacíos en la planilla) | $0 | $0 |
| Subtotal × 1,30 | $20.263,62 | $20.263,62 → **$20.300** |
| Packaging | $330 | $330 |
| **Precio de venta** | **$20.593,62** | **$20.630** |

Cuando se carguen los gastos fijos reales y las horas de horno, el precio va a subir. Hoy la planilla los tiene en $0.

## Alcance, arquitectura y siguiente paso

La propuesta es lanzar una V1 que cubra todo el circuito de dinero y pedidos, y dejar los análisis para una V2. Es una propuesta y se puede mover.

**V1: calcular, presupuestar y seguir pedidos**

- [ ] Login de una usuaria
- [ ] Insumos con foto, recetas base y productos (tortas, budines, mesa dulce)
- [ ] Gastos fijos de dos tipos, equipos y amortización
- [ ] Configuración y tarifarios de extras y envíos
- [ ] Presupuestos con PDF, foto del cliente y conversión a pedido
- [ ] Kanban por estado y agenda, con notificaciones push

**V2: organizar y analizar**

- [ ] Lista de compras (estándar, personalizada y desde pedidos)
- [ ] Resumen mensual
- [ ] Historial de precios de insumos
- [ ] Integración con ARCA para facturar (opcional)

**Arquitectura propuesta**

| Capa | Elección | Por qué |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite + vite-plugin-pwa | PWA instalable en Android y PC |
| Estado y formularios | TanStack Query + React Hook Form + Zod | Validaciones compartidas con el back |
| Backend | Node + TypeScript (NestJS o Fastify), arquitectura hexagonal | El motor de cálculo queda como dominio puro y testeable |
| Base de datos | PostgreSQL + Prisma | Datos relacionales: recetas, productos y pedidos |
| Imágenes | Almacenamiento de objetos (Cloudinary o Supabase Storage) | Fotos de insumos y fotos de referencia |
| PDF | Generado en el back (@react-pdf/renderer) | Mismo diseño en celular y PC |
| Notificaciones | Web Push (VAPID) + tarea diaria programada | Aviso de pedidos a 5 días |
| Auth | Usuario y contraseña (bcrypt) + JWT en cookie httpOnly | Una sola usuaria |
| Dinero | Montos en enteros (centavos) | Sin errores de redondeo con decimales |

**Pendientes por definir**

- % de seña, días de validez del presupuesto y texto de las políticas de cancelación y cuidados.
- Zonas y precios de envío, y precios de los extras.
- Montos reales de los servicios, factores de intensidad y horas laborales reales del mes.
- Datos del negocio para el PDF: WhatsApp, zona, alias o CBU.

**Siguiente paso:** arrancar la V1 por el motor de cálculo, con tests que reproduzcan la planilla de alfajores, y después maquetar en React siguiendo las pantallas de identidad visual.

## Identidad visual y procedimiento de diseño

La app usa la identidad de Rojas Bakery (logo, rojo cereza y rosa del flyer) con criterio mobile-first y keep it simple: se diseña cada pantalla primero para el celular y después se amplía a la PC. Las maquetas de las 12 pantallas, en mobile y desktop, están en el canvas [Rojas Bakery: identidad visual y pantallas de la app](https://claude.ai/artifact/XdqXwTURdgTwDwPFica79x).

**Principios:** elegancia (mucho aire, el rojo solo en la acción principal y el total), prolijidad (grilla de 8 px, números tabulares) y familiaridad (formas redondeadas, tono cercano con voseo).

**Tokens de diseño** (van como variables CSS en un `tokens.css` único, que el front importa una sola vez):

| Token | Valor | Uso |
| --- | --- | --- |
| cereza | #FF3131 | Logo, iconos, gráficos, títulos de 24 px o más |
| cereza-700 | #C81E28 | Botones primarios, enlaces, montos (5,7:1 sobre blanco) |
| malva | #A8414F | Acento secundario y estado “Realizado” |
| tinta | #3B1E22 | Texto principal |
| tinta-suave | #6E4F54 | Texto secundario e iconos inactivos |
| rosa | #FFE5E5 | Superficie de marca: menú activo, chips, cabeceras |
| rosa-50 | #FFF4F3 | Fondo de pantallas |
| crema | #FFF2E1 | Totales y alertas suaves |
| linea / borde | #F0D6D6 / #A0858A | Divisores / borde de campos (3:1) |
| Tipografía | Fredoka 600 · Nunito 400–800 | Títulos y números · texto e interfaz (Google Fonts) |
| Espaciado | 4 · 8 · 12 · 16 · 24 · 32 · 48 px | Márgenes de 16 px en mobile y 40 px en desktop |
| Radios | 12 · 16 · 999 px | Controles · tarjetas · chips y estados |
| Breakpoints | < 768 · 768–1023 · ≥ 1024 px | Barra inferior · menú de iconos · menú lateral completo |

**Procedimiento para cada pantalla nueva o cambio de diseño**

1. Definir qué tiene que resolver la pantalla y su dato principal (por ejemplo, el total del presupuesto).
2. Maquetar la versión mobile en el canvas (390 px): una columna, acción principal abajo, áreas táctiles de 44 px como mínimo.
3. Ampliar a desktop (1280 px): menú lateral y dos columnas donde haya espacio, sin sumar funciones que el mobile no tenga.
4. Usar solo tokens y componentes base: botón (primario, secundario, suave, texto), campo, selector, chip, segmentado, estado, tarjeta, ítem de lista, check.
5. Revisar contraste (4,5:1 para texto), que los estados lleven palabra y no solo color, y el tono de voz.
6. Pasar la pantalla a React con los mismos nombres de componentes y tokens, y probarla primero en el Razr 60.

**Inventario de pantallas:** Login · Inicio · Nuevo presupuesto · Presupuesto de pedido (PDF A4) · Pedidos por estados (kanban) · Pedidos en agenda · Catálogo y producto · Recetas base · Insumos · Lista de compras · Resumen mensual · Costos y ajustes. El PDF se diseña una sola vez en A4, porque es el mismo documento en el celular y en la PC.

**Navegación mobile:** Inicio, Pedidos, Presupuesto (botón central), Catálogo y Más (insumos, recetas, compras, resumen, costos). **Navegación desktop:** menú lateral con Inicio y los grupos Ventas, Catálogo y Gestión.
