import React, { useState } from 'react'
import { Box, Button, Container, Flex, Heading, Input, Stack, Text, useToast, FormControl, FormLabel, Icon, HStack, VStack } from '@chakra-ui/react'
import api from '../api/client'
import { useNavigate, Link } from 'react-router-dom'
import { FaRocket } from 'react-icons/fa'

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
      navigate('/dashboard')
    } catch (err) {
      toast({ title: 'Signup failed', description: err?.response?.data?.detail || 'Try another email', status: 'error' })
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
          <Text color="gray.600" fontSize="lg">Create your account to get started</Text>
        </VStack>
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
            <Button 
              type="submit" 
              isLoading={loading} 
              bgGradient="linear(to-r, cyan.400, blue.500)"
              color="white"
              size="lg"
              _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)', transform: 'translateY(-2px)', shadow: 'lg' }}
              shadow="md"
            >
              Sign Up
            </Button>
            <Text fontSize="sm" textAlign="center">Already have an account? <Box as={Link} to="/login" color="cyan.600" display="inline" fontWeight="semibold" _hover={{ color: 'cyan.700', textDecoration: 'underline' }}>Sign in</Box></Text>
          </Stack>
        </form>
      </Container>
    </Flex>
  )
}
