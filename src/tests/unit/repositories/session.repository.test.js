// src/tests/unit/repositories/session.repository.test.js
// Unit tests for session repository

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Prisma client
const mockPrismaSession = {
  create: jest.fn(),
  findFirst: jest.fn(),
  deleteMany: jest.fn(),
};

const mockPrisma = {
  session: mockPrismaSession,
};

// Mock the prisma module
jest.unstable_mockModule('../../../configs/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import repository after mocking
const {
  createSession,
  findSessionByToken,
  deleteSession,
  deleteUserSessions,
  cleanExpiredSessions,
} = await import('../../../repositories/session.repository.js');

// Import test helpers
import { createTestSession } from '../../helpers/test-helpers.js';

describe('Session Repository - createSession()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create session with refresh token hash and expiry', async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const refreshTokenHash = 'test-refresh-token-hash';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const createdSession = createTestSession({ userId, refreshTokenHash, expiresAt });

    mockPrismaSession.create.mockResolvedValue(createdSession);

    const result = await createSession(userId, refreshTokenHash, expiresAt);

    expect(mockPrismaSession.create).toHaveBeenCalledWith({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });
    expect(result).toEqual(createdSession);
  });

  it('should link session to user ID', async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440042";
    const refreshTokenHash = 'token-123-hash';
    const expiresAt = new Date();
    const session = createTestSession({ userId });

    mockPrismaSession.create.mockResolvedValue(session);

    const result = await createSession(userId, refreshTokenHash, expiresAt);

    expect(result.userId).toBe(userId);
  });
});

describe('Session Repository - findSessionByToken()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return session when token valid and not expired', async () => {
    const refreshTokenHash = 'valid-token-hash';
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = createTestSession({ refreshTokenHash, userId, expiresAt: futureDate });

    mockPrismaSession.findFirst.mockResolvedValue(session);

    const result = await findSessionByToken(refreshTokenHash, userId);

    expect(mockPrismaSession.findFirst).toHaveBeenCalledWith({
      where: {
        refreshTokenHash,
        userId,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
    });
    expect(result).toEqual(session);
  });

  it('should return null when token not found', async () => {
    const refreshTokenHash = 'nonexistent-token-hash';
    const userId = "550e8400-e29b-41d4-a716-446655440000";

    mockPrismaSession.findFirst.mockResolvedValue(null);

    const result = await findSessionByToken(refreshTokenHash, userId);

    expect(result).toBeNull();
  });

  it('should return null when session expired', async () => {
    const refreshTokenHash = 'expired-token-hash';
    const userId = "550e8400-e29b-41d4-a716-446655440000";

    // Mock returns null because query filters out expired sessions
    mockPrismaSession.findFirst.mockResolvedValue(null);

    const result = await findSessionByToken(refreshTokenHash, userId);

    expect(result).toBeNull();
  });

  it('should validate user ID ownership', async () => {
    const refreshTokenHash = 'token-hash';
    const userId = "550e8400-e29b-41d4-a716-446655440001";

    mockPrismaSession.findFirst.mockResolvedValue(null);

    const result = await findSessionByToken(refreshTokenHash, userId);

    expect(mockPrismaSession.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        refreshTokenHash,
        userId,
      }),
    });
    expect(result).toBeNull();
  });

  it('should use gt (greater than) for expiry check', async () => {
    const refreshTokenHash = 'token-hash';
    const userId = "550e8400-e29b-41d4-a716-446655440000";

    mockPrismaSession.findFirst.mockResolvedValue(null);

    await findSessionByToken(refreshTokenHash, userId);

    expect(mockPrismaSession.findFirst).toHaveBeenCalledWith({
      where: {
        refreshTokenHash,
        userId,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
    });
  });
});

describe('Session Repository - deleteSession()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete session by refresh token hash', async () => {
    const refreshTokenHash = 'token-to-delete-hash';
    const deleteResult = { count: 1 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteSession(refreshTokenHash);

    expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
      where: { refreshTokenHash },
    });
    expect(result).toEqual(deleteResult);
  });

  it('should return delete count', async () => {
    const refreshTokenHash = 'token-hash';
    const deleteResult = { count: 1 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteSession(refreshTokenHash);

    expect(result).toHaveProperty('count');
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('should handle deleting non-existent session', async () => {
    const refreshTokenHash = 'nonexistent-hash';
    const deleteResult = { count: 0 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteSession(refreshTokenHash);

    expect(result.count).toBe(0);
  });
});

describe('Session Repository - deleteUserSessions()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete all sessions for user', async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const deleteResult = { count: 3 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteUserSessions(userId);

    expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(result).toBe(3);
  });

  it('should return count of deleted sessions', async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440002";
    const deleteResult = { count: 5 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteUserSessions(userId);

    expect(result).toBe(5);
  });

  it('should return 0 when user has no sessions', async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440003";
    const deleteResult = { count: 0 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteUserSessions(userId);

    expect(result).toBe(0);
  });
});

describe('Session Repository - cleanExpiredSessions()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete only expired sessions', async () => {
    const deleteResult = { count: 10 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await cleanExpiredSessions();

    expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: {
          lt: expect.any(Date),
        },
      },
    });
    expect(result).toBe(10);
  });

  it('should use lt (less than) for expiry check', async () => {
    const deleteResult = { count: 5 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    await cleanExpiredSessions();

    expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: {
          lt: expect.any(Date),
        },
      },
    });
  });

  it('should return count of cleaned sessions', async () => {
    const deleteResult = { count: 7 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await cleanExpiredSessions();

    expect(result).toBe(7);
  });

  it('should return 0 when no expired sessions exist', async () => {
    const deleteResult = { count: 0 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await cleanExpiredSessions();

    expect(result).toBe(0);
  });
});
