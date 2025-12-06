// src/tests/helpers/test-helpers.js
// Shared test utilities and helpers

import { jest } from "@jest/globals";

/**
 * Create a mock Prisma client with all required methods
 */
export function createMockPrisma() {
  return {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
}

/**
 * Create a test user object
 */
export function createTestUser(overrides = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "test@example.com",
    fullName: "Test User",
    passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz", // Mock bcryptjs hash
    avatarUrl: null,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

/**
 * Create a test session object
 */
export function createTestSession(overrides = {}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  return {
    id: "660e8400-e29b-41d4-a716-446655440000",
    userId: "550e8400-e29b-41d4-a716-446655440000",
    refreshTokenHash: "test-refresh-token",
    expiresAt,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock JWT instance for Fastify
 */
export function createMockJWT() {
  return {
    sign: jest.fn((payload, options) => {
      // Return a deterministic token based on payload
      const tokenType = payload.type || "access";
      return `mock-${tokenType}-token-${payload.userId}`;
    }),
    verify: jest.fn((token) => {
      // Parse token and return payload
      if (token.includes("mock-")) {
        const parts = token.split("-");
        const userId = parseInt(parts[parts.length - 1]);
        const type = parts[1];
        return {
          userId,
          type: type === "refresh" ? "refresh" : undefined,
        };
      }
      throw new Error("Invalid token");
    }),
  };
}

/**
 * Create mock Fastify request object
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    jwtVerify: jest.fn(),
    ...overrides,
  };
}

/**
 * Create mock Fastify reply object
 */
export function createMockReply() {
  const reply = {
    code: jest.fn(),
    send: jest.fn(),
    setCookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  // Chain methods
  reply.code.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);

  return reply;
}
