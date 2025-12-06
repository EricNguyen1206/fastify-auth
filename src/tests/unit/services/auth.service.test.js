// src/tests/unit/services/auth.service.test.js
// Unit tests for auth service

import { jest } from "@jest/globals";
import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock dependencies before importing service
const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockUserRepository = {
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
  emailExists: jest.fn(),
};

const mockSessionRepository = {
  createSession: jest.fn(),
  findSessionByToken: jest.fn(),
  deleteSession: jest.fn(),
};

const mockRoleRepository = {
  findRoleByName: jest.fn(),
  assignRoleToUser: jest.fn(),
};

const mockConfig = {
  jwt: {
    accessExpiry: "15m",
    refreshExpiry: "7d",
  },
};

// Mock modules
jest.unstable_mockModule("bcryptjs", () => ({
  default: mockBcrypt,
}));
jest.unstable_mockModule(
  "../../../repositories/user.repository.js",
  () => mockUserRepository
);
jest.unstable_mockModule(
  "../../../repositories/session.repository.js",
  () => mockSessionRepository
);
jest.unstable_mockModule(
  "../../../repositories/role.repository.js",
  () => mockRoleRepository
);
jest.unstable_mockModule("../../../configs/variables.js", () => ({
  config: mockConfig,
}));

// Import service after mocks
const { signup, signin, createAuthSession, refreshAccessToken, signout } =
  await import("../../../services/auth.service.js");

// Import test helpers
import {
  createTestUser,
  createTestSession,
  createMockJWT,
} from "../../helpers/test-helpers.js";

describe("Auth Service - signup()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully create user with hashed password", async () => {
    const email = "newuser@example.com";
    const password = "password123";
    const fullName = "New User";
    const hashedPassword = "$2b$10$hashedpassword";
    const createdUser = createTestUser({ email, fullName, id: "550e8400-e29b-41d4-a716-446655440002" });
    const userRole = { id: "role-user-id", name: "user" };

    mockUserRepository.emailExists.mockResolvedValue(false);
    mockBcrypt.hash.mockResolvedValue(hashedPassword);
    mockUserRepository.createUser.mockResolvedValue(createdUser);
    mockRoleRepository.findRoleByName.mockResolvedValue(userRole);
    mockRoleRepository.assignRoleToUser.mockResolvedValue({});

    const result = await signup(email, password, fullName);

    expect(mockUserRepository.emailExists).toHaveBeenCalledWith(email);
    expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
    expect(mockUserRepository.createUser).toHaveBeenCalledWith(
      email,
      hashedPassword,
      fullName
    );
    expect(mockRoleRepository.findRoleByName).toHaveBeenCalledWith("user");
    expect(mockRoleRepository.assignRoleToUser).toHaveBeenCalledWith(
      createdUser.id,
      userRole.id
    );
    expect(result).toEqual(createdUser);
  });

  it("should throw 409 error when email already exists", async () => {
    const email = "existing@example.com";
    const password = "password123";
    const fullName = "Test User";

    mockUserRepository.emailExists.mockResolvedValue(true);

    await expect(signup(email, password, fullName)).rejects.toMatchObject({
      message: "Email already exists",
      statusCode: 409,
    });

    expect(mockUserRepository.emailExists).toHaveBeenCalledWith(email);
    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockUserRepository.createUser).not.toHaveBeenCalled();
  });

  it("should hash password with bcryptjs salt rounds of 10", async () => {
    const email = "test@example.com";
    const password = "mypassword";
    const fullName = "Test";

    mockUserRepository.emailExists.mockResolvedValue(false);
    mockBcrypt.hash.mockResolvedValue("$2b$10$hashed");
    mockUserRepository.createUser.mockResolvedValue(createTestUser());
    mockRoleRepository.findRoleByName.mockResolvedValue({ id: "role-id", name: "user" });
    mockRoleRepository.assignRoleToUser.mockResolvedValue({});

    await signup(email, password, fullName);

    expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
  });

  it("should still create user if role not found", async () => {
    const email = "newuser@example.com";
    const password = "password123";
    const fullName = "New User";
    const hashedPassword = "$2b$10$hashedpassword";
    const createdUser = createTestUser({ email, fullName });

    mockUserRepository.emailExists.mockResolvedValue(false);
    mockBcrypt.hash.mockResolvedValue(hashedPassword);
    mockUserRepository.createUser.mockResolvedValue(createdUser);
    mockRoleRepository.findRoleByName.mockResolvedValue(null);

    const result = await signup(email, password, fullName);

    expect(mockRoleRepository.assignRoleToUser).not.toHaveBeenCalled();
    expect(result).toEqual(createdUser);
  });
});

