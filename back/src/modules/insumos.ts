import { z } from 'zod';
import type { Insumo } from '@prisma/client';
import { Repositorio } from '../core/Repositorio.ts';
import { ServicioCatalogo, type Filtros } from '../core/ServicioCatalogo.ts';
import { centavos, nombre, porcentaje } from '../core/esquemas.ts';
import { InsumoCosto } from '../domain/costos.ts';
import { UNIDADES, type Unidad } from '../domain/valores.ts';

/** Días sin actualizar el precio a partir de los cuales se marca "Actualizar precio". */
export const DIAS_PRECIO_VIEJO = 30;

const crear = z.object({
  nombre,
  unidad: z.enum(UNIDADES),
  presentacion: z.number().positive('tiene que ser mayor que 0'),
  precio: centavos,
  mermaPct: porcentaje.max(99).default(0),
  fotoUrl: z.string().nullable().optional(),
});

export class RepositorioInsumos extends Repositorio<Insumo> {
  protected get modelo() { return this.db.insumo; }
  protected orden() { return { nombre: 'asc' }; }
  usos(id: number) { return this.db.recetaIngrediente.count({ where: { insumoId: id } }); }
}

export function insumoDominio(i: Insumo) {
  return new InsumoCosto({ id: i.id, nombre: i.nombre, unidad: i.unidad as Unidad, presentacion: i.presentacion, precio: i.precio, mermaPct: i.mermaPct });
}

export class ServicioInsumos extends ServicioCatalogo<Insumo> {
  protected readonly nombre = 'El insumo';
  protected readonly esquemaCrear = crear;
  protected readonly esquemaActualizar = crear.partial();
  declare protected readonly repo: RepositorioInsumos;

  protected where(f: Filtros) {
    return { archivado: f.archivados ? undefined : false, ...(f.q ? { nombre: { contains: String(f.q) } } : {}), ...(f.unidad ? { unidad: String(f.unidad) } : {}) };
  }

  protected async antesDeActualizar(actual: Insumo, datos: Record<string, unknown>) {
    // La fecha de actualización de precio solo cambia si cambia el precio o la presentación.
    const cambiaPrecio = (datos.precio != null && datos.precio !== actual.precio) || (datos.presentacion != null && datos.presentacion !== actual.presentacion);
    return cambiaPrecio ? { ...datos, precioActualizadoAt: new Date() } : datos;
  }

  protected async debeArchivar(actual: Insumo) { return (await this.repo.usos(actual.id)) > 0; }

  protected async aDTO(i: Insumo) {
    const d = insumoDominio(i);
    const dias = Math.floor((Date.now() - i.precioActualizadoAt.getTime()) / 864e5);
    return {
      ...i,
      unidadUso: d.unidadUso,
      costoUnitario: d.costoPorUnidadUso, // centavos por g, ml o u
      diasDesdeActualizacion: dias,
      desactualizado: dias >= DIAS_PRECIO_VIEJO,
    };
  }
}
