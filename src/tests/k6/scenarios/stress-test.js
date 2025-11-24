// src/tests/k6/scenarios/stress-test.js
// Stress testing scenario: Find breaking point and validate recovery

import http from "k6/http";
import { sleep } from "k6";
import { config } from "../config.js";
import {
  generateRandomUser,
  validateAuthResponse,
  authDuration,
  signupCounter,
  signinCounter,
} from "../utils/helpers.js";

// Test configuration - aggressive ramp up to find breaking point
export const options = {
  stages: config.profiles.stress.stages,
  thresholds: {
    // Allow higher error rates during stress
    http_req_failed: ["rate<0.10"], // Up to 10% errors acceptable
    // Track when response times degrade
    http_req_duration: ["p(50)<1000", "p(95)<3000"],
  },
  tags: {
    type: "stress",
  },
};

export function setup() {
  console.log("💥 Starting Stress Test");
  console.log(`📍 Target: ${config.baseURL}`);
  console.log(`⏱️  Duration: 10 minutes`);
  console.log(`👥 Max VUs: 2000 (expected to break)`);

  // Create initial test users
  const testUsers = [];
  for (let i = 0; i < 20; i++) {
    const user = generateRandomUser();
    const signupRes = http.post(
      `${config.baseURL}/auth/signup`,
      JSON.stringify(user),
      { headers: { "Content-Type": "application/json" } }
    );

    if (signupRes.status === 200 || signupRes.status === 201) {
      testUsers.push(user);
    }
  }

  return { testUsers };
}

export default function (data) {
  const { testUsers } = data;

  // Stress test focuses primarily on auth operations
  const rand = Math.random();

  if (rand < 0.3) {
    // 30% - Signup (creates DB load)
    performSignup();
  } else if (rand < 0.8) {
    // 50% - Signin (most common operation)
    performSignin(testUsers);
  } else {
    // 20% - Mixed operations
    performMixedOperations(testUsers);
  }

  // Shorter think time during stress test (0.5-1.5 seconds)
  sleep(Math.random() + 0.5);
}

function performSignup() {
  const startTime = Date.now();
  const user = generateRandomUser();

  const response = http.post(
    `${config.baseURL}/auth/signup`,
    JSON.stringify(user),
    {
      headers: { "Content-Type": "application/json" },
      tags: { operation: "signup" },
      timeout: "10s", // Longer timeout for stress test
    }
  );

  const success = validateAuthResponse(response, "signup");
  if (success) {
    signupCounter.add(1);
    authDuration.add(Date.now() - startTime);
  }
}

function performSignin(testUsers) {
  if (!testUsers || testUsers.length === 0) return;

  const startTime = Date.now();
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  const response = http.post(
    `${config.baseURL}/auth/signin`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { operation: "signin" },
      timeout: "10s",
    }
  );

  const success = validateAuthResponse(response, "signin");
  if (success) {
    signinCounter.add(1);
    authDuration.add(Date.now() - startTime);
  }
}

function performMixedOperations(testUsers) {
  if (!testUsers || testUsers.length === 0) return;

  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Signin
  const signinRes = http.post(
    `${config.baseURL}/auth/signin`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (
    signinRes.status === 200 &&
    signinRes.cookies &&
    signinRes.cookies.accessToken
  ) {
    const accessToken = signinRes.cookies.accessToken[0].value;

    // Get profile
    http.get(`${config.baseURL}/user/profile`, {
      cookies: { accessToken },
      tags: { operation: "get_profile" },
      timeout: "10s",
    });

    // Update profile
    http.put(
      `${config.baseURL}/user/profile`,
      JSON.stringify({ name: `Stress Test ${Date.now()}` }),
      {
        headers: { "Content-Type": "application/json" },
        cookies: { accessToken },
        tags: { operation: "update_profile" },
        timeout: "10s",
      }
    );
  }
}

export function teardown(data) {
  console.log("✅ Stress Test Complete");
  console.log("📊 Check results to identify breaking point");
}
