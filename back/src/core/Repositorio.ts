/* Repositorio base sobre un modelo de Prisma. Cada catálogo lo extiende y,
   si hace falta, redefine qué relaciones incluye o cómo ordena. */
import type { Db } from './db.ts';

// Subconjunto de la API de un delegate de Prisma que usa el repositorio base.
interface Delegate {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
  count(args?: unknown): Promise<number>;
}

export abstract class Repositorio<T> {
  protected readonly db: Db;
  constructor(db: Db) { this.db = db; }

  /** El modelo de Prisma que maneja (ej. this.db.insumo). */
  protected abstract get modelo(): unknown;
  /** Relaciones a incluir al leer. */
  protected incluir(): Record<string, unknown> | undefined { return undefined; }
  protected orden(): unknown { return { id: 'asc' }; }

  private get d() { return this.modelo as Delegate; }

  listar(where: Record<string, unknown> = {}): Promise<T[]> {
    return this.d.findMany({ where, include: this.incluir(), orderBy: this.orden() }) as Promise<T[]>;
  }
  buscar(id: number): Promise<T | null> {
    return this.d.findUnique({ where: { id }, include: this.incluir() }) as Promise<T | null>;
  }
  crear(data: Record<string, unknown>): Promise<T> {
    return this.d.create({ data, include: this.incluir() }) as Promise<T>;
  }
  actualizar(id: number, data: Record<string, unknown>): Promise<T> {
    return this.d.update({ where: { id }, data, include: this.incluir() }) as Promise<T>;
  }
  borrar(id: number): Promise<unknown> {
    return this.d.delete({ where: { id } });
  }
  contar(where: Record<string, unknown> = {}): Promise<number> {
    return this.d.count({ where });
  }
}
