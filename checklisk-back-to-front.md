# Rojas Bakery: contexto y checklist de punta a punta (back to front)

Documento de trabajo para completar el proyecto. Tiene todo el contexto para retomarlo en cualquier momento: qué es, qué está hecho, cómo está armado y qué falta.

Última actualización: 25/11/2026 (backend creado y conectado al frontend).

---

## 1. Qué es el proyecto

App web (PWA) para Rojas Bakery, una pastelería: costos, presupuestos y pedidos. La usa una sola persona desde el celular (Motorola Razr 60) y desde la PC.

Reglas del proyecto (de `rojas-bakery-design/CLAUDE.md` y de lo que pidió el negocio):

- Textos en español rioplatense, con voseo.
- No inventar datos del negocio.
- **Sin datos de prueba:** insumos, recetas, productos, gastos, equipos, extras, valor hora y horas laborales los carga la usuaria desde la app.
- El PDF para el cliente se llama "Presupuesto de pedido" y nunca muestra costos internos.
- Cada presupuesto guarda una copia fija (snapshot) de precios al generarse. No se recalcula después.
- Montos siempre en centavos enteros.

## 2. Qué está hecho

**Paquete de diseño** en `rojas-bakery-design/` (solo lectura, es la fuente de verdad): requerimientos, casos de prueba, identidad visual, tokens y 24 maquetas.

**Backend** en `back/`:

- Node + TypeScript + Express 5 + Prisma. Base SQLite por ahora; se pasa a PostgreSQL cambiando una línea.
- 18 tablas.
- Arquitectura orientada a objetos con clases base reutilizables para los catálogos.
- Login de una usuaria (bcrypt + JWT en cookie httpOnly).
- Motor de cálculo como dominio puro, con 10 tests que reproducen los casos 1, 2 y 3 y los de borde.
- Endpoints de todos los módulos: catálogos, cotizador, presupuestos con snapshot, pedidos, compras y resumen.

**Frontend** en `app/`:

- Todas las pantallas leen y escriben en la API. Se borraron los datos de la maqueta.
- Hay mensajes para pantallas vacías, mientras carga y cuando hay un error.
- Hay una pantalla nueva: **listado de Presupuestos**, con filtros y el botón "Convertir en pedido".

**Datos reales cargados:** 30 insumos sin TACC del Excel `Rojas Bakery 30 insumos sin TACC con precios.xlsx` (precios de lista del 26/11/2026). Se cargaron por la API y se editan como cualquier insumo. No se cargaron las columnas de marca, categoría, sin TACC, dónde comprar y notas, porque la app todavía no tiene esos campos.

## 3. Cómo correr el proyecto

```bash
# terminal 1: API (puerto 3001)
cd back
npm install
cp .env.example .env    # solo la primera vez: completá los valores
npx prisma db push      # solo la primera vez
npm run db:seed         # solo la primera vez
npm run dev

# terminal 2: app (puerto 5188)
cd app
npm install
npm run dev
```

Abrí http://localhost:5188. Para ingresar, usá el email y la contraseña de `SEED_EMAIL` / `SEED_PASSWORD` de tu `back/.env` (copialo desde `back/.env.example`; nunca se sube al repositorio).

- Tests del motor: `cd back && npm test`.
- Empezar de cero: `cd back && npm run db:reset`. Borra todo y vuelve a cargar solo los datos iniciales reales.
- El puerto 4173 tiene guardada la versión demo de otro proyecto (Hype Workout). No lo uses, o borrá los datos del sitio en el navegador.

## 4. Cómo está armado

### Backend (`back/`)

| Carpeta | Qué tiene |
|---|---|
| `src/domain/` | Motor puro. `InsumoCosto`, `RecetaCosto`, `ContextoCostos` y las calculadoras: `CalculadoraProducto` es la base y de ella salen `CalculadoraTorta`, `CalculadoraBudin` y `CalculadoraMesaDulce`. `Cotizacion` suma extras, envío, seña y saldo. |
| `src/core/` | Armazón orientado a objetos. `Repositorio<T>` hace el CRUD sobre Prisma. `ServicioCatalogo` valida con Zod y tiene ganchos (`antesDeCrear`, `debeArchivar`, `aDTO`). `ControladorCatalogo` publica el REST estándar. |
| `src/modules/` | Un archivo por módulo: auth, insumos, recetas, productos, costos (gastos, equipos, extras, envíos, configuración, negocio), cotizador, presupuestos, pedidos, compras y resumen. |
| `src/app.ts` | Junta todas las piezas y protege las rutas con sesión. |
| `prisma/schema.prisma` | Tablas. |
| `prisma/seed.ts` | Datos iniciales reales. |

