// src/tests/unit/repositories/role.repository.test.js
// Unit tests for role repository

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Prisma client
const mockPrismaRole = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  upsert: jest.fn(),
};

const mockPrismaUserRole = {
  create: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
};

const mockPrisma = {
  role: mockPrismaRole,
  userRole: mockPrismaUserRole,
};

// Mock the prisma module
jest.unstable_mockModule('../../../configs/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import repository after mocking
const {
  findRoleByName,
  findRoleById,
  getAllRoles,
  assignRoleToUser,
  getUserRoles,
  userHasRole,
  ensureDefaultRoles,
} = await import('../../../repositories/role.repository.js');

// Helper function to create test role
function createTestRole(overrides = {}) {
  return {
    id: "role-550e8400-e29b-41d4-a716-446655440000",
    name: "user",
    description: "Standard user with basic access",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// Helper function to create test user role
function createTestUserRole(overrides = {}) {
  return {
    id: "userrole-550e8400-e29b-41d4-a716-446655440000",
    userId: "user-550e8400-e29b-41d4-a716-446655440000",
    roleId: "role-550e8400-e29b-41d4-a716-446655440000",
    createdAt: new Date("2024-01-01"),
    role: createTestRole(),
    ...overrides,
  };
}

describe('Role Repository - findRoleByName()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return role when found by name', async () => {
    const roleName = 'user';
    const role = createTestRole({ name: roleName });

    mockPrismaRole.findUnique.mockResolvedValue(role);

    const result = await findRoleByName(roleName);

    expect(mockPrismaRole.findUnique).toHaveBeenCalledWith({
      where: { name: roleName },
    });
    expect(result).toEqual(role);
  });

  it('should return null when role not found', async () => {
    const roleName = 'nonexistent';

    mockPrismaRole.findUnique.mockResolvedValue(null);

    const result = await findRoleByName(roleName);

    expect(mockPrismaRole.findUnique).toHaveBeenCalledWith({
      where: { name: roleName },
    });
    expect(result).toBeNull();
  });
});

describe('Role Repository - findRoleById()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return role when found by ID', async () => {
    const roleId = "role-550e8400-e29b-41d4-a716-446655440000";
    const role = createTestRole({ id: roleId });

    mockPrismaRole.findUnique.mockResolvedValue(role);

    const result = await findRoleById(roleId);

    expect(mockPrismaRole.findUnique).toHaveBeenCalledWith({
      where: { id: roleId },
    });
    expect(result).toEqual(role);
  });

  it('should return null when role not found by ID', async () => {
    const roleId = "role-nonexistent";

    mockPrismaRole.findUnique.mockResolvedValue(null);

    const result = await findRoleById(roleId);

    expect(mockPrismaRole.findUnique).toHaveBeenCalledWith({
      where: { id: roleId },
    });
    expect(result).toBeNull();
  });
});

describe('Role Repository - getAllRoles()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all roles ordered by name', async () => {
    const roles = [
      createTestRole({ name: 'admin', description: 'Administrator' }),
      createTestRole({ name: 'user', description: 'Standard user' }),
    ];

    mockPrismaRole.findMany.mockResolvedValue(roles);

    const result = await getAllRoles();

    expect(mockPrismaRole.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual(roles);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no roles exist', async () => {
    mockPrismaRole.findMany.mockResolvedValue([]);

    const result = await getAllRoles();

    expect(mockPrismaRole.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual([]);
  });
});

describe('Role Repository - assignRoleToUser()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user role assignment', async () => {
    const userId = "user-550e8400-e29b-41d4-a716-446655440000";
    const roleId = "role-550e8400-e29b-41d4-a716-446655440000";
    const userRole = createTestUserRole({ userId, roleId });

    mockPrismaUserRole.create.mockResolvedValue(userRole);

    const result = await assignRoleToUser(userId, roleId);

    expect(mockPrismaUserRole.create).toHaveBeenCalledWith({
      data: {
        userId,
        roleId,
      },
    });
    expect(result).toEqual(userRole);
  });

  it('should return created assignment with correct IDs', async () => {
    const userId = "user-123";
    const roleId = "role-456";
    const userRole = createTestUserRole({ userId, roleId });

    mockPrismaUserRole.create.mockResolvedValue(userRole);

    const result = await assignRoleToUser(userId, roleId);

    expect(result.userId).toBe(userId);
    expect(result.roleId).toBe(roleId);
  });
});

