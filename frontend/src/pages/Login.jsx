// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import {
  Box,
  Heading,
  Input,
  Button,
  Select,
  VStack,
  Text,
  FormControl,
  FormLabel,
  FormHelperText,
  useToast,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = (e) => {
    e.preventDefault();

    if (!role) {
      toast({
        title: "Select a role",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    if (role === "admin") {
      if (email === "admin@cogniwork.dev" && password === "admin123") {
        localStorage.setItem("token", "admin-token");
        localStorage.setItem("role", "admin");
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: "Admin User",
            email,
            role: "admin",
            projects: [],
          })
        );
        toast({
          title: "Admin Login Successful",
          status: "success",
          duration: 1500,
          isClosable: true,
        });
        navigate("/admin/dashboard");
      } else {
        toast({
          title: "Invalid Admin Credentials",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    }

    if (role === "employee") {
      if (email && password) {
        localStorage.setItem("token", "employee-token");
        localStorage.setItem("role", "employee");
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: "Demo Employee",
            email,
            role: "employee",
            projects: [{ name: "Demo Project", status: "planning" }],
          })
        );
        toast({
          title: "Employee Login Successful",
          status: "success",
          duration: 1500,
          isClosable: true,
        });
        navigate("/employee/dashboard");
      } else {
        toast({
          title: "Enter valid employee credentials",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={20} p={6} borderWidth="1px" borderRadius="md" boxShadow="sm">
      <Heading size="md" mb={4} textAlign="center">
        CogniWork — Sign in
      </Heading>

      <form onSubmit={handleLogin}>
        <VStack spacing={4}>
          <FormControl id="role" isRequired>
            <FormLabel>Select Role</FormLabel>
            <Select placeholder="Select Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </Select>
          </FormControl>

          <FormControl id="email" isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>

          <FormControl id="password" isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>

          <Button type="submit" width="full" colorScheme="blue" isLoading={loading}>
            Login
          </Button>
        </VStack>
      </form>
    </Box>
  );
}
