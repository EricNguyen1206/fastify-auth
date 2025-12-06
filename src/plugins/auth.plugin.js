// Auth plugin to register JWT and Cookie
import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import fastifyJWT from '@fastify/jwt';
import { config } from '../configs/variables.js';
import { authenticate } from '../middlewares/auth.middleware.js';

async function authPlugin(fastify, _options) {
  // Register Cookie
  fastify.register(fastifyCookie, {
    secret: config.cookie.secret
  });

  // Register JWT
  fastify.register(fastifyJWT, {
    secret: config.jwt.secret,
    cookie: {
      cookieName: 'token',
      signed: false
    }
  });

  // Decorate with auth middleware
  fastify.decorate('authenticate', authenticate);
  
  fastify.log.info('Auth plugin registered');
}

export default fp(authPlugin);
