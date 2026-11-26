/* Composición de la aplicación: crea repositorios, servicios y controladores y los monta en Express. */
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { Prisma } from '@prisma/client';
import type { Db } from './core/db.ts';
import type { Controlador } from './core/Controlador.ts';
import { ControladorCatalogo } from './core/Controlador.ts';
import { HttpError } from './core/errores.ts';
import { DomainError } from './domain/errores.ts';
import { ControladorAuth, ServicioAuth } from './modules/auth.ts';
import { RepositorioInsumos, ServicioInsumos } from './modules/insumos.ts';
import { RepositorioRecetas, ServicioRecetas } from './modules/recetas.ts';
import { ControladorProductos, ServicioProductos } from './modules/productos.ts';
import {
  ControladorAjustes, RepositorioEnvios, RepositorioEquipos, RepositorioExtras, RepositorioGastos,
  ServicioAjustes, ServicioEnvios, ServicioEquipos, ServicioExtras, ServicioGastos,
} from './modules/costos.ts';
import { ControladorCotizador, Cotizador } from './modules/cotizador.ts';
import { ControladorPresupuestos, ServicioPresupuestos } from './modules/presupuestos.ts';
import { ControladorPedidos, ServicioPedidos } from './modules/pedidos.ts';
import { ControladorListas, ServicioListas } from './modules/compras.ts';
import { ControladorResumen, ServicioResumen } from './modules/resumen.ts';
import { ControladorFotos, ServicioFotos } from './modules/fotos.ts';
import { crearAlmacen } from './core/AlmacenFotos.ts';
import { fileURLToPath } from 'node:url';

/** Carpeta de fotos en disco (desarrollo): FOTOS_DIR o back/uploads. En Vercel se usa Blob. */
const DIR_FOTOS = process.env.FOTOS_DIR ?? fileURLToPath(new URL('../uploads', import.meta.url));

export class App {
  readonly express = express();
  private readonly db: Db;
  private readonly auth: ServicioAuth;
  readonly fotos: ServicioFotos;

  constructor(db: Db) {
    this.db = db;
    this.auth = new ServicioAuth(db);
    this.fotos = new ServicioFotos(db, crearAlmacen(DIR_FOTOS));
    this.express.disable('x-powered-by');
    // Detrás del proxy de Vercel: req.ip sale de X-Forwarded-For (lo usa el freno de intentos de login).
    this.express.set('trust proxy', true);
    this.express.use(express.json({ limit: '2mb' }));
    this.express.use(cookieParser());
    this.express.get('/api/salud', (_req, res) => { res.json({ ok: true }); });
    this.montar('/api', [new ControladorAuth(this.auth)], false);
    this.montar('/api', this.controladoresPrivados(), true);
    this.express.use('/api', (_req, res) => { res.status(404).json({ error: 'La ruta no existe.' }); });
    this.express.use(this.manejarErrores);
  }

  private controladoresPrivados(): Controlador[] {
    const db = this.db;
    const cotizador = new Cotizador(db);
    return [
      new ControladorCatalogo('/insumos', new ServicioInsumos(new RepositorioInsumos(db))),
      new ControladorCatalogo('/recetas', new ServicioRecetas(new RepositorioRecetas(db))),
      new ControladorProductos('/productos', new ServicioProductos(db, cotizador)),
      new ControladorCatalogo('/gastos', new ServicioGastos(new RepositorioGastos(db))),
      new ControladorCatalogo('/equipos', new ServicioEquipos(new RepositorioEquipos(db))),
      new ControladorCatalogo('/extras', new ServicioExtras(new RepositorioExtras(db))),
      new ControladorCatalogo('/envios', new ServicioEnvios(new RepositorioEnvios(db))),
      new ControladorAjustes(new ServicioAjustes(db)),
      new ControladorCotizador(cotizador),
      new ControladorPresupuestos(new ServicioPresupuestos(db, cotizador)),
      new ControladorPedidos(new ServicioPedidos(db)),
      new ControladorListas('/compras', new ServicioListas(db)),
      new ControladorResumen(new ServicioResumen(db)),
      new ControladorFotos(this.fotos),
    ];
  }

  private montar(prefijo: string, controladores: Controlador[], privado: boolean) {
    for (const c of controladores) {
      if (privado) this.express.use(prefijo + c.ruta, this.auth.middleware(), c.router);
      else this.express.use(prefijo + c.ruta, c.router);
    }
  }

  private manejarErrores = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) { res.status(err.status).json({ error: err.message, detalles: err.detalles }); return; }
    if (err instanceof DomainError) { res.status(422).json({ error: err.message }); return; }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') { res.status(404).json({ error: 'El registro no existe.' }); return; }
      if (err.code === 'P2003') { res.status(409).json({ error: 'El registro está en uso y no se puede borrar.' }); return; }
    }
    const tipo = (err as { type?: string }).type;
    if (tipo === 'entity.too.large') { res.status(413).json({ error: 'El archivo es demasiado grande (máximo 4 MB).' }); return; }
    if (err instanceof SyntaxError && 'body' in err) { res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido.' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Algo salió mal. Probá de nuevo en un rato.' });
  };
}
