import { z } from 'zod';
import { Repositorio } from '../core/Repositorio.ts';
import { ServicioCatalogo, type Filtros } from '../core/ServicioCatalogo.ts';
import { ControladorCatalogo } from '../core/Controlador.ts';
import { idRef, minutos, nombre } from '../core/esquemas.ts';
import { DatosInvalidos } from '../core/errores.ts';
import type { Db } from '../core/db.ts';
import { ROLES_RECETA, TIPOS_PRODUCTO, type TipoProducto } from '../domain/valores.ts';
import { recetaSinEscala } from '../domain/calculadoras.ts';
import { recetaDominio } from './recetas.ts';
import { insumoDominio } from './insumos.ts';
import { Cotizador, incluirProductoCalculo, insumoSuelto, sinRepetidos, type ProductoConRecetas } from './cotizador.ts';

const crear = z.object({
  nombre,
  tipo: z.enum(TIPOS_PRODUCTO),
  descripcion: z.string().max(2000).default(''),
  fotoUrl: z.string().nullable().optional(),
  armadoMin: minutos.default(0),
  decoracionMinUnidad: minutos.default(0),
  porcionesMin: z.number().int().positive().nullable().optional(),
  porcionesMax: z.number().int().positive().nullable().optional(),
  recetas: z.array(z.object({ recetaId: idRef, rol: z.enum(ROLES_RECETA).default('base'), cantidad: z.number().positive().default(1) })).default([]),
  insumos: z.array(insumoSuelto).default([]),
});

const TIPO_LABEL: Record<TipoProducto, string> = { torta: 'Torta', budin: 'Budín', mesa_dulce: 'Mesa dulce' };

export class RepositorioProductos extends Repositorio<ProductoConRecetas> {
  protected get modelo() { return this.db.producto; }
  protected incluir() { return incluirProductoCalculo; }
  protected orden() { return { nombre: 'asc' }; }
  enPresupuestos(id: number) { return this.db.presupuesto.count({ where: { productoId: id } }); }
  recetasExistentes(ids: number[]) { return this.db.recetaBase.count({ where: { id: { in: ids } } }); }
  insumosExistentes(ids: number[]) { return this.db.insumo.count({ where: { id: { in: ids } } }); }
}

export class ServicioProductos extends ServicioCatalogo<ProductoConRecetas> {
  protected readonly nombre = 'El producto';
  protected readonly esquemaCrear = crear;
  protected readonly esquemaActualizar = crear.partial();
  declare protected readonly repo: RepositorioProductos;
  private readonly cotizador: Cotizador;

  constructor(db: Db, cotizador: Cotizador) {
    super(new RepositorioProductos(db));
    this.cotizador = cotizador;
  }

  protected where(f: Filtros) {
    return { archivado: f.archivados ? undefined : false, ...(f.q ? { nombre: { contains: String(f.q), mode: 'insensitive' } } : {}), ...(f.tipo ? { tipo: String(f.tipo) } : {}) };
  }

  protected async guardar(id: number | null, datos: Record<string, unknown>) {
    const { recetas, insumos, ...campos } = datos as { recetas?: { recetaId: number }[]; insumos?: { insumoId: number; cantidad: number }[] } & Record<string, unknown>;
    if (recetas?.length) {
      const ids = [...new Set(recetas.map((r) => r.recetaId))];
      if ((await this.repo.recetasExistentes(ids)) !== ids.length) throw new DatosInvalidos('Alguna de las recetas base no existe.');
    }
    if (insumos?.length) {
      sinRepetidos(insumos);
      if ((await this.repo.insumosExistentes(insumos.map((i) => i.insumoId))) !== insumos.length) throw new DatosInvalidos('Alguno de los ingredientes no existe.');
    }
    if (id == null) return this.repo.crear({ ...campos, recetas: { create: recetas ?? [] }, insumos: { create: insumos ?? [] } });
    return this.repo.actualizar(id, {
      ...campos,
      ...(recetas ? { recetas: { deleteMany: {}, create: recetas } } : {}),
      ...(insumos ? { insumos: { deleteMany: {}, create: insumos } } : {}),
    });
  }

  protected async debeArchivar(p: ProductoConRecetas) { return (await this.repo.enPresupuestos(p.id)) > 0; }

  /** El catálogo siempre muestra precios con los costos actuales. */
  protected async aDTOs(ps: ProductoConRecetas[]) {
    const ctx = await this.cotizador.contexto();
    return ps.map((p) => this.dto(p, ctx));
  }
  protected async aDTO(p: ProductoConRecetas) { return this.dto(p, await this.cotizador.contexto()); }

  private dto(p: ProductoConRecetas, ctx: Awaited<ReturnType<Cotizador['contexto']>>) {
    let precios: unknown[] = [];
    let error: string | null = null;
    try { precios = this.cotizador.preciosCatalogo(p, ctx); } catch (e) { error = (e as Error).message; }
    return {
      id: p.id, nombre: p.nombre, tipo: p.tipo, tipoLabel: TIPO_LABEL[p.tipo as TipoProducto] ?? p.tipo,
      descripcion: p.descripcion, fotoUrl: p.fotoUrl, armadoMin: p.armadoMin, decoracionMinUnidad: p.decoracionMinUnidad,
      porcionesMin: p.porcionesMin, porcionesMax: p.porcionesMax, archivado: p.archivado,
      recetas: p.recetas.map((r) => {
        const d = recetaDominio(r.receta);
        return { id: r.id, recetaId: r.recetaId, nombre: r.receta.nombre, categoria: r.receta.categoria, rol: r.rol, cantidad: r.cantidad,
          costo: d.costo, trabajoMin: r.receta.trabajoMin, hornoMin: r.receta.hornoMin, rendimiento: r.receta.rendimiento };
      }),
      insumos: p.insumos.map((i) => {
        const ins = insumoDominio(i.insumo);
        return { id: i.id, insumoId: i.insumoId, nombre: i.insumo.nombre, cantidad: i.cantidad, unidad: ins.unidadUso, costo: ins.costoDe(i.cantidad) };
      }),
      // Torta con una receta que no escala: un solo tamaño y un solo precio.
      recetaSinEscala: recetaSinEscala(Cotizador.aCalculable(p)),
      precios, error,
    };
  }
}

export class ControladorProductos extends ControladorCatalogo<ServicioProductos> {}
