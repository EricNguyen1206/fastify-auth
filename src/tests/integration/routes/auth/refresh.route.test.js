// src/tests/integration/routes/auth/refresh.route.test.js
// Integration tests for refresh token route

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockAuthService = {
  refreshAccessToken: jest.fn(),
};

const mockConfig = {
  isDev: true,
};

jest.unstable_mockModule('../../../../services/auth.service.js', () => mockAuthService);
jest.unstable_mockModule('../../../../configs/variables.js', () => ({ config: mockConfig }));

// Import after mocks
const refreshRoute = (await import('../../../../routes/auth/refresh.route.js')).default;

function createMockFastify() {
  const routes = [];
  const mockFastify = {
    post: jest.fn((path, ...args) => {
      const handler = args[args.length - 1];
      const options = args.length > 1 ? args[0] : {};
      routes.push({ method: 'POST', path, options, handler });
    }),
    jwt: {
      sign: jest.fn(),
      verify: jest.fn(),
    },
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
  mockFastify._routes = routes;
  return mockFastify;
}

function createMockRequest(cookies = {}) {
  return {
    cookies: { ...cookies },
  };
}

function createMockReply() {
  const reply = {
    setCookie: jest.fn(),
    clearCookie: jest.fn(),
    send: jest.fn(),
  };
  reply.send.mockReturnValue(reply);
  return reply;
}

describe('Refresh Route - POST /auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return new access token with valid refresh token', async () => {
    const fastify = createMockFastify();
    await refreshRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/refresh');
    expect(route).toBeDefined();

    const newAccessToken = 'new-access-token-123';
    mockAuthService.refreshAccessToken.mockResolvedValue(newAccessToken);

    const request = createMockRequest({ refreshToken: 'valid-refresh-token' });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('valid-refresh-token', fastify.jwt);
    expect(reply.setCookie).toHaveBeenCalledWith('token', newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 15 * 60,
    });
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Token refreshed successfully',
    });
  });

  it('should return 401 when refresh token missing', async () => {
    const fastify = createMockFastify();
    await refreshRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/refresh');

    const missingTokenError = new Error('Refresh token is required');
    missingTokenError.statusCode = 401;
    mockAuthService.refreshAccessToken.mockRejectedValue(missingTokenError);

    const request = createMockRequest({}); // No refresh token
    const reply = createMockReply();

    await expect(route.handler(request, reply)).rejects.toMatchObject({
      message: 'Refresh token is required',
      statusCode: 401,
    });

    expect(reply.clearCookie).toHaveBeenCalledWith('token');
    expect(reply.clearCookie).toHaveBeenCalledWith('refreshToken');
  });

  it('should return 401 when refresh token invalid', async () => {
    const fastify = createMockFastify();
    await refreshRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/refresh');

    const invalidTokenError = new Error('Invalid refresh token');
    invalidTokenError.statusCode = 401;
    mockAuthService.refreshAccessToken.mockRejectedValue(invalidTokenError);

    const request = createMockRequest({ refreshToken: 'invalid-token' });
    const reply = createMockReply();

    await expect(route.handler(request, reply)).rejects.toMatchObject({
      message: 'Invalid refresh token',
      statusCode: 401,
    });

    expect(reply.clearCookie).toHaveBeenCalledWith('token');
    expect(reply.clearCookie).toHaveBeenCalledWith('refreshToken');
  });

  it('should clear cookies on error', async () => {
    const fastify = createMockFastify();
    await refreshRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/refresh');

    const error = new Error('Token error');
    error.statusCode = 401;
    mockAuthService.refreshAccessToken.mockRejectedValue(error);

    const request = createMockRequest({ refreshToken: 'some-token' });
    const reply = createMockReply();

    await expect(route.handler(request, reply)).rejects.toThrow();

    expect(reply.clearCookie).toHaveBeenCalledWith('token');
    expect(reply.clearCookie).toHaveBeenCalledWith('refreshToken');
  });

  it('should log successful token refresh', async () => {
    const fastify = createMockFastify();
    await refreshRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/refresh');

    mockAuthService.refreshAccessToken.mockResolvedValue('new-token');

    const request = createMockRequest({ refreshToken: 'valid-token' });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(fastify.log.info).toHaveBeenCalledWith('Token refreshed');
  });
});
