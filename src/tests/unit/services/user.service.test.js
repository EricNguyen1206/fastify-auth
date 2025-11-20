// src/tests/unit/services/user.service.test.js
// Unit tests for user service

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock user repository
const mockUserRepository = {
  findUserById: jest.fn(),
  updateUser: jest.fn(),
};

// Mock modules
jest.unstable_mockModule('../../../repositories/user.repository.js', () => mockUserRepository);

// Import service after mocks
const { getUserProfile, updateUserProfile } = await import('../../../services/user.service.js');

// Import test helpers
import { createTestUser } from '../../helpers/test-helpers.js';

describe('User Service - getUserProfile()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user profile when user exists', async () => {
    const userId = 1;
    const user = createTestUser({ id: userId });

    mockUserRepository.findUserById.mockResolvedValue(user);

    const result = await getUserProfile(userId);

    expect(mockUserRepository.findUserById).toHaveBeenCalledWith(userId);
    expect(result).toEqual(user);
  });

  it('should throw 404 when user not found', async () => {
    const userId = 999;

    mockUserRepository.findUserById.mockResolvedValue(null);

    await expect(getUserProfile(userId)).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });

    expect(mockUserRepository.findUserById).toHaveBeenCalledWith(userId);
  });
});

describe('User Service - updateUserProfile()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update user profile with valid data', async () => {
    const userId = 1;
    const updates = { name: 'Updated Name' };
    const updatedUser = createTestUser({ id: userId, name: 'Updated Name' });

    mockUserRepository.updateUser.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(userId, updates);

    expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userId, { name: 'Updated Name' });
    expect(result).toEqual(updatedUser);
  });

  it('should only update whitelisted fields (name)', async () => {
    const userId = 1;
    const updates = {
      name: 'New Name',
      email: 'newemail@example.com', // Not allowed
      password: 'newpassword', // Not allowed
      role: 'admin', // Not allowed
    };
    const updatedUser = createTestUser({ id: userId, name: 'New Name' });

    mockUserRepository.updateUser.mockResolvedValue(updatedUser);

    await updateUserProfile(userId, updates);

    // Should only update name
    expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userId, { name: 'New Name' });
  });

  it('should return unchanged profile when no valid updates provided', async () => {
    const userId = 1;
    const updates = {
      email: 'newemail@example.com', // Not allowed
      password: 'newpassword', // Not allowed
    };
    const user = createTestUser({ id: userId });

    mockUserRepository.findUserById.mockResolvedValue(user);

    const result = await updateUserProfile(userId, updates);

    expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    expect(mockUserRepository.findUserById).toHaveBeenCalledWith(userId);
    expect(result).toEqual(user);
  });

  it('should filter out non-allowed fields', async () => {
    const userId = 1;
    const updates = {
      name: 'Valid Name',
      hackerField: 'malicious',
      anotherBadField: 'data',
    };
    const updatedUser = createTestUser({ id: userId, name: 'Valid Name' });

    mockUserRepository.updateUser.mockResolvedValue(updatedUser);

    await updateUserProfile(userId, updates);

    expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userId, { name: 'Valid Name' });
  });

  it('should handle empty name and return unchanged profile', async () => {
    const userId = 1;
    const updates = { name: '' }; // Empty name should be filtered
    const user = createTestUser({ id: userId });

    mockUserRepository.findUserById.mockResolvedValue(user);

    const result = await updateUserProfile(userId, updates);

    expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    expect(mockUserRepository.findUserById).toHaveBeenCalledWith(userId);
  });
});
