module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  // mongodb-memory-server descarga MongoDB la primera vez
  testTimeout: 60000,
};