describe('Role Repository - getUserRoles()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user roles with included role objects', async () => {
    const userId = "user-550e8400-e29b-41d4-a716-446655440000";
    const userRoles = [
      createTestUserRole({ userId, role: createTestRole({ name: 'user' }) }),
      createTestUserRole({ userId, role: createTestRole({ name: 'admin' }) }),
    ];

    mockPrismaUserRole.findMany.mockResolvedValue(userRoles);

    const result = await getUserRoles(userId);

    expect(mockPrismaUserRole.findMany).toHaveBeenCalledWith({
      where: { userId },
      include: {
        role: true,
      },
    });
    expect(result).toEqual(userRoles);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when user has no roles', async () => {
    const userId = "user-no-roles";

    mockPrismaUserRole.findMany.mockResolvedValue([]);

    const result = await getUserRoles(userId);

    expect(mockPrismaUserRole.findMany).toHaveBeenCalledWith({
      where: { userId },
      include: {
        role: true,
      },
    });
    expect(result).toEqual([]);
  });
});

describe('Role Repository - userHasRole()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when user has the specified role', async () => {
    const userId = "user-550e8400-e29b-41d4-a716-446655440000";
    const roleName = 'admin';
    const userRole = createTestUserRole({ userId });

    mockPrismaUserRole.findFirst.mockResolvedValue(userRole);

    const result = await userHasRole(userId, roleName);

    expect(mockPrismaUserRole.findFirst).toHaveBeenCalledWith({
      where: {
        userId,
        role: {
          name: roleName,
        },
      },
    });
    expect(result).toBe(true);
  });

  it('should return false when user does not have the specified role', async () => {
    const userId = "user-550e8400-e29b-41d4-a716-446655440000";
    const roleName = 'admin';

    mockPrismaUserRole.findFirst.mockResolvedValue(null);

    const result = await userHasRole(userId, roleName);

    expect(mockPrismaUserRole.findFirst).toHaveBeenCalledWith({
      where: {
        userId,
        role: {
          name: roleName,
        },
      },
    });
    expect(result).toBe(false);
  });

  it('should check for user role correctly', async () => {
    const userId = "user-123";
    const roleName = 'user';

    mockPrismaUserRole.findFirst.mockResolvedValue(createTestUserRole());

    await userHasRole(userId, roleName);

    expect(mockPrismaUserRole.findFirst).toHaveBeenCalledWith({
      where: {
        userId,
        role: {
          name: roleName,
        },
      },
    });
  });
});

describe('Role Repository - ensureDefaultRoles()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upsert both user and admin roles', async () => {
    mockPrismaRole.upsert.mockResolvedValue(createTestRole());

    await ensureDefaultRoles();

    expect(mockPrismaRole.upsert).toHaveBeenCalledTimes(2);
    
    // Check first call (user role)
    expect(mockPrismaRole.upsert).toHaveBeenNthCalledWith(1, {
      where: { name: 'user' },
      update: {},
      create: { name: 'user', description: 'Standard user with basic access' },
    });

    // Check second call (admin role)
    expect(mockPrismaRole.upsert).toHaveBeenNthCalledWith(2, {
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Administrator with full access' },
    });
  });

  it('should not throw error when roles already exist', async () => {
    mockPrismaRole.upsert.mockResolvedValue(createTestRole());

    await expect(ensureDefaultRoles()).resolves.not.toThrow();
  });

  it('should call upsert with correct structure for each default role', async () => {
    mockPrismaRole.upsert.mockResolvedValue(createTestRole());

    await ensureDefaultRoles();

    // Verify upsert was called with correct structure
    const calls = mockPrismaRole.upsert.mock.calls;
    
    expect(calls[0][0]).toHaveProperty('where');
    expect(calls[0][0]).toHaveProperty('update');
    expect(calls[0][0]).toHaveProperty('create');
    
    expect(calls[1][0]).toHaveProperty('where');
    expect(calls[1][0]).toHaveProperty('update');
    expect(calls[1][0]).toHaveProperty('create');
  });
});
