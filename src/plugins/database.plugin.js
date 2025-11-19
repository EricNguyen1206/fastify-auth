// src/plugins/database.plugin.js
// Database plugin to register Prisma

import fp from 'fastify-plugin';
import { prisma, disconnectPrisma } from '../lib/prisma.js';

async function databasePlugin(fastify, options) {
  // Decorate fastify instance with prisma client
  fastify.decorate('prisma', prisma);

  // Handle shutdown
  fastify.addHook('onClose', async (instance) => {
    await disconnectPrisma();
    instance.log.info('Prisma disconnected');
  });
  
  fastify.log.info('Prisma plugin registered');
}

export default fp(databasePlugin);
