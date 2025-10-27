// frontend/src/pages/EmployeePage.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Heading, Text, Button, Avatar, Spinner,
  Input, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, useDisclosure
} from "@chakra-ui/react";

function getTokenFromStorage() {
  // try common token keys
  const keys = ["token", "access_token", "accessToken", "authToken", "jwt"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  try {
    const auth = JSON.parse(localStorage.getItem("auth") || "null");
    if (auth && (auth.access_token || auth.token)) return auth.access_token || auth.token;
  } catch {}
  return null;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function EmployeePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editName, setEditName] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    const token = getTokenFromStorage();
    if (!token) {
      // if no token, try to load UI with mock data so you can demo UI without backend
      setUser({
        name: "Demo Employee",
        email: "demo@company.dev",
        role: "Engineer",
        projects: [{ name: "Demo Project", status: "planning" }]
      });
      setOfflineMode(true);
      setLoading(false);
      return;
    }

    const fetchMe = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          // fallback to offline mock if server not reachable or auth failed
          console.warn("users/me returned", res.status);
          setOfflineMode(true);
          setUser({
            name: "Demo Employee",
            email: "demo@company.dev",
            role: "Engineer",
            projects: [{ name: "Demo Project", status: "planning" }]
          });
        } else {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error("Fetch failed:", err);
        setOfflineMode(true);
        setUser({
          name: "Demo Employee",
          email: "demo@company.dev",
          role: "Engineer",
          projects: [{ name: "Demo Project", status: "planning" }]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const openEdit = () => {
    setEditName(user?.name || "");
    onOpen();
  };

  const save = async () => {
    if (offlineMode) { alert("Offline/demo mode — nothing to save"); onClose(); return; }
    const token = getTokenFromStorage();
    if (!token) return alert("No token found — login first");
    setSaving(true);
    try {
      // try _id then id
      const id = user._id || user.id;
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName })
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const updated = await res.json();
      setUser(updated);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Save failed — check console. (If demo mode, this is expected.)");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box p={6}><Spinner /> Loading...</Box>;

  return (
    <Box p={6}>
      <Box display="flex" alignItems="center" gap={4}>
        <Avatar name={user?.name} />
        <Box>
          <Heading size="md">{user?.name}</Heading>
          <Text>{user?.email}</Text>
          <Text fontSize="sm">{user?.role || "Role not set"}</Text>
          {offlineMode && <Text fontSize="xs" color="gray.500">Demo/Offline mode</Text>}
        </Box>
        <Box ml="auto">
          <Button onClick={openEdit}>Edit profile</Button>
        </Box>
      </Box>

      <Box mt={6}>
        <Heading size="sm">Projects / Assignments</Heading>
        {user?.projects && user.projects.length ? (
          user.projects.map((p, i) => (
            <Box key={i} p={3} borderWidth="1px" borderRadius="md" my={2}>
              <Text fontWeight="bold">{p.name || p.title}</Text>
              <Text fontSize="sm">{p.status || p.description}</Text>
            </Box>
          ))
        ) : (
          <Text mt={2}>No projects found for this user.</Text>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit profile</ModalHeader>
          <ModalBody>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button onClick={save} isLoading={saving}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
