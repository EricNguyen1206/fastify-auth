// src/tests/integration/routes/user/profile.route.test.js
// Integration tests for user profile routes

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockUserService = {
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
};

jest.unstable_mockModule('../../../../services/user.service.js', () => mockUserService);

// Import after mocks
const profileRoute = (await import('../../../../routes/user/profile.route.js')).default;

// Import test helpers
import { createTestUser } from '../../../helpers/test-helpers.js';

function createMockFastify() {
  const routes = [];
  const mockFastify = {
    get: jest.fn((path, ...args) => {
      const handler = args[args.length - 1];
      const options = args.length > 1 ? args[0] : {};
      routes.push({ method: 'GET', path, options, handler });
    }),
    put: jest.fn((path, ...args) => {
      const handler = args[args.length - 1];
      const options = args.length > 1 ? args[0] : {};
      routes.push({ method: 'PUT', path, options, handler });
    }),
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
  mockFastify._routes = routes;
  return mockFastify;
}

function createMockRequest(user = null, body = {}) {
  return {
    user: user || { userId: 1, email: 'test@example.com' },
    body,
  };
}

function createMockReply() {
  const reply = {
    send: jest.fn(),
  };
  reply.send.mockReturnValue(reply);
  return reply;
}

describe('Profile Route - GET /user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user profile when authenticated', async () => {
    const fastify = createMockFastify();
    await profileRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/user/profile' && r.method === 'GET');
    expect(route).toBeDefined();

    const user = createTestUser({ id: 1, email: 'test@example.com' });
    mockUserService.getUserProfile.mockResolvedValue(user);

    const request = createMockRequest({ userId: 1, email: 'test@example.com' });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockUserService.getUserProfile).toHaveBeenCalledWith(1);
    expect(reply.send).toHaveBeenCalledWith({ user });
  });

  it('should use userId from request.user', async () => {
    const fastify = createMockFastify();
    await profileRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/user/profile' && r.method === 'GET');

    const user = createTestUser({ id: 42 });
    mockUserService.getUserProfile.mockResolvedValue(user);

    const request = createMockRequest({ userId: 42 });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockUserService.getUserProfile).toHaveBeenCalledWith(42);
  });

  it('should throw 404 when user not found', async () => {
    const fastify = createMockFastify();
    await profileRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/user/profile' && r.method === 'GET');

    const notFoundError = new Error('User not found');
    notFoundError.statusCode = 404;
    mockUserService.getUserProfile.mockRejectedValue(notFoundError);

    const request = createMockRequest({ userId: 999 });
    const reply = createMockReply();

    await expect(route.handler(request, reply)).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
  });
});

describe('Profile Route - PUT /user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update name successfully', async () => {
    const fastify = createMockFastify();
    await profileRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/user/profile' && r.method === 'PUT');
    expect(route).toBeDefined();

    const updatedUser = createTestUser({ id: 1, name: 'Updated Name' });
    mockUserService.updateUserProfile.mockResolvedValue(updatedUser);

    const request = createMockRequest({ userId: 1 }, { name: 'Updated Name' });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(1, { name: 'Updated Name' });
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  });

  it('should validate name min length (2)', async () => {
    const fastify = createMockFastify();
    await profileRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/user/profile' && r.method === 'PUT');
    expect(route.options.schema.body.properties.name).toEqual({
      type: 'string',
      minLength: 2,
    });
  });

  it('should log profile update', async () => {
    const fastify = createMockFastify();
    await profileRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/user/profile' && r.method === 'PUT');

    const updatedUser = createTestUser({ email: 'user@example.com', name: 'New Name' });
    mockUserService.updateUserProfile.mockResolvedValue(updatedUser);

    const request = createMockRequest({ userId: 1 }, { name: 'New Name' });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(fastify.log.info).toHaveBeenCalledWith('User profile updated: user@example.com');
  });

  it('should handle empty update data', async () => {
    const fastify = createMockFastify();
    await profileRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/user/profile' && r.method === 'PUT');

    const user = createTestUser({ id: 1 });
    mockUserService.updateUserProfile.mockResolvedValue(user);

    const request = createMockRequest({ userId: 1 }, {});
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(1, {});
  });
});
