// Database plugin to register Prisma
import fp from 'fastify-plugin';
import { prisma, disconnectPrisma } from '../configs/prisma.js';
import { ensureDefaultRoles } from '../repositories/role.repository.js';

async function databasePlugin(fastify, _options) {
  // Decorate fastify instance with prisma client
  fastify.decorate('prisma', prisma);

  // Seed default roles (user, admin)
  await ensureDefaultRoles();
  fastify.log.info('Default roles seeded (user, admin)');

  // Handle shutdown
  fastify.addHook('onClose', async (instance) => {
    await disconnectPrisma();
    instance.log.info('Prisma disconnected');
  });
  
  fastify.log.info('Prisma plugin registered');
}

export default fp(databasePlugin);
