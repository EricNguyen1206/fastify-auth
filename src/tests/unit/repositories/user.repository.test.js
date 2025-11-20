// src/tests/unit/repositories/user.repository.test.js
// Unit tests for user repository

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Prisma client
const mockPrismaUser = {
  create: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
};

const mockPrisma = {
  user: mockPrismaUser,
};

// Mock the prisma module
jest.unstable_mockModule('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import repository after mocking
const {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  emailExists,
} = await import('../../../repositories/user.repository.js');

// Import test helpers
import { createTestUser } from '../../helpers/test-helpers.js';

describe('User Repository - createUser()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user with correct data', async () => {
    const email = 'newuser@example.com';
    const hashedPassword = '$2b$10$hashedpassword';
    const name = 'New User';
    const createdUser = {
      id: 1,
      email,
      name,
      createdAt: new Date(),
    };

    mockPrismaUser.create.mockResolvedValue(createdUser);

    const result = await createUser(email, hashedPassword, name);

    expect(mockPrismaUser.create).toHaveBeenCalledWith({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(createdUser);
  });

  it('should exclude password from returned object', async () => {
    const email = 'test@example.com';
    const hashedPassword = '$2b$10$hash';
    const name = 'Test User';
    const createdUser = {
      id: 2,
      email,
      name,
      createdAt: new Date(),
    };

    mockPrismaUser.create.mockResolvedValue(createdUser);

    const result = await createUser(email, hashedPassword, name);

    expect(result).not.toHaveProperty('password');
  });

  it('should include id, email, name, createdAt', async () => {
    const email = 'test@example.com';
    const hashedPassword = '$2b$10$hash';
    const name = 'Test User';
    const now = new Date();
    const createdUser = {
      id: 3,
      email,
      name,
      createdAt: now,
    };

    mockPrismaUser.create.mockResolvedValue(createdUser);

    const result = await createUser(email, hashedPassword, name);

    expect(result).toHaveProperty('id', 3);
    expect(result).toHaveProperty('email', email);
    expect(result).toHaveProperty('name', name);
    expect(result).toHaveProperty('createdAt', now);
  });
});

describe('User Repository - findUserByEmail()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user with password when found', async () => {
    const email = 'test@example.com';
    const user = createTestUser({ email });

    mockPrismaUser.findUnique.mockResolvedValue(user);

    const result = await findUserByEmail(email);

    expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
      where: { email },
    });
    expect(result).toEqual(user);
    expect(result).toHaveProperty('password');
  });

  it('should return null when not found', async () => {
    const email = 'nonexistent@example.com';

    mockPrismaUser.findUnique.mockResolvedValue(null);

    const result = await findUserByEmail(email);

    expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
      where: { email },
    });
    expect(result).toBeNull();
  });
});

describe('User Repository - findUserById()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user without password when found', async () => {
    const userId = 1;
    const userWithoutPassword = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
    };

    mockPrismaUser.findUnique.mockResolvedValue(userWithoutPassword);

    const result = await findUserById(userId);

    expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(userWithoutPassword);
    expect(result).not.toHaveProperty('password');
  });

  it('should return null when not found', async () => {
    const userId = 999;

    mockPrismaUser.findUnique.mockResolvedValue(null);

    const result = await findUserById(userId);

    expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    expect(result).toBeNull();
  });
});

describe('User Repository - updateUser()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update user data correctly', async () => {
    const userId = 1;
    const updateData = { name: 'Updated Name' };
    const updatedUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Updated Name',
      createdAt: new Date(),
    };

    mockPrismaUser.update.mockResolvedValue(updatedUser);

    const result = await updateUser(userId, updateData);

    expect(mockPrismaUser.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(updatedUser);
  });

  it('should return updated user without password', async () => {
    const userId = 1;
    const updateData = { name: 'New Name' };
    const updatedUser = {
      id: userId,
      email: 'test@example.com',
      name: 'New Name',
      createdAt: new Date(),
    };

    mockPrismaUser.update.mockResolvedValue(updatedUser);

    const result = await updateUser(userId, updateData);

    expect(result).not.toHaveProperty('password');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('createdAt');
  });
});

describe('User Repository - emailExists()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when email exists', async () => {
    const email = 'existing@example.com';

    mockPrismaUser.count.mockResolvedValue(1);

    const result = await emailExists(email);

    expect(mockPrismaUser.count).toHaveBeenCalledWith({
      where: { email },
    });
    expect(result).toBe(true);
  });

  it('should return false when email does not exist', async () => {
    const email = 'nonexistent@example.com';

    mockPrismaUser.count.mockResolvedValue(0);

    const result = await emailExists(email);

    expect(mockPrismaUser.count).toHaveBeenCalledWith({
      where: { email },
    });
    expect(result).toBe(false);
  });

  it('should return true when multiple users exist with same email', async () => {
    const email = 'duplicate@example.com';

    mockPrismaUser.count.mockResolvedValue(2);

    const result = await emailExists(email);

    expect(result).toBe(true);
  });
});
