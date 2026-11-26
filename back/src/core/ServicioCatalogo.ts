/* Servicio base para catálogos configurables (insumos, recetas, productos, gastos, extras...).
   Valida con Zod, aplica ganchos antes de crear o actualizar y decide si borrar o archivar. */
import type { z } from 'zod';
import { DatosInvalidos, NoEncontrado } from './errores.ts';
import type { Repositorio } from './Repositorio.ts';

export interface Filtros { q?: string; archivados?: boolean; [k: string]: unknown }

export abstract class ServicioCatalogo<T extends { id: number }, DTO = unknown> {
  protected readonly repo: Repositorio<T>;
  protected abstract readonly nombre: string; // "El insumo", para los mensajes
  protected abstract readonly esquemaCrear: z.ZodType<Record<string, unknown>>;
  protected abstract readonly esquemaActualizar: z.ZodType<Record<string, unknown>>;

  constructor(repo: Repositorio<T>) { this.repo = repo; }

  // ---- Ganchos que los catálogos pueden redefinir ----
  protected where(_f: Filtros): Record<string, unknown> { return {}; }
  protected async antesDeCrear(datos: Record<string, unknown>): Promise<Record<string, unknown>> { return datos; }
  protected async antesDeActualizar(_actual: T, datos: Record<string, unknown>): Promise<Record<string, unknown>> { return datos; }
  /** Por defecto se borra. Los catálogos con "borrado seguro" devuelven true para archivar. */
  protected async debeArchivar(_actual: T): Promise<boolean> { return false; }
  protected async aDTO(e: T): Promise<DTO> { return e as unknown as DTO; }
  protected async aDTOs(es: T[]): Promise<DTO[]> { return Promise.all(es.map((e) => this.aDTO(e))); }
  /** Para relaciones anidadas (ingredientes de una receta, recetas de un producto). */
  protected async guardar(id: number | null, datos: Record<string, unknown>): Promise<T> {
    return id == null ? this.repo.crear(datos) : this.repo.actualizar(id, datos);
  }

  // ---- Operaciones ----
  async listar(f: Filtros = {}): Promise<DTO[]> {
    return this.aDTOs(await this.repo.listar(this.where(f)));
  }

  async obtenerEntidad(id: number): Promise<T> {
    const e = await this.repo.buscar(id);
    if (!e) throw new NoEncontrado(this.nombre);
    return e;
  }

  async obtener(id: number): Promise<DTO> { return this.aDTO(await this.obtenerEntidad(id)); }

  async crear(body: unknown): Promise<DTO> {
    const datos = await this.antesDeCrear(this.validar(this.esquemaCrear, body));
    return this.aDTO(await this.guardar(null, datos));
  }

  async actualizar(id: number, body: unknown): Promise<DTO> {
    const actual = await this.obtenerEntidad(id);
    const datos = await this.antesDeActualizar(actual, this.validar(this.esquemaActualizar, body));
    return this.aDTO(await this.guardar(id, datos));
  }

  /** Borrado seguro: si está en uso, se archiva en vez de borrarse. */
  async eliminar(id: number): Promise<{ archivado: boolean }> {
    const actual = await this.obtenerEntidad(id);
    if (await this.debeArchivar(actual)) {
      await this.repo.actualizar(id, { archivado: true });
      return { archivado: true };
    }
    await this.repo.borrar(id);
    return { archivado: false };
  }

  protected validar<S>(esquema: z.ZodType<S>, body: unknown): S {
    const r = esquema.safeParse(body);
    if (!r.success) {
      const primero = r.error.issues[0];
      const campo = primero?.path.join('.') || 'datos';
      throw new DatosInvalidos(`Revisá el campo «${campo}»: ${primero?.message ?? 'dato inválido'}.`, r.error.issues);
    }
    return r.data;
  }
}
