-- El tamaño de las tortas y sus ajustes de tiempo pasan al presupuesto; productos y presupuestos
-- pueden sumar ingredientes sueltos además de las recetas base.

-- AlterTable
ALTER TABLE "Presupuesto" ADD COLUMN "ajusteTrabajoMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ajusteHornoMin" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductoInsumo" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductoInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoInsumo" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PresupuestoInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductoInsumo_productoId_insumoId_key" ON "ProductoInsumo"("productoId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoInsumo_presupuestoId_insumoId_key" ON "PresupuestoInsumo"("presupuestoId", "insumoId");

-- AddForeignKey
ALTER TABLE "ProductoInsumo" ADD CONSTRAINT "ProductoInsumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoInsumo" ADD CONSTRAINT "ProductoInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoInsumo" ADD CONSTRAINT "PresupuestoInsumo_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoInsumo" ADD CONSTRAINT "PresupuestoInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
