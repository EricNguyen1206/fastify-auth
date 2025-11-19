// src/routes/auth/signout.route.js
// Signout route

import { signout } from '../../services/auth.service.js';

export default async function signoutRoute(fastify, options) {
  fastify.post('/auth/signout', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    
    await signout(refreshToken);
    
    // Clear cookies
    reply.clearCookie('token');
    reply.clearCookie('refreshToken');
    
    fastify.log.info(`User logged out: ${request.user.email}`);
    
    return reply.send({ message: 'Logged out successfully' });
  });
}
