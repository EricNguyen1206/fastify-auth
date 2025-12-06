// src/routes/auth/signup.route.js
// Signup route

import { signup } from '../../services/auth.service.js';

export default async function signupRoute(fastify, options) {
  fastify.post('/auth/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          fullName: { type: 'string', minLength: 2 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            userId: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, fullName } = request.body;
    
    try {
      const user = await signup(email, password, fullName);
      
      fastify.log.info(`User registered: ${email}`);
      
      return reply.code(201).send({ 
        message: 'User registered successfully',
        userId: user.id 
      });
    } catch (err) {
      throw err;
    }
  });
}