**Tablas:**

- Usuario, Negocio (fila única), Configuracion (fila única)
- Insumo, RecetaBase, RecetaIngrediente
- Producto, ProductoReceta (rol: base, forrado_buttercream o forrado_pasta), ProductoVariante (ajuste de tiempos por tamaño)
- GastoFijo (compartido o exclusivo), Equipo, Extra, ZonaEnvio
- Presupuesto (snapshot) y PresupuestoLinea, Pedido
- ListaCompra y ListaCompraItem

El detalle de los endpoints está en `back/README.md`.

### Frontend (`app/`)

React 19 + Vite 8 + TanStack Query + react-router (HashRouter). En desarrollo, Vite manda `/api` a `localhost:3001`.

- `src/api/`: cliente, tipos y hooks.
- `src/lib/formato.ts`: montos, fechas y tiempos.
- `src/screens/`: una pantalla por archivo.

Solo se usan tokens `--rb-*`. Los 4 colores extra (#FBEDEC, #F3DDBF, #E58E95, #F6C3C6) están confirmados.

## 5. Motor de cálculo

```
Precio = redondeo hacia arriba((ingredientes + servicios + gastos + mano de obra) × (1 + margen), múltiplo) + extras + envío
```

- **Ingredientes:** precio ÷ presentación × cantidad, con merma (cantidad útil = presentación × (1 − merma%)).
- **Tortas:** recetas calibradas en 20 cm.

  | Tamaño | Volumen (bizcochos y rellenos) | Superficie (forrado) | Porciones |
  |---|---|---|---|
  | 18 cm | ×0,81 | ×0,88 | 25 a 28 |
  | 20 cm | ×1 | ×1 | 30 a 35 |
  | 22 cm | ×1,21 | ×1,12 | 40 a 45 |

  Los tiempos no escalan, pero se pueden ajustar a mano por tamaño.
- **Budines:** sin escalado; usan porciones de referencia.
- **Mesa dulce:** de 4 a 36 unidades. Los ingredientes son proporcionales (30 de una receta que rinde 24 = 1,25 recetas). Masa y horno cuentan tandas completas (2 tandas). La decoración se calcula por unidad. Se redondea solo el total.
- **Servicios:** factura ÷ 720 h × factor. El gas usa horas de horno; el resto, horas de trabajo.
- **Gastos del negocio:** (exclusivos + amortización de equipos) ÷ horas laborales × horas de trabajo.
- **Seña:** % sobre el total, redondeada al peso.
- **Si falta un dato** (valor hora, horas laborales o servicios), el cálculo igual se hace con 0 y muestra un aviso.

## 6. Datos del negocio

| Dato | Valor |
|---|---|
| % de seña | **30%** del total |
| Política de cancelación | **Si cancelás el pedido, la seña no se devuelve.** |
| Cuidados / responsabilidad | **Una vez entregado el producto, no nos hacemos responsables por accidentes.** |
| WhatsApp, zona, alias y CBU | **Cargados** en `back/prisma/negocio.local.json` (no se sube) y editables desde Datos del negocio |
| Zonas de envío | **Avellaneda, Bernal, Don Bosco, Quilmes Oeste, Nuevo Quilmes** (precio en blanco, editable) y "Retira el cliente" ($0) |
| Colores extra | **Confirmados** |
| Instagram | @rb.rojasbakery |
| Medios de pago | Efectivo o transferencia (texto de la maqueta, editable) |
| Días de validez | 7 (valor de la maqueta; [CONFIRMAR]) |
| Margen / redondeo | 30% / $100 (de los requerimientos, editables) |
| Valor hora, horas laborales, servicios, gastos, equipos, extras | Se cargan desde la app |
| Insumos, recetas y productos | Se cargan desde la app |

> El WhatsApp quedó tal cual lo pasó el negocio. Para armar un link de WhatsApp desde la app conviene el formato internacional (+54 9 11 …). [CONFIRMAR]

---

# Checklist

Orden sugerido:

1. Publicación: git, PostgreSQL, hosting, dominio con HTTPS, backups y seguridad del login.
2. PWA y aviso de pedidos en el celular (necesitan HTTPS).
3. Compartir el PDF por WhatsApp.
4. Lo demás (presupuesto personalizado, cambio de contraseña, mejoras de mobile).

## 0. Datos y decisiones del negocio

- [x] % de seña (30%)
- [ ] Días de validez del presupuesto (hoy 7)
- [x] Política de cancelación
- [x] Cuidados y responsabilidad
- [x] WhatsApp, zona, alias y CBU
- [x] Zonas de envío (los precios se cargan desde la app)
- [x] Extras: se cargan desde la app
- [x] Montos de servicios, horas laborales y valor hora: se cargan desde la app
- [x] Carga inicial de insumos, recetas y productos: la hace la usuaria desde la app
- [x] Colores extra confirmados
- [ ] Definir si V1/V2 queda como está propuesto

## 1. Motor de cálculo

- [x] Backend Node + TypeScript con el dominio separado
- [x] Ingredientes con merma
- [x] Unidades coherentes (no se mezclan g, ml y u)
- [x] Escalado de tortas por volumen y superficie
- [x] Ajuste manual de tiempos por tamaño (en el modal de producto)
- [x] Servicios compartidos, gastos exclusivos y amortización
- [x] Mano de obra, margen y redondeo configurable
- [x] Mesa dulce (proporcional, tandas, decoración por unidad, redondeo del total, 4 a 36)
- [x] Budines
- [x] Extras, envío, seña, saldo y precio por porción o unidad
- [x] Montos en centavos
- [x] Tests: caso 1 ($20.300 / $20.630), caso 2 (4 variantes, $69.800, seña $34.900, porción $2.010), caso 3 (1,25 recetas, 2 tandas) y casos de borde

## 2. Base de datos y API

- [x] Esquema Prisma con todas las entidades (SQLite)
- [ ] Pasar a PostgreSQL (cambiar el provider y la URL)
- [ ] Migraciones versionadas (`prisma migrate`) antes de producción
- [x] CRUD de cada módulo con validación Zod
- [x] Borrado seguro (archivar si está en uso)
- [x] Fecha de última actualización de precio del insumo (aviso a los 30 días)
- [x] Snapshot al generar el PDF; un presupuesto enviado no se edita, se duplica
- [x] Numeración correlativa (#0001…)
- [x] Convertir presupuesto en pedido (entra en "Señado")
- [x] Estados del pedido
- [x] Catálogo con precios siempre actualizados
- [x] Resumen mensual
- [x] Seed solo con datos reales (sin datos de prueba)

## 3. Autenticación

- [x] Login de una usuaria (bcrypt + JWT en cookie httpOnly, 30 días)
- [x] Cierre de sesión
- [x] Rutas protegidas en front y back
- [ ] "Olvidé mi contraseña" y cambio de contraseña
- [x] Credenciales fuera del código: la usuaria inicial sale de `SEED_*` en `.env`; en producción el servidor no arranca sin `JWT_SECRET` (32+ caracteres)
- [ ] Antes de publicar: usar una contraseña propia en producción y agregar rate limit al login

## 4. Imágenes y PDF

- [x] Subir fotos de insumos, productos y referencia del cliente (`PUT /api/fotos/:recurso/:id`, guardadas en `back/uploads/`)
- [x] Logo cargable desde Datos del negocio (PNG transparente; sale en el PDF, el menú y el Inicio; si no hay, se usa el de Rojas Bakery)
- [x] PDF "Presupuesto de pedido" con datos reales, sin costos internos (se imprime o se guarda desde el navegador)
- [ ] PDF generado en el servidor y botón para compartir por WhatsApp

## 5. Frontend

- [x] Todas las pantallas conectadas a la API
- [x] Listado de Presupuestos con filtros, "Convertir en pedido" y "Duplicar"
- [x] Cancelar, reactivar y eliminar presupuestos enviados (los que ya son pedido se cancelan desde Pedidos)
- [x] Presupuesto: producto del catálogo, tamaño, forrado, cantidad de mesa dulce, extras y envío, con el cálculo en vivo
- [x] Kanban persistente (arrastrar en desktop, "Avanzar" en mobile)
- [x] Agenda con navegación de semanas; resumen con navegación de meses
- [x] Insumos: crear, editar y eliminar
- [x] Ajustes de precio: guardar
- [x] Lista de compras: generar desde pedidos, marcar comprados, compartir
- [x] Estados vacíos, de carga y de error
- [x] Modales (ver 5.1)
- [ ] Presupuesto personalizado (combinar recetas e insumos sueltos)
- [x] Detalle de pedido (ver y editar fecha, notas; cancelar)
- [x] Datos del negocio (modal en Costos → Ajustes y en Más)
- [ ] "Mantener presionado" en mobile para mover tarjetas
- [ ] Revisión de accesibilidad

### 5.1 Modales (hechos)

Base común en `app/src/components/Modal.tsx`: `<dialog>` nativo con fondo difuminado, animación de entrada y salida, Esc y clic afuera para cerrar, hoja inferior en el celular. También: `Confirmar` (decisiones), `PieFormulario`, `Area` y avisos breves (`avisar`). Estilos en `app/src/styles/modales.css`. Modales por pantalla en `app/src/modales/`.

| Pantalla | Botón | Estado |
|---|---|---|
| Todas | Campana | [x] Panel de avisos: entregas cerca o pasadas, precios viejos, zonas sin precio, datos de costos faltantes |
| Login | Olvidé mi contraseña | [x] Modal informativo (no hay recuperación por email) |
| Productos | Nuevo producto / Editar / Eliminar | [x] Recetas con rol y cantidad, tiempos, porciones, ajustes por tamaño; archiva si tiene presupuestos |
| Recetas base | Nueva / Editar / Eliminar / Duplicar | [x] Ingredientes con costo en vivo; archiva si la usa un producto |
| Recetas base | Agregar ingrediente / tocar una fila | [x] Agregar, cambiar cantidad o quitar |
| Insumos | Eliminar | [x] Con confirmación; archiva si lo usa una receta |
| Costos | Gastos, equipos, extras y zonas de envío | [x] Alta, edición y borrado. El precio del envío se puede dejar vacío |
| Costos → Ajustes y Más | Datos del negocio | [x] Modal con contacto, pago y condiciones del PDF |
| Presupuestos | Convertir en pedido / Eliminar borrador | [x] Con confirmación |
| Presupuesto | Generar PDF | [x] Confirma que los precios quedan congelados |
| Lista de compras | Nueva lista / Editar / Eliminar | [x] Ítems de insumos o texto libre |
| Pedidos | Tarjeta (kanban, celular y agenda) | [x] Detalle: estado, WhatsApp, montos, fecha, hora y notas |
| Insumos / Productos / Presupuesto | Subir, cambiar, ver en grande y quitar foto | [x] Se achica en el navegador; se guarda en `back/uploads/` |

## 6. PWA y notificaciones

- [ ] vite-plugin-pwa: manifest, íconos, instalable en Android y PC
- [ ] Funcionamiento sin conexión
- [ ] Web Push (VAPID) y tarea diaria que avise los pedidos con N días de anticipación (5 por defecto)
- [ ] Probar en el Motorola Razr 60

## 7. Calidad, deploy y operación

- [ ] Repositorio git
- [x] Tests del motor (`npm test` en back)
- [ ] Tests de API y de punta a punta en CI
- [ ] Variables de entorno de producción
- [ ] Hosting del front, el back y la base de datos
- [ ] Dominio y HTTPS (necesario para PWA y push)
- [ ] Backups de la base de datos
- [ ] Monitoreo de errores
- [ ] Migración de los datos de la planilla actual
- [ ] Prueba con la planilla de alfajores en producción ($20.630)

## 8. V2

- [ ] Historial de precios de insumos
- [ ] Integración opcional con ARCA para facturar
