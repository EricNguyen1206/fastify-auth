// src/lib/prisma.js
// Prisma Client singleton for database access

import { PrismaClient } from "@prisma/client";
import { config } from "../configs/variables.js";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting database connections due to hot reloading
const globalForPrisma = global;

// Configure Prisma Client with appropriate connection string
const prismaConfig = {
  log: config.isDev ? ["query", "error", "warn"] : ["error"],
};

// Prisma will automatically use DATABASE_URI from environment
// PostgreSQL connection format: postgres://user:pass@host:port/database?sslmode=require
if (!process.env.DATABASE_URI && !config.isDev) {
  throw new Error("DATABASE_URI is required for PostgreSQL connection");
}

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaConfig);

if (config.isDev) globalForPrisma.prisma = prisma;

// Graceful shutdown helper
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
