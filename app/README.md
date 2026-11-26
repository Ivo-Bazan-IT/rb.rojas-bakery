# Rojas Bakery · app (frontend)

React + TypeScript + Vite + TanStack Query. Usa los datos reales de la API (`../back`): no tiene datos de prueba.

## Cómo correrla

Hacen falta las dos partes prendidas:

```bash
# terminal 1: API
cd back && npm run dev          # http://localhost:3001

# terminal 2: app
cd app && npm run dev           # http://localhost:5188 (/api va al backend)
```

Usuario y contraseña: los de `SEED_EMAIL` / `SEED_PASSWORD` en `back/.env` (ver `back/.env.example`).

Para verla como en el celular, achicá la ventana a menos de 768 px. Entre 768 y 1023 px el menú lateral queda en íconos.

## Estructura

- `src/api/`: cliente HTTP (`cliente.ts`), tipos de la API (`tipos.ts`) y hooks de datos (`hooks.ts`).
- `src/lib/formato.ts`: montos (centavos → `$60.300`), tiempos y fechas en es-AR.
- `src/components/`: íconos, componentes base (incluye estados vacío, de carga y de error) y layout con control de sesión.
- `src/screens/`: una pantalla por archivo.
- `src/design/`: tokens y assets del paquete de diseño. `tokens-extra.css` tiene los 4 colores confirmados que no están en tokens.css.

El cálculo de precios vive solo en el backend (`back/src/domain`). El front lo pide con `POST /api/cotizador/calcular`.
