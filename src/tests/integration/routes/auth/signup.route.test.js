// src/tests/integration/routes/auth/signup.route.test.js
// Integration tests for signup route

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockAuthService = {
  signup: jest.fn(),
};

jest.unstable_mockModule('../../../../services/auth.service.js', () => mockAuthService);

// Import after mocks
const signupRoute = (await import('../../../../routes/auth/signup.route.js')).default;

// Import test helpers
import { createTestUser } from '../../../helpers/test-helpers.js';

/**
 * Create a mock Fastify instance for testing
 */
function createMockFastify() {
  const routes = [];
  const mockFastify = {
    post: jest.fn((path, ...args) => {
      const handler = args[args.length - 1];
      const options = args.length > 1 ? args[0] : {};
      routes.push({ method: 'POST', path, options, handler });
    }),
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
  mockFastify._routes = routes;
  return mockFastify;
}

function createMockRequest(body = {}) {
  return { body };
}

function createMockReply() {
  const reply = {
    code: jest.fn(),
    send: jest.fn(),
  };
  reply.code.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply;
}

describe('Signup Route - POST /auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully register a new user (201)', async () => {
    const fastify = createMockFastify();
    await signupRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signup');
    expect(route).toBeDefined();

    const newUser = createTestUser({ id: 1, email: 'newuser@example.com', name: 'New User' });
    mockAuthService.signup.mockResolvedValue(newUser);

    const request = createMockRequest({
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockAuthService.signup).toHaveBeenCalledWith('newuser@example.com', 'password123', 'New User');
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.send).toHaveBeenCalledWith({
      message: 'User registered successfully',
      userId: 1,
    });
  });

  it('should validate email format', async () => {
    const fastify = createMockFastify();
    await signupRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signup');
    expect(route.options.schema.body.properties.email).toEqual({
      type: 'string',
      format: 'email',
    });
  });

  it('should validate password min length (8)', async () => {
    const fastify = createMockFastify();
    await signupRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signup');
    expect(route.options.schema.body.properties.password).toEqual({
      type: 'string',
      minLength: 8,
    });
  });

  it('should validate name min length (2)', async () => {
    const fastify = createMockFastify();
    await signupRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signup');
    expect(route.options.schema.body.properties.name).toEqual({
      type: 'string',
      minLength: 2,
    });
  });

  it('should return 409 for duplicate email', async () => {
    const fastify = createMockFastify();
    await signupRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signup');

    const duplicateError = new Error('Email already exists');
    duplicateError.statusCode = 409;
    mockAuthService.signup.mockRejectedValue(duplicateError);

    const request = createMockRequest({
      email: 'existing@example.com',
      password: 'password123',
      name: 'Test User',
    });
    const reply = createMockReply();

    await expect(route.handler(request, reply)).rejects.toMatchObject({
      message: 'Email already exists',
      statusCode: 409,
    });
  });

  it('should require all fields', async () => {
    const fastify = createMockFastify();
    await signupRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signup');
    expect(route.options.schema.body.required).toEqual(['email', 'password', 'name']);
  });

  it('should log successful registration', async () => {
    const fastify = createMockFastify();
    await signupRoute(fastify);

    const route = fastify._routes.find(r => r.path === '/auth/signup');

    const newUser = createTestUser({ email: 'test@example.com' });
    mockAuthService.signup.mockResolvedValue(newUser);

    const request = createMockRequest({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
    });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(fastify.log.info).toHaveBeenCalledWith('User registered: test@example.com');
  });
});
