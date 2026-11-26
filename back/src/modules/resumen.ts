/* Resumen mensual: se calcula con los pedidos del mes (no cancelados) y el snapshot de cada presupuesto. */
import { z } from 'zod';
import type { Db } from '../core/db.ts';
import { Controlador } from '../core/Controlador.ts';
import { DatosInvalidos } from '../core/errores.ts';

interface CalculoGuardado { costoTotal?: number; ingredientes?: number; manoDeObra?: number; gastosNegocio?: number; servicios?: number; trabajoMin?: number }

export class ServicioResumen {
  private readonly db: Db;
  constructor(db: Db) { this.db = db; }

  async mes(mesParam?: string) {
    const hoy = new Date();
    const mes = mesParam ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    if (!z.string().regex(/^\d{4}-\d{2}$/).safeParse(mes).success) throw new DatosInvalidos('El mes tiene que tener el formato AAAA-MM.');
    const [a, m] = mes.split('-').map(Number) as [number, number];
    const desde = new Date(Date.UTC(a, m - 1, 1));
    const hasta = new Date(Date.UTC(a, m, 1));
    const diasMes = new Date(Date.UTC(a, m, 0)).getUTCDate();

    const [pedidos, cfg] = await Promise.all([
      this.db.pedido.findMany({
        where: { estado: { not: 'cancelado' }, fechaEntrega: { gte: desde, lt: hasta } },
        include: { presupuesto: { select: { total: true, precioProducto: true, productoNombre: true, calculo: true } } },
      }),
      this.db.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    ]);

    const semanas = [
      { label: '1–7', desde: 1, hasta: 7 }, { label: '8–14', desde: 8, hasta: 14 }, { label: '15–21', desde: 15, hasta: 21 },
      { label: `22–${diasMes}`, desde: 22, hasta: diasMes },
    ].map((s) => ({ ...s, valor: 0 }));
    const comp = { ingredientes: 0, manoDeObra: 0, gastosNegocio: 0, servicios: 0 };
    const productos = new Map<string, { nombre: string; pedidos: number; monto: number }>();
    let ventas = 0, costo = 0, ganancia = 0, minutos = 0;

    for (const p of pedidos) {
      const c = JSON.parse(p.presupuesto.calculo || '{}') as CalculoGuardado;
      ventas += p.presupuesto.total;
      costo += c.costoTotal ?? 0;
      ganancia += p.presupuesto.precioProducto - (c.costoTotal ?? 0); // extras y envío no suman ganancia
      minutos += c.trabajoMin ?? 0;
      comp.ingredientes += c.ingredientes ?? 0;
      comp.manoDeObra += c.manoDeObra ?? 0;
      comp.gastosNegocio += c.gastosNegocio ?? 0;
      comp.servicios += c.servicios ?? 0;
      const dia = p.fechaEntrega.getUTCDate();
      const s = semanas.find((x) => dia >= x.desde && dia <= x.hasta);
      if (s) s.valor += p.presupuesto.total;
      const nombre = p.presupuesto.productoNombre || 'Sin producto';
      const prev = productos.get(nombre) ?? { nombre, pedidos: 0, monto: 0 };
      prev.pedidos += 1; prev.monto += p.presupuesto.total;
      productos.set(nombre, prev);
    }

    const totalComp = Object.values(comp).reduce((x, y) => x + y, 0);
    const pct = (v: number) => (totalComp ? Math.round((v / totalComp) * 100) : 0);
    return {
      mes, ventas, costo, ganancia, pedidos: pedidos.length,
      horas: Math.round((minutos / 60) * 10) / 10,
      horasLaborales: cfg.horasLaborales,
      ticketPromedio: pedidos.length ? Math.round(ventas / pedidos.length) : 0,
      semanas: semanas.map(({ label, valor }) => ({ label, valor })),
      composicion: [
        { clave: 'ingredientes', label: 'Ingredientes', pct: pct(comp.ingredientes) },
        { clave: 'manoDeObra', label: 'Mano de obra', pct: pct(comp.manoDeObra) },
        { clave: 'gastosNegocio', label: 'Gastos del negocio', pct: pct(comp.gastosNegocio) },
        { clave: 'servicios', label: 'Servicios', pct: pct(comp.servicios) },
      ],
      masVendidos: [...productos.values()].sort((x, y) => y.monto - x.monto).slice(0, 5),
    };
  }
}

export class ControladorResumen extends Controlador {
  readonly ruta = '/resumen';
  constructor(s: ServicioResumen) {
    super();
    this.router.get('/', this.h((req) => s.mes(req.query.mes as string | undefined)));
  }
}