describe("Auth Service - signin()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully authenticate with valid credentials", async () => {
    const email = "test@example.com";
    const password = "password123";
    const user = createTestUser({ email });

    mockUserRepository.findUserByEmail.mockResolvedValue(user);
    mockBcrypt.compare.mockResolvedValue(true);

    const result = await signin(email, password);

    expect(mockUserRepository.findUserByEmail).toHaveBeenCalledWith(email);
    expect(mockBcrypt.compare).toHaveBeenCalledWith(password, user.passwordHash);
    expect(result).toEqual({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("should return user without passwordHash field", async () => {
    const email = "test@example.com";
    const password = "password123";
    const user = createTestUser({ email });

    mockUserRepository.findUserByEmail.mockResolvedValue(user);
    mockBcrypt.compare.mockResolvedValue(true);

    const result = await signin(email, password);

    expect(result).not.toHaveProperty("passwordHash");
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("fullName");
  });

  it("should throw 401 when user not found", async () => {
    const email = "nonexistent@example.com";
    const password = "password123";

    mockUserRepository.findUserByEmail.mockResolvedValue(null);

    await expect(signin(email, password)).rejects.toMatchObject({
      message: "Invalid credentials",
      statusCode: 401,
    });

    expect(mockUserRepository.findUserByEmail).toHaveBeenCalledWith(email);
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it("should throw 401 when password is invalid", async () => {
    const email = "test@example.com";
    const password = "wrongpassword";
    const user = createTestUser({ email });

    mockUserRepository.findUserByEmail.mockResolvedValue(user);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(signin(email, password)).rejects.toMatchObject({
      message: "Invalid credentials",
      statusCode: 401,
    });

    expect(mockBcrypt.compare).toHaveBeenCalledWith(password, user.passwordHash);
  });
});

describe("Auth Service - createAuthSession()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create access and refresh tokens", async () => {
    const user = createTestUser();
    const mockJwt = createMockJWT();

    mockSessionRepository.createSession.mockResolvedValue(createTestSession());

    const result = await createAuthSession(user, mockJwt);

    expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    expect(mockJwt.sign).toHaveBeenCalledWith(
      { userId: user.id, email: user.email },
      { expiresIn: "15m" }
    );
    expect(mockJwt.sign).toHaveBeenCalledWith(
      { userId: user.id, type: "refresh" },
      { expiresIn: "7d" }
    );
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
  });

  it("should store session in database", async () => {
    const user = createTestUser();
    const mockJwt = createMockJWT();

    mockSessionRepository.createSession.mockResolvedValue(createTestSession());

    await createAuthSession(user, mockJwt);

    expect(mockSessionRepository.createSession).toHaveBeenCalledTimes(1);
    const callArgs = mockSessionRepository.createSession.mock.calls[0];
    expect(callArgs[0]).toBe(user.id);
    expect(callArgs[1]).toMatch(/mock-refresh-token/);
    expect(callArgs[2]).toBeInstanceOf(Date);
  });

  it("should set correct token expiry (7 days)", async () => {
    const user = createTestUser();
    const mockJwt = createMockJWT();

    mockSessionRepository.createSession.mockResolvedValue(createTestSession());

    const beforeCall = new Date();
    await createAuthSession(user, mockJwt);
    const afterCall = new Date();

    const callArgs = mockSessionRepository.createSession.mock.calls[0];
    const expiresAt = callArgs[2];

    // Expiry should be ~7 days from now
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const expectedExpiry = new Date(beforeCall.getTime() + sevenDaysInMs);
    const expectedExpiryMax = new Date(afterCall.getTime() + sevenDaysInMs);

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
      expectedExpiry.getTime()
    );
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      expectedExpiryMax.getTime()
    );
  });
});

