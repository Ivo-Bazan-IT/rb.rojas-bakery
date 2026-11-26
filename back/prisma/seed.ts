/* Datos iniciales. No carga datos de prueba: insumos, recetas, productos, gastos, equipos,
   extras, valor hora y horas laborales se cargan a mano desde la app.
   Se puede correr varias veces: no duplica ni pisa lo que ya se editó.

   Los datos personales NO están en el código:
   - Usuaria: SEED_EMAIL, SEED_NOMBRE y SEED_PASSWORD en back/.env (ver .env.example).
   - Datos del negocio: prisma/negocio.local.json (si no existe, se usa negocio.example.json). */
import { existsSync, readFileSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function requerida(nombre: string) {
  const v = process.env[nombre]?.trim();
  if (!v) throw new Error(`Falta ${nombre} en back/.env (mirá back/.env.example).`);
  return v;
}

function datosNegocio() {
  const local = new URL('./negocio.local.json', import.meta.url);
  const hayLocal = existsSync(local);
  if (!hayLocal) console.warn('Aviso: no hay prisma/negocio.local.json; se usan los datos de ejemplo.');
  const archivo = hayLocal ? local : new URL('./negocio.example.json', import.meta.url);
  return JSON.parse(readFileSync(archivo, 'utf8'));
}

async function main() {
  // Usuaria única
  const email = requerida('SEED_EMAIL').toLowerCase();
  const password = requerida('SEED_PASSWORD');
  if (password.length < 8) throw new Error('SEED_PASSWORD tiene que tener al menos 8 caracteres.');
  await db.usuario.upsert({
    where: { email },
    update: {},
    create: { email, nombre: process.env.SEED_NOMBRE?.trim() || 'Usuaria', passwordHash: await bcrypt.hash(password, 10) },
  });

  // Datos del negocio para el PDF
  await db.negocio.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...datosNegocio() } });

  // Configuración: valor hora y horas laborales quedan sin cargar (null)
  await db.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, margenPct: 30, redondeoTorta: 10000, redondeoMesaDulce: 10000, senaPct: 30, avisoDias: 5, horasMesServicios: 720 },
  });

  // Zonas de envío: los precios quedan en blanco para cargarlos desde la app
  if ((await db.zonaEnvio.count()) === 0) {
    await db.zonaEnvio.createMany({
      data: [
        { nombre: 'Retira el cliente', precio: 0, esRetiro: true, orden: 0 },
        { nombre: 'Avellaneda', orden: 1 },
        { nombre: 'Bernal', orden: 2 },
        { nombre: 'Don Bosco', orden: 3 },
        { nombre: 'Quilmes Oeste', orden: 4 },
        { nombre: 'Nuevo Quilmes', orden: 5 },
      ],
    });
  }
  console.log('Seed listo: usuaria, datos del negocio, configuración y zonas de envío.');
}

main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; }).finally(() => db.$disconnect());
