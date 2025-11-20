// src/tests/integration/routes/auth/signout.route.test.js
// Integration tests for signout route

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockAuthService = {
  signout: jest.fn(),
};

jest.unstable_mockModule('../../../../services/auth.service.js', () => mockAuthService);

// Import after mocks
const signoutRoute = (await import('../../../../routes/auth/signout.route.js')).default;

function createMockFastify() {
  const routes = [];
  const mockFastify = {
    post: jest.fn((path, ...args) => {
      const handler = args[args.length - 1];
      const options = args.length > 1 ? args[0] : {};
      routes.push({ method: 'POST', path, options, handler });
    }),
    authenticate: jest.fn(),
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
  mockFastify._routes = routes;
  return mockFastify;
}

function createMockRequest(cookies = {}, user = null) {
  return {
    cookies: { ...cookies },
    user: user || { email: 'test@example.com', userId: 1 },
  };
}

function createMockReply() {
  const reply = {
    clearCookie: jest.fn(),
    send: jest.fn(),
  };
  reply.send.mockReturnValue(reply);
  return reply;
}

describe('Signout Route - POST /auth/signout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully log out user', async () => {
    const fastify = createMockFastify();
    await signoutRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signout');
    expect(route).toBeDefined();

    mockAuthService.signout.mockResolvedValue();

    const request = createMockRequest({ refreshToken: 'valid-refresh-token' });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockAuthService.signout).toHaveBeenCalledWith('valid-refresh-token');
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });

  it('should clear cookies', async () => {
    const fastify = createMockFastify();
    await signoutRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signout');

    mockAuthService.signout.mockResolvedValue();

    const request = createMockRequest({ refreshToken: 'token' });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(reply.clearCookie).toHaveBeenCalledWith('token');
    expect(reply.clearCookie).toHaveBeenCalledWith('refreshToken');
  });

  it('should delete session from database', async () => {
    const fastify = createMockFastify();
    await signoutRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signout');

    mockAuthService.signout.mockResolvedValue();

    const refreshToken = 'session-token-to-delete';
    const request = createMockRequest({ refreshToken });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockAuthService.signout).toHaveBeenCalledWith(refreshToken);
  });

  it('should require authentication (preHandler)', async () => {
    const fastify = createMockFastify();
    await signoutRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signout');
    expect(route.options.preHandler).toBe(fastify.authenticate);
  });

  it('should log successful signout', async () => {
    const fastify = createMockFastify();
    await signoutRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signout');

    mockAuthService.signout.mockResolvedValue();

    const request = createMockRequest(
      { refreshToken: 'token' },
      { email: 'user@example.com', userId: 1 }
    );
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(fastify.log.info).toHaveBeenCalledWith('User logged out: user@example.com');
  });

  it('should handle signout even without refresh token', async () => {
    const fastify = createMockFastify();
    await signoutRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signout');

    mockAuthService.signout.mockResolvedValue();

    const request = createMockRequest({}); // No refresh token
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockAuthService.signout).toHaveBeenCalledWith(undefined);
    expect(reply.clearCookie).toHaveBeenCalledWith('token');
    expect(reply.clearCookie).toHaveBeenCalledWith('refreshToken');
  });
});
