/* Pedidos (kanban y agenda): Señado → Realizado → Pago → Enviado, más Cancelado. */
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import type { Db } from '../core/db.ts';
import { Controlador } from '../core/Controlador.ts';
import { DatosInvalidos, NoEncontrado } from '../core/errores.ts';
import { ESTADOS_PEDIDO } from '../domain/valores.ts';
import { diaISO, fechaDia, numeroLabel } from './presupuestos.ts';

const incluir = { presupuesto: { include: { lineas: { orderBy: { orden: 'asc' } } } } } satisfies Prisma.PedidoInclude;
type PedidoCompleto = Prisma.PedidoGetPayload<{ include: typeof incluir }>;

const edicion = z.object({
  fechaEntrega: fechaDia, horaEntrega: z.string().regex(/^(\d{2}:\d{2})?$/), notas: z.string().max(2000),
}).partial();

export class ServicioPedidos {
  private readonly db: Db;
  constructor(db: Db) { this.db = db; }

  private dto(p: PedidoCompleto) {
    const pr = p.presupuesto;
    const envio = pr.lineas.find((l) => l.tipo === 'envio');
    const producto = pr.lineas.find((l) => l.tipo === 'producto');
    const hoy = new Date(); hoy.setUTCHours(12, 0, 0, 0);
    const dias = Math.round((p.fechaEntrega.getTime() - hoy.getTime()) / 864e5);
    return {
      id: p.id, estado: p.estado, fechaEntrega: diaISO(p.fechaEntrega), horaEntrega: p.horaEntrega, notas: p.notas,
      diasParaEntrega: dias, estadoCambiadoAt: p.estadoCambiadoAt,
      presupuestoId: pr.id, numero: numeroLabel(pr.numero),
      producto: producto?.descripcion ?? pr.productoNombre, productoNombre: pr.productoNombre,
      cliente: pr.clienteNombre, telefono: pr.clienteTelefono, direccion: pr.direccion,
      entrega: envio ? envio.descripcion : null, esRetiro: envio?.descripcion === 'Retira el cliente',
      total: pr.total, sena: pr.sena, saldo: pr.saldo, detalle: pr.detalle,
    };
  }

  async listar(f: { estado?: string; desde?: string; hasta?: string }) {
    const where: Prisma.PedidoWhereInput = {};
    if (f.estado) where.estado = f.estado;
    if (f.desde || f.hasta) {
      where.fechaEntrega = {
        ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00Z`) } : {}),
        ...(f.hasta ? { lte: new Date(`${f.hasta}T23:59:59Z`) } : {}),
      };
    }
    const ps = await this.db.pedido.findMany({ where, include: incluir, orderBy: [{ fechaEntrega: 'asc' }, { horaEntrega: 'asc' }] });
    return ps.map((p) => this.dto(p));
  }

  private async buscar(id: number) {
    const p = await this.db.pedido.findUnique({ where: { id }, include: incluir });
    if (!p) throw new NoEncontrado('El pedido');
    return p;
  }

  async obtener(id: number) { return this.dto(await this.buscar(id)); }

  async cambiarEstado(id: number, body: unknown) {
    const r = z.object({ estado: z.enum(ESTADOS_PEDIDO) }).safeParse(body);
    if (!r.success) throw new DatosInvalidos('El estado no es válido.');
    await this.buscar(id);
    await this.db.pedido.update({ where: { id }, data: { estado: r.data.estado, estadoCambiadoAt: new Date() } });
    return this.obtener(id);
  }

  async actualizar(id: number, body: unknown) {
    const r = edicion.safeParse(body);
    if (!r.success) throw new DatosInvalidos(`Revisá el campo «${r.error.issues[0]?.path.join('.')}».`);
    await this.buscar(id);
    await this.db.pedido.update({ where: { id }, data: r.data });
    return this.obtener(id);
  }
}

export class ControladorPedidos extends Controlador {
  readonly ruta = '/pedidos';
  constructor(s: ServicioPedidos) {
    super();
    this.router.get('/', this.h((req) => s.listar(req.query as Record<string, string>)));
    this.router.get('/:id', this.h((req) => s.obtener(this.id(req))));
    this.router.patch('/:id', this.h((req) => s.actualizar(this.id(req), req.body)));
    this.router.patch('/:id/estado', this.h((req) => s.cambiarEstado(this.id(req), req.body)));
  }
}
