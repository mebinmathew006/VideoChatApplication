import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import UserDetailsSlice from "../../store/UserDetailsSlice";
import SignupPage from "../Public/SignupPage";
import { signupRoute } from "../../api/authApi";
import { toast } from "react-toastify";

// Mock API and toast
jest.mock("../../api/authApi", () => ({
  signupRoute: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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
    reducer: { userDetails: UserDetailsSlice },
  });

const renderWithStore = () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>
    </Provider>
  );
  return { store };
};

describe("SignupPage Component", () => {
  test("renders all form fields and button", () => {
    renderWithStore();

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Account/i })
    ).toBeInTheDocument();
  });

  test("allows typing in form fields", () => {
    renderWithStore();

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Test@1234" } });
    fireEvent.change(confirmInput, { target: { value: "Test@1234" } });

    expect(nameInput.value).toBe("John Doe");
    expect(emailInput.value).toBe("john@example.com");
    expect(passwordInput.value).toBe("Test@1234");
    expect(confirmInput.value).toBe("Test@1234");
  });

  test("shows validation errors on invalid input", async () => {
    renderWithStore();

    fireEvent.blur(screen.getByLabelText(/Full Name/i));
    fireEvent.blur(screen.getByLabelText(/Email Address/i));
    fireEvent.blur(screen.getByLabelText(/^Password$/i));
    fireEvent.blur(screen.getByLabelText(/Confirm Password/i));

    expect(await screen.findByText(/Full name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Please confirm your password/i)).toBeInTheDocument();
  });

  test("successful signup navigates to / and shows toast", async () => {
    signupRoute.mockResolvedValue({ data: { user: { id: 1 } } });

    renderWithStore();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "Test@1234" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "Test@1234" } });

    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(signupRoute).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        password: "Test@1234",
        confirmPassword: "Test@1234",
        role: "",
        mobile_number: "",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Signup Successful! Please login Now!",
        { position: "bottom-center" }
      );
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  test("handles signup error gracefully", async () => {
    signupRoute.mockRejectedValue({ response: { data: { detail: [{ msg: "Email already exists" }] } } });

    renderWithStore();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "Test@1234" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "Test@1234" } });

    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already exists", {
        position: "bottom-center",
      });
    });
  });
});
