module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  setupFilesAfterEnv: ["./jest.setup.js"],
};
