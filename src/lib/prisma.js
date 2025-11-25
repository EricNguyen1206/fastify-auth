// src/lib/prisma.js
// Prisma Client singleton for database access

import { PrismaClient } from '@prisma/client';
import { config } from '../configs/variables.js';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting database connections due to hot reloading
const globalForPrisma = global;

// Configure Prisma Client with appropriate connection string
const prismaConfig = {
  log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
};

// For SQLiteCloud, ensure DATABASE_URL is set correctly
if (config.database.type === 'sqlitecloud') {
  if (!config.database.url) {
    throw new Error('DATABASE_URL or DB_CONNECTION_STRING is required for SQLiteCloud');
  }
  // Prisma will use the connection string from DATABASE_URL
  // SQLiteCloud connection format: sqlitecloud://user:pass@host:port/database
  process.env.DATABASE_URL = config.database.url;
}

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaConfig);

if (config.isDev) globalForPrisma.prisma = prisma;

// Graceful shutdown helper
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
