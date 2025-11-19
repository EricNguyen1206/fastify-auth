// src/services/auth.service.js
// Auth service - business logic for authentication

import bcrypt from 'bcrypt';
import { createUser, findUserByEmail, emailExists } from '../repositories/user.repository.js';
import { createSession, findSessionByToken, deleteSession, deleteUserSessions } from '../repositories/session.repository.js';
import { config } from '../configs/variables.js';

/**
 * Register a new user
 * @param {string} email 
 * @param {string} password 
 * @param {string} name 
 * @returns {Promise<Object>} Created user
 */
export async function signup(email, password, name) {
  // Check if email already exists
  const exists = await emailExists(email);
  if (exists) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  return await createUser(email, hashedPassword, name);
}

/**
 * Authenticate user
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} User object if successful
 */
export async function signin(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Create user session
 * @param {Object} user 
 * @param {Object} jwt - Fastify JWT instance
 * @returns {Promise<Object>} Access and refresh tokens
 */
export async function createAuthSession(user, jwt) {
  // Create access token
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    { expiresIn: config.jwt.accessExpiry }
  );

  // Create refresh token
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    { expiresIn: config.jwt.refreshExpiry }
  );

  // Calculate expiry date
  // Parse duration like '7d', '15m' or use default 7 days
  const expiryDays = 7; 
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  // Store session
  await createSession(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

/**
 * Refresh access token
 * @param {string} refreshToken 
 * @param {Object} jwt - Fastify JWT instance
 * @returns {Promise<string>} New access token
 */
export async function refreshAccessToken(refreshToken, jwt) {
  if (!refreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 401;
    throw error;
  }

  try {
    // Verify token signature
    const decoded = jwt.verify(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if session exists in DB
    const session = await findSessionByToken(refreshToken, decoded.userId);

    if (!session) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId }, // We might want to fetch fresh email/data here if needed
      { expiresIn: config.jwt.accessExpiry }
    );

    return accessToken;
  } catch (err) {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    throw error;
  }
}

/**
 * Sign out user
 * @param {string} refreshToken 
 */
export async function signout(refreshToken) {
  if (refreshToken) {
    await deleteSession(refreshToken);
  }
}
