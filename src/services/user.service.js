// src/services/user.service.js
// User service - business logic for user profile operations

import { findUserById, updateUser } from '../repositories/user.repository.js';

/**
 * Get user profile
 * @param {number} userId 
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile(userId) {
  const user = await findUserById(userId);
  
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  
  return user;
}

/**
 * Update user profile
 * @param {number} userId 
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated user profile
 */
export async function updateUserProfile(userId, data) {
  // Whitelist allowed fields
  const allowedUpdates = {};
  if (data.name) allowedUpdates.name = data.name;
  // if (data.email) allowedUpdates.email = data.email; // Handle email change separately if needed (verification etc)
  
  if (Object.keys(allowedUpdates).length === 0) {
    return await getUserProfile(userId);
  }
  
  return await updateUser(userId, allowedUpdates);
}
