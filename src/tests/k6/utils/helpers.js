// src/tests/k6/utils/helpers.js
// Reusable utilities for K6 tests

import { check } from "k6";
import { Trend, Counter } from "k6/metrics";

// Custom metrics
export const authDuration = new Trend("auth_duration", true);
export const signupCounter = new Counter("signup_total");
export const signinCounter = new Counter("signin_total");

/**
 * Generate random user data for testing
 * @returns {Object} Random user object
 */
export function generateRandomUser() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    email: `perf_${timestamp}_${random}@loadtest.com`,
    password: "LoadTest123!",
    name: `Performance Test User ${random}`,
  };
}

/**
 * Validate authentication response
 * @param {Object} response - HTTP response object
 * @param {string} action - Action name for logging
 * @returns {boolean} True if all checks passed
 */
export function validateAuthResponse(response, action) {
  return check(response, {
    [`${action}: status is 200 or 201`]: (r) =>
      r.status === 200 || r.status === 201,
    [`${action}: response has body`]: (r) => r.body && r.body.length > 0,
    [`${action}: response time < 500ms`]: (r) => r.timings.duration < 500,
  });
}

/**
 * Validate profile response
 * @param {Object} response - HTTP response object
 * @returns {boolean} True if all checks passed
 */
export function validateProfileResponse(response) {
  return check(response, {
    "profile: status is 200": (r) => r.status === 200,
    "profile: has user data": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.email;
      } catch (e) {
        return false;
      }
    },
    "profile: response time < 300ms": (r) => r.timings.duration < 300,
  });
}

/**
 * Validate error response
 * @param {Object} response - HTTP response object
 * @param {number} expectedStatus - Expected HTTP status code
 * @returns {boolean} True if all checks passed
 */
export function validateErrorResponse(response, expectedStatus) {
  return check(response, {
    [`error: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    "error: has error message": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.error || body.message;
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Extract access token from cookies
 * @param {Object} response - HTTP response object
 * @returns {string|null} Access token or null
 */
export function extractAccessToken(response) {
  const cookies = response.cookies;
  if (cookies && cookies.accessToken) {
    return cookies.accessToken[0].value;
  }
  return null;
}

/**
 * Sleep for random duration (helps simulate real user behavior)
 * @param {number} min - Minimum sleep duration in seconds
 * @param {number} max - Maximum sleep duration in seconds
 */
export function randomSleep(min, max) {
  const duration = Math.random() * (max - min) + min;
  return duration;
}
