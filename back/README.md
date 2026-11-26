# Rojas Bakery · API

Backend de costos, presupuestos y pedidos. Node + TypeScript + Express 5 + Prisma + PostgreSQL (Neon). Fotos en Vercel Blob (producción) o en disco (desarrollo).

## Cómo correrlo

```bash
cd back
npm install
cp .env.example .env    # completá los valores (el .env nunca se sube); DATABASE_URL = base de DESARROLLO
npm run db:migrate      # crea o actualiza las tablas (migraciones de prisma/migrations)
npm run db:seed         # usuaria, datos del negocio, configuración y zonas de envío (si la base está vacía)
npm run dev             # API en http://localhost:3001/api
npm test                # tests del motor de cálculo (casos 1, 2 y 3 + bordes)
```

Login: el email y la contraseña de `SEED_EMAIL` / `SEED_PASSWORD` en `.env`. Los datos del negocio (WhatsApp, alias, CBU…) que carga el seed salen de `prisma/negocio.local.json`, que tampoco se sube; si no existe, se usa `prisma/negocio.example.json`.

**Variables de entorno:** ver `.env.example`. En producción (`NODE_ENV=production`) `JWT_SECRET` es obligatorio y tiene que tener al menos 32 caracteres.

Para empezar de cero **en la base de desarrollo**: `npm run db:reset` (borra todo, vuelve a aplicar las migraciones y corre el seed). Nunca lo corras con la URL de producción.

## Producción en Vercel

Proyecto `rb-rojas-bakery` (Vercel Services, en Beta): el frontend (`app/`) y esta API (`back/`, entrada `src/index.ts`) se despliegan juntos; `/api/*` va a la API y el resto a la app (ver `vercel.json`). Funciones en São Paulo (`gru1`).

| Recurso | Producción | Preview y desarrollo (tu PC) |
| --- | --- | --- |
| Base PostgreSQL (Neon, región gru1) | `rb-rojas-bakery-prod` | `rb-rojas-bakery-dev` |
| Fotos (Vercel Blob privado) | `rb-rojas-bakery-fotos` | `rb-rojas-bakery-fotos-dev` (tu PC usa la carpeta `uploads/`) |
| `JWT_SECRET` | propio, *sensitive* | propio en Preview; en tu PC, el de `.env` |

Las variables las inyecta Vercel (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`, `JWT_SECRET`). Cada push a `main` despliega producción; cada rama o PR, una preview.

**Cambios en el esquema de la base:**

```bash
npm run db:migrate:nueva -- --name descripcion   # crea la migración en prisma/migrations (contra la base de desarrollo)
npm run db:migrate                                # la aplica (desarrollo)
# producción, antes del deploy que la necesita:
vercel env pull ../.env.prod --environment=production --yes
node --env-file=../.env.prod node_modules/prisma/build/index.js migrate deploy
rm ../.env.prod
```

**Scripts de migración** (los que se usaron para pasar de SQLite a PostgreSQL): `scripts/migrar-desde-sqlite.ts` copia una base SQLite a la de `DATABASE_URL` conservando los ids, y `scripts/subir-fotos.ts` sube la carpeta `uploads/` a Vercel Blob con los mismos nombres.


## Arquitectura

```
src/
  domain/         Motor de cálculo puro, sin base de datos ni HTTP (se testea solo)
    valores.ts      unidades, escalas, estados, redondeo
    costos.ts       InsumoCosto, RecetaCosto, ContextoCostos (servicios, gastos, valor hora)
    calculadoras.ts CalculadoraProducto (template method) → Torta, Budin, MesaDulce; Cotizacion
  core/           Armazón orientado a objetos, reutilizable por cada catálogo
    Repositorio.ts       CRUD genérico sobre un modelo de Prisma
    ServicioCatalogo.ts  validación Zod + ganchos (antesDeCrear, debeArchivar, aDTO…)
    Controlador.ts       Controlador base + ControladorCatalogo (REST estándar)
    AlmacenFotos.ts      Guarda las fotos en disco con nombre único y valida que sean imágenes
  modules/        Un archivo por módulo: repositorio + servicio + controlador
  app.ts          Composición: arma todo y lo monta en Express
prisma/
  schema.prisma   Tablas
  seed.ts         Datos iniciales reales (sin datos de prueba)
test/motor.test.ts
```

Un catálogo nuevo se agrega extendiendo `Repositorio` y `ServicioCatalogo` y registrando un `ControladorCatalogo` en `app.ts`.

## Reglas que cumple

- Montos en centavos enteros. Los porcentajes y factores son decimales.
- **Snapshot:** al generar el PDF, el presupuesto pasa a "enviado" y sus montos quedan congelados. Para cambiarlo hay que duplicarlo.
- **Borrado seguro:** un insumo usado en una receta, una receta usada en un producto o un producto con presupuestos se archivan en vez de borrarse.
- **Unidades coherentes:** un insumo por kg se usa en g, por litro en ml y por unidad en u. Si se mezclan, la API responde 400.
- `/presupuestos/:id/documento` (lo que usa el PDF) nunca trae los costos internos.
- Si falta el valor hora, las horas laborales o los servicios, el cálculo igual se hace y devuelve `avisos`.
- **Fotos:** se guardan en `back/uploads/` (o en `FOTOS_DIR`) con un nombre único. Solo se aceptan JPG, PNG o WebP (se revisan los bytes, no la extensión) de hasta 6 MB. La app las achica antes de subirlas (1600 px, JPEG). Al reemplazar o quitar una foto, el archivo se borra si ningún otro registro lo usa; un presupuesto duplicado comparte la foto con el original. Al iniciar el servidor se borran los archivos sin uso de más de una hora. La foto de un presupuesto enviado no se puede cambiar. El logo del negocio solo se cambia por `/fotos/negocio/1` (`PATCH /ajustes/negocio` ignora `logoUrl`), así no puede apuntar a una dirección externa.

## Endpoints (`/api`)

Todas las rutas, salvo `/auth/*` y `/salud`, requieren sesión (cookie `rb_sesion`).

| Recurso | Rutas |
| --- | --- |
| Sesión | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| Catálogos (CRUD) | `/insumos` · `/recetas` · `/productos` · `/gastos` · `/equipos` · `/extras` · `/envios` → `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| Ajustes | `GET/PATCH /ajustes/configuracion` · `GET/PATCH /ajustes/negocio` |
| Cotizador | `POST /cotizador/calcular` · `GET /cotizador/contexto` |
| Presupuestos | `GET /` · `POST /` · `GET /:id` · `PATCH /:id` (solo borrador) · `POST /:id/enviar` · `POST /:id/convertir` · `POST /:id/duplicar` · `POST /:id/cancelar` · `POST /:id/reactivar` · `GET /:id/documento` · `DELETE /:id` |
| Pedidos | `GET /?estado&desde&hasta` · `GET /:id` · `PATCH /:id` · `PATCH /:id/estado` |
| Compras | CRUD de listas · `POST /compras/generar` · `PATCH /compras/:id/items/:itemId` |
| Resumen | `GET /resumen?mes=AAAA-MM` |
| Fotos | `PUT /fotos/:recurso/:id` (cuerpo = la imagen, `Content-Type: image/jpeg`) · `DELETE /fotos/:recurso/:id` · `GET /fotos/archivo/:nombre`. Recursos: `insumos`, `productos`, `presupuestos` y `negocio` (el logo, siempre con id `1`) |
