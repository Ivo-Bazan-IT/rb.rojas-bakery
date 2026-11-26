import { z } from 'zod';
import type { Insumo, Prisma, RecetaBase } from '@prisma/client';
import { Repositorio } from '../core/Repositorio.ts';
import { ServicioCatalogo, type Filtros } from '../core/ServicioCatalogo.ts';
import { minutos, nombre, idRef } from '../core/esquemas.ts';
import { DatosInvalidos } from '../core/errores.ts';
import { RecetaCosto } from '../domain/costos.ts';
import { CATEGORIAS_RECETA, CATEGORIA_LABEL, ESCALAS, type CategoriaReceta, type Escala } from '../domain/valores.ts';
import { DomainError } from '../domain/errores.ts';
import { insumoDominio } from './insumos.ts';

const ingrediente = z.object({ insumoId: idRef, cantidad: z.number().positive('tiene que ser mayor que 0'), unidad: z.string().optional() });

const crear = z.object({
  nombre,
  categoria: z.enum(CATEGORIAS_RECETA),
  escala: z.enum(ESCALAS).default('volumen'),
  rendimiento: z.number().positive().nullable().optional(),
  trabajoMin: minutos.default(0),
  hornoMin: minutos.default(0),
  notas: z.string().max(2000).default(''),
  ingredientes: z.array(ingrediente).default([]),
});

const incluir = {
  ingredientes: { include: { insumo: true }, orderBy: { id: 'asc' } },
  usadaEn: { include: { producto: { select: { id: true, nombre: true, archivado: true } } } },
} satisfies Prisma.RecetaBaseInclude;

export type RecetaCompleta = Prisma.RecetaBaseGetPayload<{ include: typeof incluir }>;
type RecetaConInsumos = RecetaBase & { ingredientes: { cantidad: number; insumo: Insumo }[] };

export function recetaDominio(r: RecetaConInsumos) {
  return new RecetaCosto({
    id: r.id, nombre: r.nombre, escala: r.escala as Escala, trabajoMin: r.trabajoMin, hornoMin: r.hornoMin, rendimiento: r.rendimiento,
    ingredientes: r.ingredientes.map((i) => ({ insumo: insumoDominio(i.insumo), cantidad: i.cantidad })),
  });
}

export class RepositorioRecetas extends Repositorio<RecetaCompleta> {
  protected get modelo() { return this.db.recetaBase; }
  protected incluir() { return incluir; }
  protected orden() { return [{ categoria: 'asc' }, { nombre: 'asc' }]; }
  insumosPorId(ids: number[]) { return this.db.insumo.findMany({ where: { id: { in: ids } } }); }
}

export class ServicioRecetas extends ServicioCatalogo<RecetaCompleta> {
  protected readonly nombre = 'La receta';
  protected readonly esquemaCrear = crear;
  protected readonly esquemaActualizar = crear.partial();
  declare protected readonly repo: RepositorioRecetas;

  protected where(f: Filtros) {
    return { archivado: f.archivados ? undefined : false, ...(f.q ? { nombre: { contains: String(f.q), mode: 'insensitive' } } : {}), ...(f.categoria ? { categoria: String(f.categoria) } : {}) };
  }

  /** Valida que cada insumo exista y que la unidad coincida (no se mezclan g con u). */
  private async ingredientesValidos(lista: z.infer<typeof ingrediente>[]) {
    const ids = [...new Set(lista.map((i) => i.insumoId))];
    if (ids.length !== lista.length) throw new DatosInvalidos('Hay un insumo repetido en la receta.');
    const insumos = await this.repo.insumosPorId(ids);
    for (const i of lista) {
      const ins = insumos.find((x) => x.id === i.insumoId);
      if (!ins) throw new DatosInvalidos(`El insumo ${i.insumoId} no existe.`);
      if (i.unidad) {
        try { insumoDominio(ins).validarUnidad(i.unidad); } catch (e) { throw new DatosInvalidos((e as DomainError).message); }
      }
    }
    return lista.map((i) => ({ insumoId: i.insumoId, cantidad: i.cantidad }));
  }

  protected async guardar(id: number | null, datos: Record<string, unknown>) {
    const { ingredientes, ...campos } = datos as { ingredientes?: z.infer<typeof ingrediente>[] } & Record<string, unknown>;
    const filas = ingredientes ? await this.ingredientesValidos(ingredientes) : undefined;
    if (id == null) return this.repo.crear({ ...campos, ingredientes: { create: filas ?? [] } });
    return this.repo.actualizar(id, { ...campos, ...(filas ? { ingredientes: { deleteMany: {}, create: filas } } : {}) });
  }

  protected async debeArchivar(r: RecetaCompleta) { return r.usadaEn.length > 0; }

  protected async aDTO(r: RecetaCompleta) {
    const d = recetaDominio(r);
    return {
      id: r.id, nombre: r.nombre, categoria: r.categoria, categoriaLabel: CATEGORIA_LABEL[r.categoria as CategoriaReceta] ?? r.categoria,
      escala: r.escala, rendimiento: r.rendimiento, trabajoMin: r.trabajoMin, hornoMin: r.hornoMin, notas: r.notas, archivado: r.archivado,
      costo: d.costo,
      ingredientes: r.ingredientes.map((i) => {
        const ins = insumoDominio(i.insumo);
        return {
          id: i.id, insumoId: i.insumoId, nombre: i.insumo.nombre, cantidad: i.cantidad, unidad: ins.unidadUso,
          precio: i.insumo.precio, presentacion: i.insumo.presentacion, unidadCompra: i.insumo.unidad,
          costo: ins.costoDe(i.cantidad), insumoArchivado: i.insumo.archivado,
        };
      }),
      usadaEn: r.usadaEn.filter((u) => !u.producto.archivado).map((u) => ({ id: u.producto.id, nombre: u.producto.nombre })),
      updatedAt: r.updatedAt,
    };
  }
}
