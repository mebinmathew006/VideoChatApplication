🧪 Frontend Testing README
Overview

This document provides a comprehensive testing guide for the React frontend project, covering unit tests, component tests, integration tests, asynchronous testing, and best practices implemented for the chat application.

🧱 Test Structure
1. Component Tests (src/pages/__tests__/)

Each major component has its own dedicated test file to ensure isolation and maintainability.

🗂 ChatRoom.test.jsx — Chat Room Component Tests

Test Cases Covered

Basic rendering of chat interface

Message sending functionality

WebSocket connection management

User interaction handling

Error states and edge cases

Key Assertions

All child components render correctly

Message input and sending works properly

WebSocket integration functions

Connection states are handled

Error banners display appropriately

🔐 LoginPage.test.jsx — Authentication Component Tests

Test Cases Covered

Login form rendering and validation

User input handling

API integration for authentication

Navigation after successful login

Error handling for failed login

Key Assertions

Form fields accept user input

Password visibility toggle works

API calls are made with correct data

Navigation occurs on success

Error messages display properly

💬 RoomsDashboard.test.jsx — Rooms Management Tests

Test Cases Covered

Room listing and display

Search functionality

Room joining navigation

API data fetching and loading states

Error handling for room operations

Key Assertions

Rooms are displayed correctly

Search filters rooms appropriately

Navigation to chat room works

Loading states show during API calls

Error states are handled gracefully

📝 SignupPage.test.jsx — User Registration Tests

Test Cases Covered

Registration form validation

Password confirmation matching

API integration for user creation

Success and error handling

Form field interactions

Key Assertions

All form fields validate input

Password confirmation works

API calls include all required data

Success navigation occurs

Validation errors display properly

🧩 Testing Methodology
🧱 Component Testing

Isolation: Each component tested with mocked dependencies

Interactions: Simulated clicks, form submissions, and input changes

State Changes: Verified component state updates

Props Testing: Ensured proper prop passing and handling

⚙️ Integration Testing

Mocked API calls with expected responses

Redux store tested with a provider wrapper

Navigation tested via mocked routes

WebSocket communication mocked and verified

⏱ Async Testing

Asynchronous API calls tested using waitFor

Verified loading states and error recovery

⚙️ Test Configuration
Test Setup Patterns
// Mock external dependencies
jest.mock("../../api/authApi", () => ({
  loginRoute: jest.fn(),
}));

// Mock React Router
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Redux Store Setup
const createTestStore = () =>
  configureStore({
    reducer: { userDetails: UserDetailsSlice },
  });

Common Test Utilities
// Async test helper
const renderWithStore = () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <BrowserRouter>
        <Component />
      </BrowserRouter>
    </Provider>
  );
  return { store };
};

// Mock data factory
const createMockRoom = (overrides = {}) => ({
  id: 1,
  name: "Test Room",
  type: "chat",
  description: "Test Description",
  is_active: true,
  participants: 5,
  created_at: "2023-01-01T00:00:00Z",
  owner: { name: "Test Owner" },
  ...overrides,
});

🧰 Running Tests
Basic Commands
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific file
npm test -- src/pages/__tests__/ChatRoom.test.jsx

# Run with coverage
npm test -- --coverage

# Run with verbose output
npm test -- --verbose

Scripts Configuration
{
  "scripts": {
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "test:debug": "react-scripts --inspect-brk test --runInBand --no-cache"
  }
}

🧠 Best Practices Implemented
1. Test Isolation

jest.clearAllMocks() cleanup

Fresh Redux store per test

afterEach teardown

2. Comprehensive Coverage

Rendering tests

Interaction tests

State management tests

Integration + edge cases

3. Realistic User Scenarios
test("complete user login flow", async () => {
  fireEvent.change(emailInput, { target: { value: "user@example.com" } });
  fireEvent.change(passwordInput, { target: { value: "password123" } });
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(loginRoute).toHaveBeenCalledWith("user@example.com", "password123");
  });
  expect(mockNavigate).toHaveBeenCalledWith("/home");
});

4. Async Handling
test("handles API loading states", async () => {
  renderWithStore();
  expect(screen.getByRole("progressbar")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

🧩 Mocking Strategy
API Mocking
loginRoute.mockResolvedValue({
  data: { user: { id: 1, email: "test@example.com" } },
});
loginRoute.mockRejectedValue(new Error("Invalid credentials"));

WebSocket Mocking
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  onopen: null,
  onmessage: null,
};
global.WebSocket = jest.fn(() => mockWebSocket);

Redux Mocking
const mockStore = configureStore({
  reducer: {
    userDetails: () => ({ name: "TestUser", access_token: "token123" }),
  },
});

🧮 Test Categories
Category	Purpose
Component Rendering	Verify all visual and structural elements
User Interaction	Input, clicks, toggles
API Integration	Mocked backend communication
Navigation	Route transitions and redirects
State Management	Redux and local state changes
📁 Test File Organization
Frontend/
├── src/
│   ├── pages/
│   │   ├── __tests__/
│   │   │   ├── ChatRoom.test.jsx
│   │   │   ├── LoginPage.test.jsx
│   │   │   ├── RoomsDashboard.test.jsx
│   │   │   └── SignupPage.test.jsx
│   │   ├── Public/
│   │   │   ├── LoginPage.jsx
│   │   │   └── SignupPage.jsx
│   │   └── User/
│   │       ├── RoomsDashboard.jsx
│   │       └── ChatRoom.jsx
│   ├── components/
│   │   └── __tests__/
│   ├── store/
│   │   └── __tests__/
│   └── utils/
│       └── __tests__/
├── FRONTEND_TESTING_README.md
└── package.json

🎯 Coverage Goals
Area	Target
Component Logic	90%+
User Interactions	100% major flows
API Integration	All endpoints mocked
Error Handling	All failure paths
Edge Cases	Covered thoroughly
Coverage Configuration
{
  "collectCoverageFrom": [
    "src/**/*.{js,jsx}",
    "!src/index.js",
    "!src/reportWebVitals.js"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}

🧾 Summary

This frontend testing documentation ensures:

✅ Consistent testing structure

✅ Strong component isolation

✅ Realistic user scenario simulation

✅ Robust async and integration test handling

✅ Comprehensive coverage and maintainability