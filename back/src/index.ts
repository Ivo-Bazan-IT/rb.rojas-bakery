/* Punto de entrada en Vercel: exporta la app de Express (Vercel la corre como función).
   En la PC se usa server.ts, que además escucha en un puerto y limpia fotos sin uso. */
import express from 'express';
import { App } from './app.ts';
import { prisma } from './core/db.ts';
import { verificarSecreto } from './modules/auth.ts';

verificarSecreto();

const app = express();
app.use(new App(prisma).express);

export default app;
