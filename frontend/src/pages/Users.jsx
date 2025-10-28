import React, { useEffect, useState } from 'react'
import { 
  Box, Container, Heading, useToast, Button, Card, CardBody, Text, 
  Table, Thead, Tbody, Tr, Th, Td, Badge, VStack, Input, HStack, 
  FormControl, FormLabel, Select, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
  IconButton, Flex, Stat, StatLabel, StatNumber, SimpleGrid, Alert, AlertIcon,
  AlertTitle, AlertDescription
} from '@chakra-ui/react'
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, admins: 0 })
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  
  // Form state
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'user',
    position: '',
    is_active: true,
    github_username: ''
  })
  
  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const res = await api.get('/auth/me')
      setCurrentUser(res.data)
      if (res.data.role === 'admin') {
        setIsAdmin(true)
        loadUsers()
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    } catch (e) {
      toast({ title: 'Failed to verify access', status: 'error' })
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users')
      setUsers(res.data)
      
      // Calculate stats
      const total = res.data.length
      const active = res.data.filter(u => u.is_active).length
      const admins = res.data.filter(u => u.role === 'admin').length
      setStats({ total, active, admins })
    } catch (e) {
      toast({ title: 'Failed to load users', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const openAddUser = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'user',
      position: '',
      is_active: true,
      github_username: ''
    })
    onOpen()
  }

  const openEditUser = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      password: '', // Don't populate password
      role: user.role || 'user',
      position: user.position || '',
      is_active: user.is_active,
      github_username: user.github_username || ''
    })
    onOpen()
  }

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const payload = {
          full_name: formData.full_name || null,
          role: formData.role,
          position: formData.position || null,
          github_username: formData.github_username || null,
        }
        // Only include password if it's provided
        if (formData.password.trim()) {
          payload.password = formData.password
        }
        
        await api.patch(`/users/${editingUser.id}`, payload)
        toast({ title: 'User updated', status: 'success' })
      } else {
        // Create new user
        if (!formData.email || !formData.password) {
          toast({ title: 'Email and password are required', status: 'warning' })
          return
        }
        await api.post('/auth/signup', {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name || null,
          role: formData.role,
          position: formData.position || null
        })
        toast({ title: 'User created', status: 'success' })
      }
      
      onClose()
      loadUsers()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to save user'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const toggleUserStatus = async (user) => {
    try {
      await api.patch(`/users/${user.id}`, { is_active: !user.is_active })
      toast({ 
        title: user.is_active ? 'User deactivated' : 'User activated', 
        status: 'success' 
      })
      loadUsers()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to update user status'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  // Show access denied for non-admin users
  if (!loading && !isAdmin) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access the Employee Management page. 
              This page is only available to administrators.
            </AlertDescription>
          </Box>
        </Alert>
        <Button mt={4} onClick={() => navigate('/')} colorScheme="blue">
          Go to Dashboard
        </Button>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">Employee Management</Heading>
          <Text color="gray.600">Manage organization users and employees</Text>
        </VStack>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={openAddUser}>
          Add Employee
        </Button>
      </Flex>

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Stat bg="white" p={4} rounded="lg" shadow="sm">
          <StatLabel>Total Employees</StatLabel>
          <StatNumber>{stats.total}</StatNumber>
        </Stat>
        <Stat bg="white" p={4} rounded="lg" shadow="sm">
          <StatLabel>Active Employees</StatLabel>
          <StatNumber color="green.500">{stats.active}</StatNumber>
        </Stat>
        <Stat bg="white" p={4} rounded="lg" shadow="sm">
          <StatLabel>Administrators</StatLabel>
          <StatNumber color="blue.500">{stats.admins}</StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Users Table */}
      <Card>
        <CardBody>
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Position</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>GitHub Username</Th>
                    <Th>Status</Th>
                    <Th>Joined</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map(user => (
                    <Tr key={user.id}>
                      <Td>
                        <Text
                          fontWeight="medium"
                          color="blue.600"
                          cursor="pointer"
                          _hover={{ textDecoration: 'underline' }}
                          onClick={() => navigate(`/users/${user.id}/profile`)}
                        >
                          {user.full_name || 'N/A'}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {user.position || '-'}
                        </Text>
                      </Td>
                      <Td>{user.email}</Td>
                      <Td>
                        <Badge colorScheme={user.role === 'admin' ? 'purple' : 'gray'}>
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {user.github_username || '-'}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={user.is_active ? 'green' : 'red'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <IconButton
                            icon={<EditIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditUser(user)}
                            aria-label="Edit user"
                          />
                          <Button
                            size="sm"
                            colorScheme={user.is_active ? 'red' : 'green'}
                            variant="ghost"
                            onClick={() => toggleUserStatus(user)}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                  {users.length === 0 && (
                    <Tr>
                      <Td colSpan={8}>
                        <Text p={4} textAlign="center" color="gray.600">
                          No employees found. Click "Add Employee" to get started.
                        </Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingUser ? 'Edit Employee' : 'Add New Employee'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired={!editingUser}>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  isDisabled={!!editingUser}
                  placeholder="employee@company.com"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Full Name</FormLabel>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Position</FormLabel>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Senior Developer, Product Manager, etc."
                />
              </FormControl>

              <FormControl isRequired={!editingUser}>
                <FormLabel>
                  Password {editingUser && '(leave empty to keep current)'}
                </FormLabel>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Enter new password' : 'Password'}
                />
              </FormControl>

              <FormControl>
                <FormLabel>GitHub Username</FormLabel>
                <Input
                  value={formData.github_username}
                  onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                  placeholder="octocat"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveUser}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}
