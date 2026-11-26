/* Copia todos los datos de la base SQLite de desarrollo (prisma/dev.db) a la base PostgreSQL de DATABASE_URL.
   Uso:  npx tsx --env-file=<archivo con DATABASE_URL> scripts/migrar-desde-sqlite.ts prisma/dev.db
   - La base de destino tiene que tener las migraciones aplicadas (npm run db:migrate) y estar vacía.
   - Conserva los ids, así las relaciones y las URLs de fotos siguen iguales. */
import { DatabaseSync } from 'node:sqlite';
import { Prisma, PrismaClient } from '@prisma/client';

// Orden de inserción: primero las tablas de las que dependen las demás.
const ORDEN = [
  'Usuario', 'Negocio', 'Configuracion', 'Insumo', 'RecetaBase', 'RecetaIngrediente', 'Producto', 'ProductoReceta',
  'ProductoVariante', 'GastoFijo', 'Equipo', 'Extra', 'ZonaEnvio', 'Presupuesto', 'PresupuestoLinea', 'Pedido',
  'ListaCompra', 'ListaCompraItem',
] as const;

const origen = process.argv[2];
if (!origen) { console.error('Indicá la base SQLite de origen, por ejemplo prisma/dev.db'); process.exit(1); }

const sqlite = new DatabaseSync(origen, { readOnly: true });
const db = new PrismaClient();
const delegado = (modelo: string) => (db as unknown as Record<string, { createMany: (a: unknown) => Promise<{ count: number }>; count: () => Promise<number> }>)[modelo.charAt(0).toLowerCase() + modelo.slice(1)]!;

/** SQLite guarda fechas como milisegundos y booleanos como 0/1: se convierten según el esquema. */
function convertir(modelo: string, fila: Record<string, unknown>) {
  const campos = Prisma.dmmf.datamodel.models.find((m) => m.name === modelo)!.fields;
  const out: Record<string, unknown> = {};
  for (const f of campos) {
    if (f.kind !== 'scalar' || !(f.name in fila)) continue;
    const v = fila[f.name];
    if (v === null || v === undefined) out[f.name] = null;
    else if (f.type === 'DateTime') out[f.name] = new Date(typeof v === 'string' && !/^\d+$/.test(v) ? v : Number(v));
    else if (f.type === 'Boolean') out[f.name] = v === 1 || v === true || v === '1';
    else if (f.type === 'Float' || f.type === 'Int') out[f.name] = Number(v);
    else out[f.name] = v;
  }
  return out;
}

async function main() {
  if ((await delegado('Usuario').count()) > 0) throw new Error('La base de destino ya tiene datos: no se importa para no duplicar.');
  for (const modelo of ORDEN) {
    const filas = sqlite.prepare(`SELECT * FROM "${modelo}"`).all() as Record<string, unknown>[];
    if (filas.length) await delegado(modelo).createMany({ data: filas.map((f) => convertir(modelo, f)) });
    // Los ids se copiaron a mano: la secuencia de autoincremento tiene que seguir desde el máximo.
    const tieneSecuencia = Prisma.dmmf.datamodel.models.find((m) => m.name === modelo)!.fields.some((f) => f.name === 'id' && f.default && typeof f.default === 'object' && 'name' in f.default && f.default.name === 'autoincrement');
    if (tieneSecuencia) {
      await db.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${modelo}"', 'id'), COALESCE((SELECT MAX(id) FROM "${modelo}"), 0) + 1, false)`);
    }
    console.log(`${modelo.padEnd(18)} ${filas.length}`);
  }
}

main()
  .then(() => console.log('Listo: datos copiados.'))
  .catch((e) => { console.error(e.message ?? e); process.exitCode = 1; })
  .finally(() => { sqlite.close(); return db.$disconnect(); });
