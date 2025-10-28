import React, { useState } from 'react'
import { Box, Button, Container, Flex, Heading, Input, Stack, Text, useToast, FormControl, FormLabel, Icon, HStack, VStack } from '@chakra-ui/react'
import api from '../api/client'
import { useNavigate, Link } from 'react-router-dom'
import { FaRocket } from 'react-icons/fa'

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
      
      // Check user role and redirect accordingly
      try {
        const userRes = await api.get('/auth/me')
        if (userRes.data.role === 'candidate') {
          navigate('/candidate-portal')
        } else {
          navigate('/dashboard')
        }
      } catch {
        navigate('/dashboard')
      }
      
      toast({ title: 'Welcome back!', status: 'success' })
    } catch (err) {
      toast({ title: 'Login failed', description: err?.response?.data?.detail || 'Check credentials', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-br, cyan.50, blue.50, teal.50)">
      <Container maxW="md" bg="white" p={10} rounded="2xl" shadow="2xl" borderWidth="2px" borderColor="cyan.200">
        <VStack spacing={4} mb={8}>
          <HStack spacing={3}>
            <Icon as={FaRocket} boxSize={10} color="cyan.500" />
            <Heading size="xl" bgGradient="linear(to-r, cyan.500, blue.600)" bgClip="text" fontWeight="black">
              CogniWork
            </Heading>
          </HStack>
          <Text color="gray.600" fontSize="lg">Welcome back! Sign in to continue</Text>
        </VStack>
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
            <Button 
              type="submit" 
              isLoading={loading} 
              bgGradient="linear(to-r, cyan.400, blue.500)"
              color="white"
              size="lg"
              _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)', transform: 'translateY(-2px)', shadow: 'lg' }}
              shadow="md"
            >
              Sign In
            </Button>
            <Text fontSize="sm" textAlign="center">No account? <Box as={Link} to="/signup" color="cyan.600" display="inline" fontWeight="semibold" _hover={{ color: 'cyan.700', textDecoration: 'underline' }}>Sign up</Box></Text>
          </Stack>
        </form>
      </Container>
    </Flex>
  )
}
