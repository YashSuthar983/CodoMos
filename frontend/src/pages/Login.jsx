import React, { useState } from 'react'
import { Box, Button, Container, Flex, Heading, Input, Stack, Text, useToast, FormControl, FormLabel } from '@chakra-ui/react'
import api from '../api/client'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)
      const { data } = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      localStorage.setItem('token', data.access_token)
      toast({ title: 'Welcome back!', status: 'success' })
      navigate('/')
    } catch (err) {
      toast({ title: 'Login failed', description: err?.response?.data?.detail || 'Check credentials', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Container maxW="sm" bg="white" p={8} rounded="md" shadow="sm" border="1px" borderColor="gray.200">
        <Heading size="lg" mb={6} color="blue.600">CogniWork</Heading>
        <form onSubmit={onSubmit}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </FormControl>
            <Button type="submit" isLoading={loading} colorScheme="blue">Sign In</Button>
            <Text fontSize="sm">No account? <Box as={Link} to="/signup" color="blue.600" display="inline">Sign up</Box></Text>
          </Stack>
        </form>
      </Container>
    </Flex>
  )
}
