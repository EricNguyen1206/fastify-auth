// src/repositories/user.repository.js
// User repository - data access layer for user operations

import { prisma } from '../configs/prisma.js';

/**
 * Create a new user
 * @param {string} email - User email (unique)
 * @param {string} hashedPassword - Bcrypt hashed password
 * @param {string} name - User's display name
 * @returns {Promise<Object>} Created user object
 */
export async function createUser(email, hashedPassword, fullName) {
  return await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      fullName,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object with password or null
 */
export async function findUserByEmail(email) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object without password or null
 */
export async function findUserById(id) {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Update user information
 * @param {number} id - User ID
 * @param {Object} data - Update data (name, email, etc.)
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUser(id, data) {
  return await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists
 */
export async function emailExists(email) {
  const count = await prisma.user.count({
    where: { email },
  });
  return count > 0;
}
