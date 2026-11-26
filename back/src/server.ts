import { App } from './app.ts';
import { prisma } from './core/db.ts';
import { verificarSecreto } from './modules/auth.ts';

verificarSecreto();

const puerto = Number(process.env.PORT ?? 3001);
const app = new App(prisma);

const server = app.express.listen(puerto, () => {
  console.log(`API de Rojas Bakery en http://localhost:${puerto}/api`);
  // Fotos que quedaron sin uso (reemplazadas o de registros borrados).
  app.fotos.limpiar()
    .then((n) => { if (n) console.log(`Fotos sin uso borradas: ${n}`); })
    .catch((e) => console.error('No se pudieron limpiar las fotos:', e));
});

const cerrar = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
