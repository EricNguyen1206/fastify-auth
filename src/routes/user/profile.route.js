// src/routes/user/profile.route.js
// User profile routes

import { getUserProfile, updateUserProfile } from '../../services/user.service.js';

export default async function profileRoute(fastify, options) {
  // GET profile
  fastify.get('/user/profile', async (request, reply) => {
    const userId = request.user.userId;
    const user = await getUserProfile(userId);
    return reply.send({ user });
  });

  // UPDATE profile
  fastify.put('/user/profile', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.userId;
    const updates = request.body;
    
    const user = await updateUserProfile(userId, updates);
    
    fastify.log.info(`User profile updated: ${user.email}`);
    
    return reply.send({ 
      message: 'Profile updated successfully',
      user 
    });
  });
}