describe("Auth Service - refreshAccessToken()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return new access token with valid refresh token", async () => {
    const refreshToken = "mock-refresh-token-550e8400-e29b-41d4-a716-446655440000";
    const mockJwt = createMockJWT();
    const session = createTestSession({ refreshTokenHash: refreshToken });

    mockJwt.verify.mockReturnValue({ userId: "550e8400-e29b-41d4-a716-446655440000", type: "refresh" });
    mockSessionRepository.findSessionByToken.mockResolvedValue(session);

    const result = await refreshAccessToken(refreshToken, mockJwt);

    expect(mockJwt.verify).toHaveBeenCalledWith(refreshToken);
    expect(mockSessionRepository.findSessionByToken).toHaveBeenCalledWith(
      refreshToken,
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(mockJwt.sign).toHaveBeenCalledWith(
      { userId: "550e8400-e29b-41d4-a716-446655440000" },
      { expiresIn: "15m" }
    );
    expect(result).toMatch(/mock-access-token/);
  });

  it("should throw 401 when refresh token is missing", async () => {
    const mockJwt = createMockJWT();

    await expect(refreshAccessToken(null, mockJwt)).rejects.toMatchObject({
      message: "Refresh token is required",
      statusCode: 401,
    });

    await expect(refreshAccessToken("", mockJwt)).rejects.toMatchObject({
      message: "Refresh token is required",
      statusCode: 401,
    });

    expect(mockJwt.verify).not.toHaveBeenCalled();
  });

  it("should throw 401 when token type is not refresh", async () => {
    const refreshToken = "mock-access-token-1"; // Wrong type
    const mockJwt = createMockJWT();

    mockJwt.verify.mockReturnValue({ userId: "550e8400-e29b-41d4-a716-446655440000", type: undefined }); // Not a refresh token

    await expect(
      refreshAccessToken(refreshToken, mockJwt)
    ).rejects.toMatchObject({
      message: "Invalid refresh token",
      statusCode: 401,
    });
  });

  it("should throw 401 when session not found in DB", async () => {
    const refreshToken = "mock-refresh-token-550e8400-e29b-41d4-a716-446655440000";
    const mockJwt = createMockJWT();

    mockJwt.verify.mockReturnValue({ userId: "550e8400-e29b-41d4-a716-446655440000", type: "refresh" });
    mockSessionRepository.findSessionByToken.mockResolvedValue(null);

    await expect(
      refreshAccessToken(refreshToken, mockJwt)
    ).rejects.toMatchObject({
      message: "Invalid refresh token",
      statusCode: 401,
    });
  });

  it("should throw 401 when token signature is invalid", async () => {
    const refreshToken = "invalid-token-signature";
    const mockJwt = createMockJWT();

    mockJwt.verify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    await expect(
      refreshAccessToken(refreshToken, mockJwt)
    ).rejects.toMatchObject({
      message: "Invalid refresh token",
      statusCode: 401,
    });
  });
});

describe("Auth Service - signout()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete session when refresh token provided", async () => {
    const refreshToken = "mock-refresh-token-550e8400-e29b-41d4-a716-446655440000";

    mockSessionRepository.deleteSession.mockResolvedValue({ count: 1 });

    await signout(refreshToken);

    expect(mockSessionRepository.deleteSession).toHaveBeenCalledWith(
      refreshToken
    );
  });

  it("should handle missing refresh token gracefully", async () => {
    await signout(null);
    await signout(undefined);
    await signout("");

    expect(mockSessionRepository.deleteSession).not.toHaveBeenCalled();
  });
});
