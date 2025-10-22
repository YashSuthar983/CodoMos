import React, { useState } from 'react'
import { Box, Button, Container, Flex, Heading, Input, Stack, Text, useToast, FormControl, FormLabel } from '@chakra-ui/react'
import api from '../api/client'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/signup', { email, password, full_name: fullName })
      toast({ title: 'Account created', status: 'success' })
      // auto login
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)
      const { data } = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      localStorage.setItem('token', data.access_token)
      navigate('/')
    } catch (err) {
      toast({ title: 'Signup failed', description: err?.response?.data?.detail || 'Try another email', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Container maxW="sm" bg="white" p={8} rounded="md" shadow="sm" border="1px" borderColor="gray.200">
        <Heading size="lg" mb={6} color="blue.600">Create account</Heading>
        <form onSubmit={onSubmit}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Full name</FormLabel>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </FormControl>
            <Button type="submit" isLoading={loading} colorScheme="blue">Sign Up</Button>
            <Text fontSize="sm">Already have an account? <Box as={Link} to="/login" color="blue.600" display="inline">Sign in</Box></Text>
          </Stack>
        </form>
      </Container>
    </Flex>
  )
}
