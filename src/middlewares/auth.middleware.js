// src/middlewares/auth.middleware.js
// Authentication middleware

/**
 * Verify JWT access token
 */
export async function authenticate(request, reply) {
  try {
    await request.jwtVerify({ onlyCookie: true });
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}
