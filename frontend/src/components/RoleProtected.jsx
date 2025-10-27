// src/components/RoleProtected.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function RoleProtected({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role"); // Make sure your login stores this

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If requiredRole is null → allow any logged-in user
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
