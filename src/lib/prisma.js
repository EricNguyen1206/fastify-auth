// src/lib/prisma.js
// Prisma Client singleton for database access

import { PrismaClient } from '@prisma/client';
import { config } from '../configs/variables.js';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting database connections due to hot reloading
const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
});

if (config.isDev) globalForPrisma.prisma = prisma;

// Graceful shutdown helper
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
