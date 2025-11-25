// src/tests/integration/routes/auth/signin.route.test.js
// Integration tests for signin route

import { jest } from "@jest/globals";
import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock dependencies
const mockAuthService = {
  signin: jest.fn(),
  createAuthSession: jest.fn(),
};

const mockConfig = {
  isDev: true,
};

jest.unstable_mockModule(
  "../../../../services/auth.service.js",
  () => mockAuthService
);
jest.unstable_mockModule("../../../../configs/variables.js", () => ({
  config: mockConfig,
}));

// Import after mocks
const signinRoute = (await import("../../../../routes/auth/signin.route.js"))
  .default;

// Import test helpers
import { createTestUser } from "../../../helpers/test-helpers.js";

function createMockFastify() {
  const routes = [];
  const mockFastify = {
    post: jest.fn((path, ...args) => {
      const handler = args[args.length - 1];
      const options = args.length > 1 ? args[0] : {};
      routes.push({ method: "POST", path, options, handler });
    }),
    jwt: {
      sign: jest.fn(),
      verify: jest.fn(),
    },
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
    audit: {
      auth: jest.fn(),
      security: jest.fn(),
    },
  };
  mockFastify._routes = routes;
  return mockFastify;
}

function createMockRequest(body = {}, headers = {}) {
  return {
    body,
    headers: { "user-agent": "test-agent", ...headers },
    ip: "127.0.0.1",
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

describe("Signin Route - POST /auth/signin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully login with valid credentials", async () => {
    const fastify = createMockFastify();
    await signinRoute(fastify);

    const route = fastify._routes.find((r) => r.path === "/auth/signin");
    expect(route).toBeDefined();

    const user = createTestUser({ email: "test@example.com" });
    const tokens = {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
    };

    mockAuthService.signin.mockResolvedValue(user);
    mockAuthService.createAuthSession.mockResolvedValue(tokens);

    const request = createMockRequest({
      email: "test@example.com",
      password: "password123",
    });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(mockAuthService.signin).toHaveBeenCalledWith(
      "test@example.com",
      "password123"
    );
    expect(mockAuthService.createAuthSession).toHaveBeenCalledWith(
      user,
      fastify.jwt
    );
    expect(reply.send).toHaveBeenCalledWith({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  });

  it("should set access token cookie", async () => {
    const fastify = createMockFastify();
    await signinRoute(fastify);

    const route = fastify._routes.find((r) => r.path === "/auth/signin");

    const user = createTestUser();
    const tokens = {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
    };

    mockAuthService.signin.mockResolvedValue(user);
    mockAuthService.createAuthSession.mockResolvedValue(tokens);

    const request = createMockRequest({
      email: "test@example.com",
      password: "password123",
    });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(reply.setCookie).toHaveBeenCalledWith("token", "access-token-123", {
      httpOnly: true,
      secure: false, // isDev = true
      sameSite: "strict",
      maxAge: 15 * 60,
    });
  });

  it("should set refresh token cookie", async () => {
    const fastify = createMockFastify();
    await signinRoute(fastify);

    const route = fastify._routes.find((r) => r.path === "/auth/signin");

    const user = createTestUser();
    const tokens = {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
    };

    mockAuthService.signin.mockResolvedValue(user);
    mockAuthService.createAuthSession.mockResolvedValue(tokens);

    const request = createMockRequest({
      email: "test@example.com",
      password: "password123",
    });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(reply.setCookie).toHaveBeenCalledWith(
      "refreshToken",
      "refresh-token-456",
      {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
      }
    );
  });

  it("should return 401 for invalid email", async () => {
    const fastify = createMockFastify();
    await signinRoute(fastify);

    const route = fastify._routes.find((r) => r.path === "/auth/signin");

    const invalidError = new Error("Invalid credentials");
    invalidError.statusCode = 401;
    mockAuthService.signin.mockRejectedValue(invalidError);

    const request = createMockRequest({
      email: "wrong@example.com",
      password: "password123",
    });
    const reply = createMockReply();

    await expect(route.handler(request, reply)).rejects.toMatchObject({
      message: "Invalid credentials",
      statusCode: 401,
    });

    expect(fastify.log.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          event: "signin_failed",
          email: "wrong@example.com",
          reason: "Invalid credentials",
        }),
      }),
      "Failed signin attempt for wrong@example.com"
    );
  });

  it("should return 401 for invalid password", async () => {
    const fastify = createMockFastify();
    await signinRoute(fastify);

    const route = fastify._routes.find((r) => r.path === "/auth/signin");

    const invalidError = new Error("Invalid credentials");
    invalidError.statusCode = 401;
    mockAuthService.signin.mockRejectedValue(invalidError);

    const request = createMockRequest({
      email: "test@example.com",
      password: "wrongpassword",
    });
    const reply = createMockReply();

    await expect(route.handler(request, reply)).rejects.toMatchObject({
      message: "Invalid credentials",
      statusCode: 401,
    });
  });

  it("should log successful signin", async () => {
    const fastify = createMockFastify();
    await signinRoute(fastify);

    const route = fastify._routes.find((r) => r.path === "/auth/signin");

    const user = createTestUser({ email: "test@example.com" });
    mockAuthService.signin.mockResolvedValue(user);
    mockAuthService.createAuthSession.mockResolvedValue({
      accessToken: "token",
      refreshToken: "refresh",
    });

    const request = createMockRequest({
      email: "test@example.com",
      password: "password123",
    });
    const reply = createMockReply();

    await route.handler(request, reply);

    expect(fastify.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          event: "signin_success",
          userId: user.id,
          email: user.email,
        }),
      }),
      "User logged in: test@example.com"
    );
  });

  it("should have rate limiting configured (5 attempts per 15 minutes)", async () => {
    const fastify = createMockFastify();
    await signinRoute(fastify);

    const route = fastify._routes.find((r) => r.path === "/auth/signin");
    expect(route.options.config.rateLimit).toEqual({
      max: 5,
      timeWindow: 15 * 60 * 1000,
    });
  });
});
