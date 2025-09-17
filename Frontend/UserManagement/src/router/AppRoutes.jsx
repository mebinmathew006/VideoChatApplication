// src/router/index.jsx
import { Routes, Route } from "react-router-dom";
import React from "react";
import LoginPage from "../pages/Public/LoginPage";
import SignupPage from "../pages/Public/SignupPage";
import NotFound from "../components/NotFound";
import RoomCreation from "../pages/User/RoomCreation";
import RoomsDashboard from "../pages/User/RoomsDashboard";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/room" element={<RoomCreation />} />
      <Route path="/home" element={<RoomsDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
