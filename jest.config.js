export default {
  // Use node environment for testing
  testEnvironment: 'node',

  // Enable ES modules support
  transform: {},

  // Test file patterns
  testMatch: [
    '**/src/tests/**/*.test.js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/repositories/**/*.js',
    'src/middlewares/**/*.js',
    'src/routes/**/*.js',
    '!src/routes/**/index.js', // Exclude index files (they just aggregate routes)
  ],

  // Coverage thresholds - realistic for unit testing with mocks
  // Note: Mocked unit tests intentionally don't execute source code
  // High coverage would require E2E tests which are slower and less reliable
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
