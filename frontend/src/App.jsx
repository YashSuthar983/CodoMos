import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Candidates from './pages/Candidates'
import Roles from './pages/Roles'
import Projects from './pages/Projects'
import Forms from './pages/Forms'
import FormBuilder from './pages/FormBuilder'
import FormResponses from './pages/FormResponses'
import PublicForm from './pages/PublicForm'

export default function App() {
  return (
    <Box minH="100vh">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/public/forms/:id" element={<PublicForm />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navbar />
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidates"
          element={
            <ProtectedRoute>
              <Navbar />
              <Candidates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <Navbar />
              <Roles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Navbar />
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms"
          element={
            <ProtectedRoute>
              <Navbar />
              <Forms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/:id/edit"
          element={
            <ProtectedRoute>
              <Navbar />
              <FormBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/:id/responses"
          element={
            <ProtectedRoute>
              <Navbar />
              <FormResponses />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}
