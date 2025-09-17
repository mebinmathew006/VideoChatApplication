import React, { useState } from "react";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { signupRoute } from "../../api/authApi";

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    mobile_number: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Validate field on change if it's been touched
    if (touched[name]) {
      validateField(name, value);
    }
  };

  // Mark field as touched on blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({
      ...touched,
      [name]: true,
    });
    validateField(name, value);
  };

  // Validate individual field
  const validateField = (name, value) => {
    let newErrors = { ...errors };

    switch (name) {
      case "name":
        if (!value.trim()) {
          newErrors.name = "Full name is required";
        } else if (value.trim().length < 3) {
          newErrors.name = "Full name must be at least 3 characters";
        } else if (!/^[A-Za-z\s]+$/.test(value.trim())) {
          newErrors.name = "Name must contain only alphabets and spaces";
        } else {
          delete newErrors.name;
        }
        break;

      case "mobile_number":
        if (!value.trim()) {
          newErrors.mobile_number = "Mobile Number is required";
        } else if (!/^\d{10}$/.test(value.trim())) {
          newErrors.mobile_number =
            "Mobile number must contain exactly 10 digits";
        } else {
          delete newErrors.mobile_number;
        }
        break;

      case "role":
        if (!value.trim()) {
          newErrors.role = "Role is required";
        } else if (!["doctor", "patient"].includes(value.toLowerCase())) {
          newErrors.role = "Select a valid role (doctor or patient)";
        } else {
          delete newErrors.role;
        }
        break;

      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          newErrors.email = "Email address is required";
        } else if (!emailRegex.test(value.trim())) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;

      case "password":
        if (!value) {
          newErrors.password = "Password is required";
        } else if (value.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        } else if (!/[A-Z]/.test(value)) {
          newErrors.password =
            "Password must contain at least one uppercase letter";
        } else if (!/[a-z]/.test(value)) {
          newErrors.password =
            "Password must contain at least one lowercase letter";
        } else if (!/[0-9]/.test(value)) {
          newErrors.password = "Password must contain at least one digit";
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
          newErrors.password =
            "Password must contain at least one special character";
        } else {
          delete newErrors.password;
        }

        // Validate confirmPassword again in case password changed
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;

      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "Please confirm your password";
        } else if (value !== formData.password) {
          newErrors.confirmPassword = "Passwords do not match";
        } else {
          delete newErrors.confirmPassword;
        }
        break;

      default:
        break;
    }
    setErrors(newErrors);
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};

    Object.entries(formData).forEach(([name, value]) => {
      switch (name) {
      case "name":
        if (!value.trim()) {
          newErrors.name = "Full name is required";
        } else if (value.trim().length < 3) {
          newErrors.name = "Full name must be at least 3 characters";
        } else if (!/^[A-Za-z ]+$/.test(value.trim())) {
          newErrors.name = "Name must contain only alphabets and spaces";
        }
        break;

      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          newErrors.email = "Email address is required";
        } else if (!emailRegex.test(value.trim())) {
          newErrors.email = "Please enter a valid email address";
        }
        break;

      case "password":
        if (!value) {
          newErrors.password = "Password is required";
        } else if (value.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        } else if (!/[A-Z]/.test(value)) {
          newErrors.password = "Password must contain at least one uppercase letter";
        } else if (!/[a-z]/.test(value)) {
          newErrors.password = "Password must contain at least one lowercase letter";
        } else if (!/\d/.test(value)) {
          newErrors.password = "Password must contain at least one digit";
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
          newErrors.password = "Password must contain at least one special character";
        }
        break;

      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "Please confirm your password";
        } else if (value !== formData.password) {
          newErrors.confirmPassword = "Passwords do not match";
        }
        break;

      default:
        break;
    }
    });

    setErrors(newErrors);

    // Mark all fields as touched to show errors on submit
    const touchedFields = {};
    Object.keys(formData).forEach((key) => {
      touchedFields[key] = true;
    });
    setTouched(touchedFields);

    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (validateForm()) {
      try {
        await signupRoute(formData);
        toast.success("Signup Successful! Please login Now!", {
          position: "bottom-center",
        });
        navigate("/", );
      } catch (error) {
        const errorData = error.response?.data;

        if (errorData?.detail && Array.isArray(errorData.detail)) {
          toast.error(errorData.detail[0].msg, {
            position: "bottom-center",
          });
        } else {
          toast.error("Signup failed. Please try again.", {
            position: "bottom-center",
          });
        }

        console.error("Signup error:", errorData || error.message);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23e3f2fd'/%3E%3Cstop offset='100%25' style='stop-color:%23bbdefb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='800' fill='url(%23bg)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-24 h-24 bg-green-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-500"></div>
        <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-pink-200 rounded-full opacity-20 animate-pulse delay-700"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div className="flex-1 text-center lg:text-left">
        

          {/* Illustration */}
          <div className="hidden lg:block">
            <div className="w-96 h-96 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-2xl">
              <div className="text-center">
                
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="w-full max-w-md lg:max-w-lg">
          <div className="bg-green rounded-3xl shadow-2xl p-8 lg:p-10 backdrop-blur-sm bg-opacity-95">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Home
                  className="font-bold text-green-950"
                  onClick={() => navigate("/")}
                />
              </div>
              <h1 className="text-3xl font-bold text-blue-400 mb-2">
                Create Account
              </h1>
              <p className="text-gray-600">
                Or{" "}
                <button
                  onClick={() => navigate("/")}
                  className="font-sm text-[#2D777E] hover:text-green-900"
                >
                  sign in to existing account
                </button>
              </p>
            </div>

            {/* Form */}
            <div className="space-y-5">
              <form>
                {/* Name and Phone Row */}
                <div className="grid grid-cols-1  gap-4">
                  {/* Full Name Field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                      placeholder="John Doe"
                    />
                    {errors.name && touched.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    autoComplete="username"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                    placeholder="you@example.com"
                  />
                  {errors.email && touched.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password Fields Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password Field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      autoComplete="new-password"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                      placeholder="••••••••••••••••••"
                    />
                    {errors.password && touched.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      autoComplete="new-password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                      placeholder="••••••••••••••••••"
                    />
                    {errors.confirmPassword && touched.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </form>

              {/* Submit Button */}
              <div className="mb-6">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[#2D777E] to-green-700 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-[#2D777E] hover:to-green-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
