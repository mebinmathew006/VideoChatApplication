export default {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  testPathIgnorePatterns: ["/node_modules/"],
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/main.jsx",
    "!src/**/*.test.{js,jsx}",
  ],
  globals: {
    // Ensure import.meta.env is available in all tests
    "import.meta.env": {
      VITE_BASE_URL: "http://localhost:3000",
      VITE_BASE_URL_WS: "ws://localhost:3000",
      VITE_BASE_URL_MEDIA: "http://localhost:3000/media",
    },
  },
};