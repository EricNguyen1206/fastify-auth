// src/routes/auth/refresh.route.js
// Refresh token route

import { refreshAccessToken } from '../../services/auth.service.js';
import { config } from '../../configs/variables.js';

export default async function refreshRoute(fastify, options) {
  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    
    try {
      const accessToken = await refreshAccessToken(refreshToken, fastify.jwt);
      
      // Set new access token
      reply.setCookie('token', accessToken, {
        httpOnly: true,
        secure: !config.isDev,
        sameSite: 'strict',
        maxAge: 15 * 60 // 15 minutes
      });
      
      fastify.log.info('Token refreshed');
      
      return reply.send({ message: 'Token refreshed successfully' });
    } catch (err) {
      // Clear cookies on error
      reply.clearCookie('token');
      reply.clearCookie('refreshToken');
      throw err;
    }
  });
}
