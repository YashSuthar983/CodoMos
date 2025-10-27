import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeePage from "./pages/EmployeePage";
import Navbar from "./components/Navbar";

// ✅ Route Guard
const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  const savedRole = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (role && savedRole !== role) return <Navigate to="/login" replace />;

  return children;
};

export default function App() {
  return (
    <Routes>

      {/* ✅ Public */}
      <Route path="/login" element={<Login />} />

      {/* ✅ Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute role="admin">
            <Navbar />
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* ✅ Employee Routes */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute role="employee">
            <Navbar />
            <EmployeePage />
          </ProtectedRoute>
        }
      />

      {/* ✅ Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
