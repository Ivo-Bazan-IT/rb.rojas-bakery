/* Controladores HTTP. ControladorCatalogo expone el CRUD REST estándar de cualquier
   ServicioCatalogo; los módulos lo extienden para sumar rutas propias. */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { DatosInvalidos } from './errores.ts';
import type { ServicioCatalogo } from './ServicioCatalogo.ts';

export type Handler = (req: Request, res: Response) => Promise<unknown>;

export abstract class Controlador {
  /** Ruta base, ej. "/insumos". */
  abstract readonly ruta: string;
  readonly router = Router();

  /** Envuelve un handler async: responde JSON y pasa los errores al manejador central. */
  protected h(fn: Handler) {
    return (req: Request, res: Response, next: NextFunction) => {
      fn(req, res).then((data) => { if (!res.headersSent) res.json(data ?? { ok: true }); }).catch(next);
    };
  }

  protected id(req: Request, nombre = 'id'): number {
    const n = Number(req.params[nombre]);
    if (!Number.isInteger(n) || n <= 0) throw new DatosInvalidos('El id no es válido.');
    return n;
  }
}

export class ControladorCatalogo<S extends ServicioCatalogo<{ id: number }, unknown>> extends Controlador {
  readonly ruta: string;
  protected readonly servicio: S;

  constructor(ruta: string, servicio: S) {
    super();
    this.ruta = ruta;
    this.servicio = servicio;
    this.rutasExtra();
    this.router.get('/', this.h((req) => this.servicio.listar({ ...req.query, archivados: req.query.archivados === 'true' })));
    this.router.get('/:id', this.h((req) => this.servicio.obtener(this.id(req))));
    this.router.post('/', this.h(async (req, res) => { res.status(201); return this.servicio.crear(req.body); }));
    this.router.patch('/:id', this.h((req) => this.servicio.actualizar(this.id(req), req.body)));
    this.router.delete('/:id', this.h((req) => this.servicio.eliminar(this.id(req))));
  }

  /** Rutas propias del catálogo; se registran antes que "/:id". */
  protected rutasExtra() {}
}
