import { PrismaClient } from '@prisma/client';

/** Una sola conexión para toda la app. */
export const prisma = new PrismaClient();
export type Db = PrismaClient;
