// src/routes/user/index.js
// User routes aggregator

import profileRoute from './profile.route.js';

export default async function userRoutes(fastify, options) {
  // Apply authentication to all user routes
  fastify.addHook('preHandler', fastify.authenticate);
  
  fastify.register(profileRoute);
}
