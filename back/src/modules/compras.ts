/* Lista de compras: estándar, personalizadas y generadas desde los pedidos señados de un rango de fechas. */
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Repositorio } from '../core/Repositorio.ts';
import { ServicioCatalogo, type Filtros } from '../core/ServicioCatalogo.ts';
import { ControladorCatalogo } from '../core/Controlador.ts';
import { DatosInvalidos } from '../core/errores.ts';
import { idRef, nombre } from '../core/esquemas.ts';
import type { Db } from '../core/db.ts';
import { TIPOS_LISTA, type Unidad } from '../domain/valores.ts';
import { InsumoCosto } from '../domain/costos.ts';
import { fechaDia, diaISO } from './presupuestos.ts';

const item = z.object({ insumoId: idRef.nullable().optional(), nombre, cantidad: z.number().min(0), unidad: z.enum(['g', 'ml', 'u']), comprado: z.boolean().default(false) });
const crear = z.object({ nombre, tipo: z.enum(TIPOS_LISTA).default('personalizada'), items: z.array(item).default([]) });

const incluir = { items: { include: { insumo: true }, orderBy: { id: 'asc' } } } satisfies Prisma.ListaCompraInclude;
type ListaCompleta = Prisma.ListaCompraGetPayload<{ include: typeof incluir }>;

export class RepositorioListas extends Repositorio<ListaCompleta> {
  protected get modelo() { return this.db.listaCompra; }
  protected incluir() { return incluir; }
  protected orden() { return { createdAt: 'desc' }; }
  marcar(itemId: number, listaId: number, comprado: boolean) {
    return this.db.listaCompraItem.updateMany({ where: { id: itemId, listaId }, data: { comprado } });
  }
  pedidosSenados(desde: Date, hasta: Date) {
    return this.db.pedido.findMany({
      where: { estado: 'senado', fechaEntrega: { gte: new Date(desde.getTime() - 12 * 36e5), lte: new Date(hasta.getTime() + 12 * 36e5) } },
      include: { presupuesto: { select: { calculo: true } } },
    });
  }
}

export class ServicioListas extends ServicioCatalogo<ListaCompleta> {
  protected readonly nombre = 'La lista';
  protected readonly esquemaCrear = crear;
  protected readonly esquemaActualizar = crear.partial();
  declare protected readonly repo: RepositorioListas;

  constructor(db: Db) { super(new RepositorioListas(db)); }

  protected where(f: Filtros) { return f.tipo ? { tipo: String(f.tipo) } : {}; }

  protected async guardar(id: number | null, datos: Record<string, unknown>) {
    const { items, ...campos } = datos as { items?: unknown[] } & Record<string, unknown>;
    if (id == null) return this.repo.crear({ ...campos, items: { create: items ?? [] } });
    return this.repo.actualizar(id, { ...campos, ...(items ? { items: { deleteMany: {}, create: items } } : {}) });
  }

  protected async aDTO(l: ListaCompleta) {
    const costo = l.items.reduce((s, i) => {
      if (!i.insumo) return s;
      const d = new InsumoCosto({ id: i.insumo.id, nombre: i.insumo.nombre, unidad: i.insumo.unidad as Unidad, presentacion: i.insumo.presentacion, precio: i.insumo.precio });
      return s + d.costoDe(i.cantidad);
    }, 0);
    return {
      id: l.id, nombre: l.nombre, tipo: l.tipo, desde: diaISO(l.desde), hasta: diaISO(l.hasta), createdAt: l.createdAt,
      items: l.items.map((i) => ({ id: i.id, insumoId: i.insumoId, nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad, comprado: i.comprado })),
      comprados: l.items.filter((i) => i.comprado).length,
      costoEstimado: costo,
    };
  }

  async marcar(listaId: number, itemId: number, body: unknown) {
    const r = z.object({ comprado: z.boolean() }).safeParse(body);
    if (!r.success) throw new DatosInvalidos('Falta indicar si está comprado.');
    await this.repo.marcar(itemId, listaId, r.data.comprado);
    return this.obtener(listaId);
  }

  /** Suma los insumos de los pedidos señados con entrega entre dos fechas (usa el snapshot de cada presupuesto). */
  async generar(body: unknown) {
    const r = z.object({ desde: fechaDia, hasta: fechaDia, nombre: z.string().trim().max(120).optional() }).safeParse(body);
    if (!r.success) throw new DatosInvalidos('Elegí las fechas desde y hasta.');
    const { desde, hasta } = r.data;
    if (hasta < desde) throw new DatosInvalidos('La fecha "hasta" no puede ser anterior a "desde".');
    const pedidos = await this.repo.pedidosSenados(desde, hasta);
    if (!pedidos.length) throw new DatosInvalidos('No hay pedidos señados con entrega en esas fechas.');
    const suma = new Map<number, { insumoId: number; nombre: string; cantidad: number; unidad: string }>();
    for (const p of pedidos) {
      const insumos = (JSON.parse(p.presupuesto.calculo || '{}').insumos ?? []) as { insumoId: number; nombre: string; cantidad: number; unidad: string }[];
      for (const i of insumos) {
        const prev = suma.get(i.insumoId) ?? { ...i, cantidad: 0 };
        prev.cantidad += i.cantidad;
        suma.set(i.insumoId, prev);
      }
    }
    const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const l = await this.repo.crear({
      nombre: r.data.nombre || `Del ${fmt(desde)} al ${fmt(hasta)}`, tipo: 'pedidos', desde, hasta,
      items: { create: [...suma.values()].map((i) => ({ ...i, cantidad: Math.ceil(i.cantidad) })) },
    });
    return { ...(await this.aDTO(l)), pedidos: pedidos.length };
  }
}

export class ControladorListas extends ControladorCatalogo<ServicioListas> {
  protected rutasExtra() {
    this.router.post('/generar', this.h(async (req, res) => { res.status(201); return this.servicio.generar(req.body); }));
    this.router.patch('/:id/items/:itemId', this.h((req) => this.servicio.marcar(this.id(req), this.id(req, 'itemId'), req.body)));
  }
}
