import { TextEncoder, TextDecoder } from "util";
import "@testing-library/jest-dom";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Vite's import.meta.env - MUST come before any component imports
const mockEnv = {
  VITE_BASE_URL: "http://localhost:3000",
  VITE_BASE_URL_WS: "ws://localhost:3000",
  VITE_BASE_URL_MEDIA: "http://localhost:3000/media",
};

// Set on global scope
global.import = {
  meta: {
    env: mockEnv,
  },
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.OPEN;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
  }

  send(data) {
    // Mock implementation
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: 1000, reason: "Normal closure" });
    }
  }

  static OPEN = 1;
  static CLOSED = 3;
}

global.WebSocket = MockWebSocket;

// Mock axios
jest.mock("axios", () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));