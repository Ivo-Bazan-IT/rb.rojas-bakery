# Rojas Bakery

App de costos, presupuestos y pedidos para una pastelería sin gluten: calcula el precio de cada producto a partir de insumos, recetas, tiempos y gastos, arma el presupuesto en PDF y sigue los pedidos hasta la entrega.

| Carpeta | Qué hay |
| --- | --- |
| [`app/`](app/README.md) | Frontend: React 19 + TypeScript + Vite + TanStack Query |
| [`back/`](back/README.md) | API: Node + TypeScript + Express 5 + Prisma + PostgreSQL (Neon) |
| [`rojas-bakery-design/`](rojas-bakery-design/) | Paquete de diseño: requerimientos, casos de prueba, identidad visual, tokens y maquetas |
| [`checklisk-back-to-front.md`](checklisk-back-to-front.md) | Contexto del proyecto, arquitectura, reglas del motor de cálculo y checklist de lo que falta |

## Correrlo en local

```bash
# 1. API (http://localhost:3001/api)
cd back
npm install
cp .env.example .env      # completá los valores
npm run db:migrate
npm run db:seed
npm run dev

# 2. App (http://localhost:5188) en otra terminal
cd app
npm install
npm run dev
```

Tests del motor de cálculo y del almacén de fotos: `cd back && npm test`.

## Producción

Desplegado en Vercel (proyecto `rb-rojas-bakery`, región São Paulo): cada push a `main` publica producción. Base PostgreSQL en Neon y fotos en Vercel Blob privado, con recursos separados para producción y para desarrollo. Detalle en [`back/README.md`](back/README.md#producción-en-vercel).

## Seguridad

No se suben al repositorio: `.env` (claves y usuaria inicial), la base de datos (`*.db`), las fotos (`back/uploads/`) ni los datos personales del negocio (`back/prisma/negocio.local.json`). Ver [`.gitignore`](.gitignore) y [`back/.env.example`](back/.env.example).
