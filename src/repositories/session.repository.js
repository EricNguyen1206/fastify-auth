// src/repositories/session.repository.js
// Session repository - data access layer for session/refresh token operations

import { prisma } from '../lib/prisma.js';

/**
 * Create a new session with refresh token
 * @param {number} userId - User ID
 * @param {string} refreshToken - Refresh token string
 * @param {Date} expiresAt - Token expiration date
 * @returns {Promise<Object>} Created session object
 */
export async function createSession(userId, refreshToken, expiresAt) {
  return await prisma.session.create({
    data: {
      userId,
      refreshToken,
      expiresAt,
    },
  });
}

/**
 * Find valid session by refresh token and user ID
 * @param {string} refreshToken - Refresh token to find
 * @param {number} userId - User ID to verify ownership
 * @returns {Promise<Object|null>} Session object or null if not found/expired
 */
export async function findSessionByToken(refreshToken, userId) {
  return await prisma.session.findFirst({
    where: {
      refreshToken,
      userId,
      expiresAt: {
        gt: new Date(), // Greater than now (not expired)
      },
    },
  });
}

/**
 * Delete session by refresh token
 * @param {string} refreshToken - Refresh token to delete
 * @returns {Promise<Object>} Deleted session or null
 */
export async function deleteSession(refreshToken) {
  return await prisma.session.deleteMany({
    where: { refreshToken },
  });
}

/**
 * Delete all sessions for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of deleted sessions
 */
export async function deleteUserSessions(userId) {
  const result = await prisma.session.deleteMany({
    where: { userId },
  });
  return result.count;
}

/**
 * Clean up expired sessions (can be run periodically)
 * @returns {Promise<number>} Number of deleted sessions
 */
export async function cleanExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(), // Less than now (expired)
      },
    },
  });
  return result.count;
}
