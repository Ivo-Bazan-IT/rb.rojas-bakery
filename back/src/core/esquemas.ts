/* Piezas de validación compartidas. Los montos viajan en centavos enteros. */
import { z } from 'zod';

export const centavos = z.number().int('tiene que ser un monto entero en centavos').min(0, 'no puede ser negativo');
export const texto = (max = 200) => z.string().trim().max(max);
export const nombre = z.string().trim().min(1, 'no puede quedar vacío').max(120);
export const minutos = z.number().int().min(0).max(24 * 60 * 7);
export const porcentaje = z.number().min(0).max(100);
export const fecha = z.coerce.date();
export const idRef = z.number().int().positive();
