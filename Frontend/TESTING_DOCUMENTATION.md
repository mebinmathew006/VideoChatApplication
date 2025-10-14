# 🧪 Frontend Testing README

## 📘 Overview
This document provides a comprehensive testing guide for the **React frontend project**, covering **unit tests**, **component tests**, **integration tests**, **asynchronous testing**, and **best practices** implemented for the **chat application**.

---

## 🧱 Test Structure

### 🧩 Component Tests (`src/pages/__tests__/`)
Each major component has its own dedicated test file to ensure isolation and maintainability.

---

### 🗂 **ChatRoom.test.jsx — Chat Room Component Tests**

#### ✅ Test Cases Covered
- Basic rendering of chat interface  
- Message sending functionality  
- WebSocket connection management  
- User interaction handling  
- Error states and edge cases  

#### 🧩 Key Assertions
- All child components render correctly  
- Message input and sending works properly  
- WebSocket integration functions  
- Connection states are handled  
- Error banners display appropriately  

---

### 🔐 **LoginPage.test.jsx — Authentication Component Tests**

#### ✅ Test Cases Covered
- Login form rendering and validation  
- User input handling  
- API integration for authentication  
- Navigation after successful login  
- Error handling for failed login  

#### 🧩 Key Assertions
- Form fields accept user input  
- Password visibility toggle works  
- API calls are made with correct data  
- Navigation occurs on success  
- Error messages display properly  

---

### 💬 **RoomsDashboard.test.jsx — Rooms Management Tests**

#### ✅ Test Cases Covered
- Room listing and display  
- Search functionality  
- Room joining navigation  
- API data fetching and loading states  
- Error handling for room operations  

#### 🧩 Key Assertions
- Rooms are displayed correctly  
- Search filters rooms appropriately  
- Navigation to chat room works  
- Loading states show during API calls  
- Error states are handled gracefully  

---

### 📝 **SignupPage.test.jsx — User Registration Tests**

#### ✅ Test Cases Covered
- Registration form validation  
- Password confirmation matching  
- API integration for user creation  
- Success and error handling  
- Form field interactions  

#### 🧩 Key Assertions
- All form fields validate input  
- Password confirmation works  
- API calls include all required data  
- Success navigation occurs  
- Validation errors display properly  

---

## 🧩 Testing Methodology

### 🧱 Component Testing
- **Isolation:** Each component tested with mocked dependencies  
- **Interactions:** Simulated clicks, form submissions, and input changes  
- **State Changes:** Verified component state updates  
- **Props Testing:** Ensured proper prop passing and handling  

### ⚙️ Integration Testing
- Mocked API calls with expected responses  
- Redux store tested with a provider wrapper  
- Navigation tested via mocked routes  
- WebSocket communication mocked and verified  

### ⏱ Async Testing
- Asynchronous API calls tested using `waitFor`  
- Verified loading states and error recovery  

---

## ⚙️ Test Configuration

### 🔧 Test Setup Patterns
```js
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
