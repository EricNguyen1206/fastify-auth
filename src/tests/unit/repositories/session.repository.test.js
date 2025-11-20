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
jest.unstable_mockModule('../../../lib/prisma.js', () => ({
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

  it('should create session with refresh token and expiry', async () => {
    const userId = 1;
    const refreshToken = 'test-refresh-token';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const createdSession = createTestSession({ userId, refreshToken, expiresAt });

    mockPrismaSession.create.mockResolvedValue(createdSession);

    const result = await createSession(userId, refreshToken, expiresAt);

    expect(mockPrismaSession.create).toHaveBeenCalledWith({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });
    expect(result).toEqual(createdSession);
  });

  it('should link session to user ID', async () => {
    const userId = 42;
    const refreshToken = 'token-123';
    const expiresAt = new Date();
    const session = createTestSession({ userId });

    mockPrismaSession.create.mockResolvedValue(session);

    const result = await createSession(userId, refreshToken, expiresAt);

    expect(result.userId).toBe(userId);
  });
});

describe('Session Repository - findSessionByToken()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return session when token valid and not expired', async () => {
    const refreshToken = 'valid-token';
    const userId = 1;
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = createTestSession({ refreshToken, userId, expiresAt: futureDate });

    mockPrismaSession.findFirst.mockResolvedValue(session);

    const result = await findSessionByToken(refreshToken, userId);

    expect(mockPrismaSession.findFirst).toHaveBeenCalledWith({
      where: {
        refreshToken,
        userId,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
    });
    expect(result).toEqual(session);
  });

  it('should return null when token not found', async () => {
    const refreshToken = 'nonexistent-token';
    const userId = 1;

    mockPrismaSession.findFirst.mockResolvedValue(null);

    const result = await findSessionByToken(refreshToken, userId);

    expect(result).toBeNull();
  });

  it('should return null when session expired', async () => {
    const refreshToken = 'expired-token';
    const userId = 1;

    // Mock returns null because query filters out expired sessions
    mockPrismaSession.findFirst.mockResolvedValue(null);

    const result = await findSessionByToken(refreshToken, userId);

    expect(result).toBeNull();
  });

  it('should validate user ID ownership', async () => {
    const refreshToken = 'token';
    const userId = 1;
    const wrongUserId = 2;

    mockPrismaSession.findFirst.mockResolvedValue(null);

    const result = await findSessionByToken(refreshToken, userId);

    expect(mockPrismaSession.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        refreshToken,
        userId,
      }),
    });
    expect(result).toBeNull();
  });

  it('should use gt (greater than) for expiry check', async () => {
    const refreshToken = 'token';
    const userId = 1;

    mockPrismaSession.findFirst.mockResolvedValue(null);

    await findSessionByToken(refreshToken, userId);

    expect(mockPrismaSession.findFirst).toHaveBeenCalledWith({
      where: {
        refreshToken,
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

  it('should delete session by refresh token', async () => {
    const refreshToken = 'token-to-delete';
    const deleteResult = { count: 1 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteSession(refreshToken);

    expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
      where: { refreshToken },
    });
    expect(result).toEqual(deleteResult);
  });

  it('should return delete count', async () => {
    const refreshToken = 'token';
    const deleteResult = { count: 1 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteSession(refreshToken);

    expect(result).toHaveProperty('count');
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('should handle deleting non-existent session', async () => {
    const refreshToken = 'nonexistent';
    const deleteResult = { count: 0 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteSession(refreshToken);

    expect(result.count).toBe(0);
  });
});

describe('Session Repository - deleteUserSessions()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete all sessions for user', async () => {
    const userId = 1;
    const deleteResult = { count: 3 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteUserSessions(userId);

    expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(result).toBe(3);
  });

  it('should return count of deleted sessions', async () => {
    const userId = 2;
    const deleteResult = { count: 5 };

    mockPrismaSession.deleteMany.mockResolvedValue(deleteResult);

    const result = await deleteUserSessions(userId);

    expect(result).toBe(5);
  });

  it('should return 0 when user has no sessions', async () => {
    const userId = 3;
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
