// src/repositories/role.repository.js
// Role repository - data access layer for role operations

import { prisma } from '../configs/prisma.js';

/**
 * Find role by name
 * @param {string} name - Role name (e.g., 'user', 'admin')
 * @returns {Promise<Object|null>} Role object or null
 */
export async function findRoleByName(name) {
  return await prisma.role.findUnique({
    where: { name },
  });
}

/**
 * Find role by ID
 * @param {string} id - Role UUID
 * @returns {Promise<Object|null>} Role object or null
 */
export async function findRoleById(id) {
  return await prisma.role.findUnique({
    where: { id },
  });
}

/**
 * Get all roles
 * @returns {Promise<Array>} List of all roles
 */
export async function getAllRoles() {
  return await prisma.role.findMany({
    orderBy: { name: 'asc' },
  });
}

/**
 * Assign role to user
 * @param {string} userId - User UUID
 * @param {string} roleId - Role UUID
 * @returns {Promise<Object>} Created user role assignment
 */
export async function assignRoleToUser(userId, roleId) {
  return await prisma.userRole.create({
    data: {
      userId,
      roleId,
    },
  });
}

/**
 * Get user roles
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} List of roles for the user
 */
export async function getUserRoles(userId) {
  return await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true,
    },
  });
}

/**
 * Check if user has a specific role
 * @param {string} userId - User UUID
 * @param {string} roleName - Role name to check
 * @returns {Promise<boolean>} True if user has the role
 */
export async function userHasRole(userId, roleName) {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: roleName,
      },
    },
  });
  return userRole !== null;
}

/**
 * Ensure default roles exist (user, admin)
 * @returns {Promise<void>}
 */
export async function ensureDefaultRoles() {
  const defaultRoles = [
    { name: 'user', description: 'Standard user with basic access' },
    { name: 'admin', description: 'Administrator with full access' },
  ];

  for (const role of defaultRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
}
