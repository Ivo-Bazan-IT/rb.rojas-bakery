/* Fotos de insumos, productos, presupuestos (foto de referencia del cliente) y logo del negocio.
   PUT /fotos/:recurso/:id con la imagen como cuerpo; DELETE la quita; GET /fotos/archivo/:nombre la sirve. */
import express, { type Request, type Response, type NextFunction } from 'express';
import type { Db } from '../core/db.ts';
import { Controlador } from '../core/Controlador.ts';
import { Conflicto, DatosInvalidos, NoEncontrado } from '../core/errores.ts';
import { type Almacen, MAX_BYTES_FOTO, nombreDeUrl } from '../core/AlmacenFotos.ts';

/** Cómo se lee y escribe la foto de cada recurso. */
interface Recurso {
  nombre: string;
  leer(db: Db, id: number): Promise<{ url: string | null; bloqueado?: string } | null>;
  escribir(db: Db, id: number, url: string | null): Promise<unknown>;
  todas(db: Db): Promise<(string | null)[]>;
}

const RECURSOS: Record<string, Recurso> = {
  insumos: {
    nombre: 'El insumo',
    leer: async (db, id) => { const x = await db.insumo.findUnique({ where: { id }, select: { fotoUrl: true } }); return x && { url: x.fotoUrl }; },
    escribir: (db, id, url) => db.insumo.update({ where: { id }, data: { fotoUrl: url } }),
    todas: async (db) => (await db.insumo.findMany({ select: { fotoUrl: true } })).map((x) => x.fotoUrl),
  },
  productos: {
    nombre: 'El producto',
    leer: async (db, id) => { const x = await db.producto.findUnique({ where: { id }, select: { fotoUrl: true } }); return x && { url: x.fotoUrl }; },
    escribir: (db, id, url) => db.producto.update({ where: { id }, data: { fotoUrl: url } }),
    todas: async (db) => (await db.producto.findMany({ select: { fotoUrl: true } })).map((x) => x.fotoUrl),
  },
  /** Logo del negocio (fila única, id 1). Sale en el PDF y en la app. */
  negocio: {
    nombre: 'El negocio',
    leer: async (db, id) => {
      if (id !== 1) return null;
      const x = await db.negocio.upsert({ where: { id: 1 }, update: {}, create: { id: 1 }, select: { logoUrl: true } });
      return { url: x.logoUrl };
    },
    escribir: (db, _id, url) => db.negocio.update({ where: { id: 1 }, data: { logoUrl: url } }),
    todas: async (db) => (await db.negocio.findMany({ select: { logoUrl: true } })).map((x) => x.logoUrl),
  },
  presupuestos: {
    nombre: 'El presupuesto',
    leer: async (db, id) => {
      const x = await db.presupuesto.findUnique({ where: { id }, select: { fotoReferenciaUrl: true, estado: true } });
      return x && { url: x.fotoReferenciaUrl, bloqueado: x.estado !== 'borrador' ? 'El presupuesto ya se envió: su foto quedó congelada. Duplicalo para cambiarla.' : undefined };
    },
    escribir: (db, id, url) => db.presupuesto.update({ where: { id }, data: { fotoReferenciaUrl: url } }),
    todas: async (db) => (await db.presupuesto.findMany({ select: { fotoReferenciaUrl: true } })).map((x) => x.fotoReferenciaUrl),
  },
};

export class ServicioFotos {
  private readonly db: Db;
  readonly almacen: Almacen;
  constructor(db: Db, almacen: Almacen) { this.db = db; this.almacen = almacen; }

  private recurso(nombre: string) {
    const r = RECURSOS[nombre];
    if (!r) throw new NoEncontrado('Ese tipo de foto');
    return r;
  }

  private async actual(r: Recurso, id: number) {
    const x = await r.leer(this.db, id);
    if (!x) throw new NoEncontrado(r.nombre);
    if (x.bloqueado) throw new Conflicto(x.bloqueado);
    return x;
  }

  async subir(recurso: string, id: number, datos: unknown) {
    const r = this.recurso(recurso);
    const previa = await this.actual(r, id);
    const url = await this.almacen.guardar(datos);
    await r.escribir(this.db, id, url);
    await this.borrarSiNadieLaUsa(previa.url);
    return { fotoUrl: url };
  }

  async quitar(recurso: string, id: number) {
    const r = this.recurso(recurso);
    const previa = await this.actual(r, id);
    await r.escribir(this.db, id, null);
    await this.borrarSiNadieLaUsa(previa.url);
    return { fotoUrl: null };
  }

  /** Nombres de archivo que algún registro usa (un presupuesto duplicado comparte la foto con el original). */
  private async enUso() {
    const urls = (await Promise.all(Object.values(RECURSOS).map((r) => r.todas(this.db)))).flat();
    return new Set(urls.map(nombreDeUrl).filter((n): n is string => !!n));
  }

  private async borrarSiNadieLaUsa(url: string | null) {
    const nombre = nombreDeUrl(url);
    if (nombre && !(await this.enUso()).has(nombre)) await this.almacen.borrar(url);
  }

  /** Limpieza de archivos huérfanos (por ejemplo, de registros borrados). Se corre al iniciar el servidor. */
  async limpiar() { return this.almacen.limpiar(await this.enUso()); }
}

export class ControladorFotos extends Controlador {
  readonly ruta = '/fotos';
  constructor(s: ServicioFotos) {
    super();
    const crudo = express.raw({ type: ['image/*', 'application/octet-stream'], limit: MAX_BYTES_FOTO });
    this.router.get('/archivo/:nombre', (req: Request, res: Response, next: NextFunction) => {
      s.almacen.leer(String(req.params.nombre)).then((archivo) => {
        if (!archivo) { next(new NoEncontrado('La foto')); return; }
        // El nombre es único: si la foto cambia, cambia la URL. El navegador la puede guardar sin miedo.
        res.set({ 'Content-Type': archivo.mime, 'Cache-Control': 'private, max-age=31536000, immutable' });
        archivo.stream.on('error', next).pipe(res);
      }).catch(next);
    });
    this.router.put('/:recurso/:id', crudo, this.h((req) => {
      if (!Buffer.isBuffer(req.body)) throw new DatosInvalidos('Mandá una imagen JPG, PNG o WebP.');
      return s.subir(String(req.params.recurso), this.id(req), req.body);
    }));
    this.router.delete('/:recurso/:id', this.h((req) => s.quitar(String(req.params.recurso), this.id(req))));
  }
}
