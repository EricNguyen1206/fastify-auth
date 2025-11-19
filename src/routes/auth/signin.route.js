// src/routes/auth/signin.route.js
// Signin route

import { signin, createAuthSession } from '../../services/auth.service.js';
import { config } from '../../configs/variables.js';

export default async function signinRoute(fastify, options) {
  fastify.post('/auth/signin', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 15 * 60 * 1000 // 5 attempts per 15 minutes
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;
    
    const user = await signin(email, password);
    
    // Create session and tokens
    const { accessToken, refreshToken } = await createAuthSession(user, fastify.jwt);
    
    // Set cookies
    reply.setCookie('token', accessToken, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutes
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    fastify.log.info(`User logged in: ${email}`);

    return reply.send({ 
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  });
}
