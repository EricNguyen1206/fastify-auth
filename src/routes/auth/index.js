// src/routes/auth/index.js
// Auth routes aggregator

import signupRoute from './signup.route.js';
import signinRoute from './signin.route.js';
import signoutRoute from './signout.route.js';
import refreshRoute from './refresh.route.js';

export default async function authRoutes(fastify, options) {
  fastify.register(signupRoute);
  fastify.register(signinRoute);
  fastify.register(signoutRoute);
  fastify.register(refreshRoute);
}
