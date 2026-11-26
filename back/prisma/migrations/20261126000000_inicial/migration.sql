-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negocio" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombre" TEXT NOT NULL DEFAULT 'Rojas Bakery',
    "instagram" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "zona" TEXT NOT NULL DEFAULT '',
    "mediosPago" TEXT NOT NULL DEFAULT '',
    "alias" TEXT NOT NULL DEFAULT '',
    "cbu" TEXT NOT NULL DEFAULT '',
    "validezDias" INTEGER NOT NULL DEFAULT 7,
    "politicas" TEXT NOT NULL DEFAULT '',
    "cuidados" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "margenPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "redondeoTorta" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "redondeoMesaDulce" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "valorHora" DOUBLE PRECISION,
    "horasLaborales" INTEGER,
    "horasMesServicios" INTEGER NOT NULL DEFAULT 720,
    "senaPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "avisoDias" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "presentacion" DOUBLE PRECISION NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "mermaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fotoUrl" TEXT,
    "precioActualizadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetaBase" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "escala" TEXT NOT NULL DEFAULT 'volumen',
    "rendimiento" DOUBLE PRECISION,
    "trabajoMin" INTEGER NOT NULL DEFAULT 0,
    "hornoMin" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT NOT NULL DEFAULT '',
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecetaBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetaIngrediente" (
    "id" SERIAL NOT NULL,
    "recetaId" INTEGER NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RecetaIngrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "fotoUrl" TEXT,
    "armadoMin" INTEGER NOT NULL DEFAULT 0,
    "decoracionMinUnidad" INTEGER NOT NULL DEFAULT 0,
    "porcionesMin" INTEGER,
    "porcionesMax" INTEGER,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoReceta" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "recetaId" INTEGER NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'base',
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "ProductoReceta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoVariante" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "tamano" INTEGER NOT NULL,
    "ajusteTrabajoMin" INTEGER NOT NULL DEFAULT 0,
    "ajusteHornoMin" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductoVariante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoFijo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "factor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "usaHoras" TEXT NOT NULL DEFAULT 'trabajo',
    "detalle" TEXT NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastoFijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vidaUtilAnios" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extra" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaEnvio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION,
    "esRetiro" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZonaEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "clienteNombre" TEXT NOT NULL DEFAULT '',
    "clienteTelefono" TEXT NOT NULL DEFAULT '',
    "direccion" TEXT NOT NULL DEFAULT '',
    "fechaEntrega" TIMESTAMP(3),
    "horaEntrega" TEXT NOT NULL DEFAULT '',
    "productoId" INTEGER,
    "productoNombre" TEXT NOT NULL DEFAULT '',
    "tipoProducto" TEXT,
    "tamano" INTEGER,
    "forrado" TEXT,
    "cantidad" INTEGER,
    "detalle" TEXT NOT NULL DEFAULT '',
    "fotoReferenciaUrl" TEXT,
    "zonaEnvioId" INTEGER,
    "precioProducto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "senaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sena" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porPorcion" DOUBLE PRECISION,
    "porcionesMin" INTEGER,
    "porcionesMax" INTEGER,
    "calculo" TEXT NOT NULL DEFAULT '{}',
    "emitidoAt" TIMESTAMP(3),
    "validoHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoLinea" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PresupuestoLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'senado',
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "horaEntrega" TEXT NOT NULL DEFAULT '',
    "notas" TEXT NOT NULL DEFAULT '',
    "estadoCambiadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaCompra" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "desde" TIMESTAMP(3),
    "hasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaCompraItem" (
    "id" SERIAL NOT NULL,
    "listaId" INTEGER NOT NULL,
    "insumoId" INTEGER,
    "nombre" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL,
    "comprado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ListaCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RecetaIngrediente_recetaId_insumoId_key" ON "RecetaIngrediente"("recetaId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoVariante_productoId_tamano_key" ON "ProductoVariante"("productoId", "tamano");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_numero_key" ON "Presupuesto"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_presupuestoId_key" ON "Pedido"("presupuestoId");

-- AddForeignKey
ALTER TABLE "RecetaIngrediente" ADD CONSTRAINT "RecetaIngrediente_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "RecetaBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetaIngrediente" ADD CONSTRAINT "RecetaIngrediente_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoReceta" ADD CONSTRAINT "ProductoReceta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoReceta" ADD CONSTRAINT "ProductoReceta_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "RecetaBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoVariante" ADD CONSTRAINT "ProductoVariante_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoLinea" ADD CONSTRAINT "PresupuestoLinea_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaCompraItem" ADD CONSTRAINT "ListaCompraItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaCompraItem" ADD CONSTRAINT "ListaCompraItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

