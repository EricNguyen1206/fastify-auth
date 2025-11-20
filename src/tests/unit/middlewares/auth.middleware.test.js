// src/tests/unit/middlewares/auth.middleware.test.js
// Unit tests for auth middleware

import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Import middleware
import { authenticate } from '../../../middlewares/auth.middleware.js';

// Import test helpers
import { createMockRequest, createMockReply } from '../../helpers/test-helpers.js';

describe('Auth Middleware - authenticate()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call jwtVerify with onlyCookie option', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    request.jwtVerify.mockResolvedValue();

    await authenticate(request, reply);

    expect(request.jwtVerify).toHaveBeenCalledWith({ onlyCookie: true });
  });

  it('should pass when JWT is valid', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    request.jwtVerify.mockResolvedValue();

    await authenticate(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('should return 401 error with correct message when JWT invalid', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    request.jwtVerify.mockRejectedValue(new Error('Invalid token'));

    await authenticate(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('should handle expired JWT tokens', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    const tokenExpiredError = new Error('Token expired');
    tokenExpiredError.code = 'FAST_JWT_EXPIRED';
    request.jwtVerify.mockRejectedValue(tokenExpiredError);

    await authenticate(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('should handle missing JWT tokens', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    const noTokenError = new Error('No Authorization was found in request.cookies');
    request.jwtVerify.mockRejectedValue(noTokenError);

    await authenticate(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('should handle malformed JWT tokens', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    const malformedError = new Error('Malformed JWT');
    request.jwtVerify.mockRejectedValue(malformedError);

    await authenticate(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});
