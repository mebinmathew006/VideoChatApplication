import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import UserDetailsSlice from "../../store/UserDetailsSlice";
import LoginPage from "../Public/LoginPage";
import { loginRoute } from "../../api/authApi";
import { toast } from "react-toastify";

jest.mock("../../api/authApi", () => ({
  loginRoute: jest.fn(),
}));

// Mock API and toast
jest.mock("../../api/authApi");
jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Helper to create a fresh store for each test
const createTestStore = () =>
  configureStore({
    reducer: {
      userDetails: UserDetailsSlice,
    },
  });

const renderWithStore = () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </Provider>
  );
  return { store };
};

describe("LoginPage Component", () => {
  test("renders login form with inputs and button", () => {
    renderWithStore();

    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText("password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });

  test("allows typing in email and password fields", () => {
    renderWithStore();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText("Password");

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("user@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  test("toggles password visibility", () => {
    renderWithStore();

    const toggleButton = screen.getByLabelText("Toggle password visibility");
    const passwordInput = screen.getByLabelText("password");

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("successful login navigates to /home and shows toast", async () => {
    loginRoute.mockResolvedValue({
      data: { user: { id: 1, email: "test@example.com" } },
    });

    renderWithStore();

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "Test@123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(loginRoute).toHaveBeenCalledWith("test@example.com", "Test@123");
      expect(toast.success).toHaveBeenCalledWith("Login Successful.", {
        position: "bottom-center",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/home");
    });
  });

  test("handles login error gracefully", async () => {
    loginRoute.mockRejectedValue(new Error("Invalid credentials"));

    renderWithStore();

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Unable to login.", {
        position: "bottom-center",
      });
    });
  });
});
