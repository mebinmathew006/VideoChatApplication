import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUserDetails } from "../../store/UserDetailsSlice";
import { toast } from "react-toastify";
import {  loginRoute } from "../../api/authApi";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [errorsFromBackend, setErrorsFromBackend] = useState({
    email: [],
    password: [],
    commonError: "",
  });

  const loginSubmitHandler = async (data) => {
    try {
      const response = await loginRoute(email,password)
      // setting the user details in redux store
      const userDetails = response.data.user;
        dispatch(setUserDetails(userDetails));
        toast.success("Login Successful.", {
          position: "bottom-center",
        });
        navigate('/home')
    } catch (error) {
      console.error(error)
      toast.error("Unable to login.", {
        position: "bottom-center",
      });
     
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23e3f2fd'/%3E%3Cstop offset='100%25' style='stop-color:%23bbdefb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='800' fill='url(%23bg)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Abstract Medical Icons Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-24 h-24 bg-cyan-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-500"></div>
        <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-pink-200 rounded-full opacity-20 animate-pulse delay-700"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 flex items-center justify-between">
        {/* Left Side - Medical Professional Image Placeholder */}
        <div className="flex-1 text-center lg:text-left">
         
            
           
 

          {/* Illustration */}
          <div className="hidden lg:block">
            <div className="w-96 h-96 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-2xl">
              <div className="text-center">
              
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md lg:max-w-lg">
          <div className="bg-cyan rounded-3xl shadow-2xl p-8 lg:p-10 backdrop-blur-sm bg-opacity-95">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Home
                  className="font-bold text-cyan-950"
                  onClick={() => navigate("/")}
                />

                {/* <span className="text-2xl font-bold text-gray-800">OpenNest</span> */}
              </div>
              <h1 className="text-3xl font-bold text-blue-400 mb-2">Sign in</h1>
              <p className="text-gray-600">
                Or{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="font-sm text-[#2D777E] hover:text-cyan-900"
                >
                  create account
                </button>
              </p>
            </div>

            {/* Form */}
            <div className="space-y-6">
              <form>
                <div className="mb-6">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                    placeholder="you@example.com"
                  />
                  
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                      placeholder="••••••••••••••••••"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                </div>
              </form>

              <div className="flex items-center justify-end mb-6">
                <div className="text-sm">
                  <button
                    onClick={() => navigate("/forgetpassword")}
                    className="font-medium text-[#2D777E] hover:text-indigo-500"
                  >
                    Forgot password ?
                  </button>
                </div>
              </div>

             

              <div className="mb-6">
                <button
                  onClick={loginSubmitHandler}
                  className="w-full bg-gradient-to-r from-[#2D777E] to-cyan-700 hover:from-[#2D777E] hover:to-cyan-500 text-white py-4 px-6 rounded-xl font-semibold text-lg   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
