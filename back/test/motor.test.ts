/* Tests del motor de cálculo: reproducen rojas-bakery-design/docs/casos-de-prueba.md. Uso: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContextoCostos, InsumoCosto, RecetaCosto, amortizacionMensual } from '../src/domain/costos.ts';
import { CalculadoraBudin, CalculadoraMesaDulce, CalculadoraTorta, Cotizacion, type ProductoCalculable } from '../src/domain/calculadoras.ts';
import { escalaTorta, redondearArriba } from '../src/domain/valores.ts';
import { DomainError } from '../src/domain/errores.ts';

const $ = (pesos: number) => Math.round(pesos * 100);
const cerca = (real: number, esperadoPesos: number) => assert.ok(Math.abs(real - $(esperadoPesos)) < 1, `${real / 100} ≠ ${esperadoPesos}`);

const producto = (p: Partial<ProductoCalculable>): ProductoCalculable => ({
  nombre: 'Prueba', tipo: 'torta', armadoMin: 0, decoracionMinUnidad: 0, porcionesMin: null, porcionesMax: null, recetas: [], ...p,
});

// ---------- Caso 1: alfajores de maicena ----------
test('caso 1: alfajores de maicena → $20.300 y $20.630 con packaging', () => {
  let id = 0;
  const ins = (nombre: string, unidad: 'kg' | 'unidad', presentacion: number, precio: number) =>
    new InsumoCosto({ id: ++id, nombre, unidad, presentacion, precio: $(precio) });
  const ingredientes = [
    { insumo: ins('Manteca', 'kg', 0.2, 3600), cantidad: 200 },
    { insumo: ins('Azúcar impalpable', 'kg', 1, 4000), cantidad: 160 },
    { insumo: ins('Vainillín', 'kg', 1, 3600), cantidad: 4 },
    { insumo: ins('Limón', 'unidad', 1, 400), cantidad: 1 },
    { insumo: ins('Miel', 'kg', 0.5, 6900), cantidad: 4 },
    { insumo: ins('Yemas', 'unidad', 30, 7000), cantidad: 3 },
    { insumo: ins('Almidón de maíz', 'kg', 1, 3360), cantidad: 400 },
    { insumo: ins('Premezcla', 'kg', 1, 5150), cantidad: 100 },
    { insumo: ins('Polvo de hornear', 'kg', 0.25, 2500), cantidad: 5 },
    { insumo: ins('Bicarbonato', 'kg', 0.25, 3600), cantidad: 2 },
    { insumo: ins('Dulce de leche', 'kg', 1, 7900), cantidad: 600 },
  ];
  const receta = new RecetaCosto({ nombre: 'Masa de alfajores', escala: 'ninguna', trabajoMin: 60, hornoMin: 0, ingredientes });
  const ctx = new ContextoCostos({
    margenPct: 30, redondeoTorta: $(100), redondeoMesaDulce: $(100), valorHora: $(3500), horasLaborales: 160,
    servicios: [], gastosExclusivos: 0, amortizacion: 0, senaPct: 50,
  });
  const r = new CalculadoraBudin(ctx).calcular(producto({ tipo: 'budin', recetas: [{ receta, rol: 'base', cantidad: 1 }] }));
  cerca(r.ingredientes, 12087.4);
  cerca(r.manoDeObra, 3500);
  cerca(r.costoTotal, 15587.4);
  cerca(r.conMargen, 20263.62);
  assert.equal(r.precio, $(20300));
  const cot = new Cotizacion({ precioProducto: r.precio, extras: [{ nombre: 'Packaging', precio: $(330) }], envio: null, senaPct: 50 });
  assert.equal(cot.total, $(20630));
});

// ---------- Caso 2: Torta Red Velvet ----------
const ctxCaso2 = () => new ContextoCostos({
  margenPct: 30, redondeoTorta: $(100), redondeoMesaDulce: $(100), valorHora: $(3500), horasLaborales: 160,
  servicios: [
    { nombre: 'Luz', factura: $(60000), factor: 1.5, usaHoras: 'trabajo' },
    { nombre: 'Gas', factura: $(45000), factor: 3, usaHoras: 'horno' },
    { nombre: 'Agua', factura: $(15000), factor: 1, usaHoras: 'trabajo' },
    { nombre: 'Internet', factura: $(18000), factor: 1, usaHoras: 'trabajo' },
  ],
  gastosExclusivos: $(42000 + 25000 + 20000 + 8000),
  amortizacion: Math.round([800000, 800000, 1500000, 800000].reduce((s, v) => s + amortizacionMensual($(v), 10), 0)),
  senaPct: 50,
});
const redVelvet = producto({
  nombre: 'Torta Red Velvet', armadoMin: 120,
  recetas: [
    { rol: 'base', cantidad: 1, receta: new RecetaCosto({ nombre: 'Bizcochuelo', escala: 'volumen', trabajoMin: 40, hornoMin: 45, costo: $(14200) }) },
    { rol: 'base', cantidad: 1, receta: new RecetaCosto({ nombre: 'Frosting', escala: 'volumen', trabajoMin: 20, hornoMin: 0, costo: $(9600) }) },
    { rol: 'forrado_buttercream', cantidad: 1, receta: new RecetaCosto({ nombre: 'Buttercream', escala: 'superficie', trabajoMin: 30, hornoMin: 0, costo: $(6800) }) },
    { rol: 'forrado_pasta', cantidad: 1, receta: new RecetaCosto({ nombre: 'Pasta', escala: 'superficie', trabajoMin: 45, hornoMin: 0, costo: $(8900) }) },
  ],
});

test('caso 2: tarifas por hora y amortización', () => {
  const ctx = ctxCaso2();
  assert.equal(ctx.amortizacion, $(32500));
  cerca(ctx.serviciosPorHoraTrabajo, 170.8333);
  cerca(ctx.serviciosPorHoraHorno, 187.5);
  cerca(ctx.gastosPorHora, 796.875);
});

test('caso 2: las 4 variantes de la Red Velvet', () => {
  const calc = new CalculadoraTorta(ctxCaso2());
  const casos = [
    { tamano: 18, forrado: 'buttercream', ingr: 25262, serv: 738.54, gastos: 2789.06, mo: 12250, costo: 41039.6, precio: 53400 },
    { tamano: 20, forrado: 'buttercream', ingr: 30600, serv: 738.54, gastos: 2789.06, mo: 12250, costo: 46377.6, precio: 60300 },
    { tamano: 22, forrado: 'buttercream', ingr: 36414, serv: 738.54, gastos: 2789.06, mo: 12250, costo: 52191.6, precio: 67900 },
    { tamano: 20, forrado: 'pasta', ingr: 32700, serv: 781.25, gastos: 2988.28, mo: 13125, costo: 49594.53, precio: 64500 },
  ] as const;
  for (const c of casos) {
    const r = calc.calcular(redVelvet, { tamano: c.tamano, forrado: c.forrado });
    cerca(r.ingredientes, c.ingr);
    cerca(r.servicios, c.serv);
    cerca(r.gastosNegocio, c.gastos);
    cerca(r.manoDeObra, c.mo);
    cerca(r.costoTotal, c.costo);
    assert.equal(r.precio, $(c.precio), `${c.tamano} cm ${c.forrado}`);
  }
});

test('caso 2: presupuesto 20 cm con topper y envío → $69.800, seña $34.900, porción $2.010', () => {
  const r = new CalculadoraTorta(ctxCaso2()).calcular(redVelvet, { tamano: 20, forrado: 'buttercream' });
  assert.equal(r.trabajoMin, 210);
  assert.equal(r.hornoMin, 45);
  const cot = new Cotizacion({ precioProducto: r.precio, extras: [{ nombre: 'Topper', precio: $(4500) }], envio: { nombre: 'CABA', precio: $(5000) }, senaPct: 50 });
  assert.equal(cot.total, $(69800));
  assert.equal(cot.sena, $(34900));
  assert.equal(Math.round(r.porPorcion! / 100), 2010);
});

// ---------- Caso 3: mesa dulce ----------
test('caso 3: 30 cookies de una receta que rinde 24 = 1,25 recetas y 2 tandas', () => {
  const ctx = new ContextoCostos({
    margenPct: 30, redondeoTorta: $(100), redondeoMesaDulce: $(100), valorHora: $(3500), horasLaborales: 160,
    servicios: [], gastosExclusivos: 0, amortizacion: 0, senaPct: 50,
  });
  const masa = new RecetaCosto({ nombre: 'Masa de cookies', escala: 'ninguna', trabajoMin: 30, hornoMin: 12, rendimiento: 24, costo: $(4000) });
  const r = new CalculadoraMesaDulce(ctx).calcular(
    producto({ tipo: 'mesa_dulce', decoracionMinUnidad: 2, recetas: [{ receta: masa, rol: 'base', cantidad: 1 }] }), { cantidad: 30 });
  cerca(r.ingredientes, 5000); // 1,25 × 4.000
  assert.equal(r.tandas, 2);
  assert.equal(r.trabajoMin, 30 * 2 + 2 * 30); // 2 tandas de masa + 2 min × 30 decoración
  assert.equal(r.hornoMin, 24);
  assert.equal(r.precio % $(100), 0); // se redondea el total
  assert.equal(r.porPorcion, r.precio / 30); // por unidad exacto
});

test('mesa dulce: fuera de 4 a 36 unidades da error', () => {
  const ctx = ctxCaso2();
  const p = producto({ tipo: 'mesa_dulce' });
  assert.throws(() => new CalculadoraMesaDulce(ctx).calcular(p, { cantidad: 3 }), DomainError);
  assert.throws(() => new CalculadoraMesaDulce(ctx).calcular(p, { cantidad: 37 }), DomainError);
});

// ---------- Bordes ----------
test('redondeo siempre hacia arriba', () => {
  assert.equal(redondearArriba($(1150) * 1.3, $(100)), $(1500));
  assert.equal(redondearArriba($(1501), $(100)), $(1600));
  assert.equal(redondearArriba($(1500), $(100)), $(1500));
});

test('merma: 0% no cambia el costo; 15% deja 850 g útiles de 1 kg', () => {
  const sin = new InsumoCosto({ id: 1, nombre: 'Harina', unidad: 'kg', presentacion: 1, precio: $(1000) });
  const con = new InsumoCosto({ id: 2, nombre: 'Frutillas', unidad: 'kg', presentacion: 1, precio: $(1000), mermaPct: 15 });
  assert.equal(sin.costoDe(1000), $(1000));
  assert.equal(con.cantidadUtil, 850);
  cerca(con.costoDe(850), 1000);
});

test('unidades: no se puede usar en gramos un insumo por unidad', () => {
  const huevos = new InsumoCosto({ id: 1, nombre: 'Huevos', unidad: 'unidad', presentacion: 30, precio: $(7000) });
  assert.throws(() => huevos.validarUnidad('g'), DomainError);
  assert.doesNotThrow(() => huevos.validarUnidad('u'));
});

test('avisa lo que falta cargar', () => {
  const ctx = new ContextoCostos({
    margenPct: 30, redondeoTorta: $(100), redondeoMesaDulce: $(100), valorHora: null, horasLaborales: null,
    servicios: [], gastosExclusivos: 0, amortizacion: 0, senaPct: 30,
  });
  assert.equal(ctx.avisos.length, 3);
  assert.equal(ctx.gastosPorHora, 0);
});

test('tamaño libre: 18, 20 y 22 cm conservan los factores; otros diámetros escalan por volumen y superficie', () => {
  assert.deepEqual(escalaTorta(18), { volumen: 0.81, superficie: 0.88, porciones: [25, 28] });
  assert.deepEqual(escalaTorta(20), { volumen: 1, superficie: 1, porciones: [30, 35] });
  assert.deepEqual(escalaTorta(22), { volumen: 1.21, superficie: 1.12, porciones: [40, 45] });
  const e24 = escalaTorta(24);
  assert.equal(e24.volumen, 1.44);
  assert.ok(e24.superficie > 1.12 && e24.superficie < e24.volumen);
  assert.deepEqual(e24.porciones, [43, 50]);
  assert.throws(() => escalaTorta(9), DomainError);
  assert.throws(() => escalaTorta(20.5), DomainError);
  const calc = new CalculadoraTorta(ctxCaso2());
  const r = calc.calcular(redVelvet, { tamano: 24, forrado: 'buttercream' });
  cerca(r.ingredientes, (14200 + 9600) * 1.44 + 6800 * e24.superficie);
  assert.equal(r.tamano, 24);
  assert.equal(r.tamanoUnico, false);
});

test('tamaño único: si una receta no escala, la torta ignora el tamaño y usa las recetas tal cual', () => {
  const calc = new CalculadoraTorta(ctxCaso2());
  const conTopper = producto({ ...redVelvet, recetas: [...redVelvet.recetas,
    { rol: 'base', cantidad: 1, receta: new RecetaCosto({ nombre: 'Topper de azúcar', escala: 'ninguna', trabajoMin: 0, hornoMin: 0, costo: $(1000) }) }] });
  const a = calc.calcular(conTopper, { tamano: 18, forrado: 'buttercream' });
  const b = calc.calcular(conTopper, { tamano: 22, forrado: 'buttercream' });
  cerca(a.ingredientes, 14200 + 9600 + 6800 + 1000);
  assert.equal(a.precio, b.precio);
  assert.equal(a.tamano, null);
  assert.equal(a.tamanoUnico, true);
});

test('ajustes de tiempo del presupuesto: suman o restan y nunca dejan tiempo negativo', () => {
  const calc = new CalculadoraTorta(ctxCaso2());
  // 20 cm buttercream: 40 + 20 + 30 de recetas + 120 de armado = 210 min; horno 45.
  const t = (ajusteTrabajoMin: number, ajusteHornoMin: number) => calc.calcular(redVelvet, { tamano: 22, forrado: 'buttercream', ajusteTrabajoMin, ajusteHornoMin });
  assert.deepEqual([t(0, 0).trabajoMin, t(0, 0).hornoMin], [210, 45]);
  assert.deepEqual([t(15, 10).trabajoMin, t(15, 10).hornoMin], [225, 55]);
  assert.deepEqual([t(-10, -100).trabajoMin, t(-10, -100).hornoMin], [200, 0]);
});

test('ingredientes sueltos: los del producto no escalan (en mesa dulce van por unidad) y los del presupuesto se suman', () => {
  const ctx = ctxCaso2();
  const caja = new InsumoCosto({ id: 90, nombre: 'Caja', unidad: 'unidad', presentacion: 1, precio: $(500) });
  const frutillas = new InsumoCosto({ id: 91, nombre: 'Frutillas', unidad: 'kg', presentacion: 1, precio: $(4000) });
  const torta = producto({ ...redVelvet, insumos: [{ insumo: caja, cantidad: 1 }] });
  const base = new CalculadoraTorta(ctx).calcular(redVelvet, { tamano: 22, forrado: 'buttercream' });
  const r = new CalculadoraTorta(ctx).calcular(torta, { tamano: 22, forrado: 'buttercream', insumosExtra: [{ insumo: frutillas, cantidad: 250 }] });
  cerca(r.ingredientes - base.ingredientes, 500 + 1000);
  assert.deepEqual(r.sueltos.map((x) => [x.nombre, x.cantidad, x.origen]), [['Caja', 1, 'producto'], ['Frutillas', 250, 'presupuesto']]);
  assert.ok(r.insumos.some((i) => i.insumoId === 91 && i.cantidad === 250));

  const pirotin = new InsumoCosto({ id: 92, nombre: 'Pirotín', unidad: 'unidad', presentacion: 100, precio: $(1000) });
  const mesa = new CalculadoraMesaDulce(ctx).calcular(producto({ tipo: 'mesa_dulce', insumos: [{ insumo: pirotin, cantidad: 1 }] }), { cantidad: 30 });
  cerca(mesa.ingredientes, 300); // 30 pirotines × $10
});
