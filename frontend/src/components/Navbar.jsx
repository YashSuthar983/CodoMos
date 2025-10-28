import React, { useEffect, useState } from 'react'
import { Box, Flex, HStack, Link as ChakraLink, Button, Spacer, Text, Icon } from '@chakra-ui/react'
import { Link, useNavigate } from 'react-router-dom'
import { FaRocket } from 'react-icons/fa'
import api from '../api/client'
import NotificationBell from './NotificationBell'
import CogniBot from './CogniBot'

export default function Navbar() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me')
      setCurrentUser(res.data)
    } catch (e) {
      console.error('Failed to fetch current user:', e)
    }
  }

  const onLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <Box 
      bgGradient="linear(to-r, cyan.50, blue.50)" 
      borderBottom="2px" 
      borderColor="cyan.200" 
      px={6} 
      py={4} 
      position="sticky" 
      top={0} 
      zIndex={100}
      shadow="md"
    >
      <Flex align="center">
        <HStack spacing={2}>
          <Icon as={FaRocket} boxSize={8} color="cyan.500" />
          <Text fontWeight="black" fontSize="xl" bgGradient="linear(to-r, cyan.500, blue.600)" bgClip="text">CogniWork</Text>
        </HStack>
        <HStack spacing={6} ml={10}>
          {/* Candidate-only links */}
          {currentUser?.role === 'candidate' && (
            <ChakraLink 
              as={Link} 
              to="/candidate-portal"
              fontWeight="semibold"
              color="gray.700"
              _hover={{ color: 'cyan.600', textDecoration: 'none' }}
            >
              My Application
            </ChakraLink>
          )}
          
          {/* Employee/Admin links (hide from candidates) */}
          {currentUser?.role !== 'candidate' && (
            <>
              <ChakraLink 
                as={Link} 
                to="/dashboard"
                fontWeight="semibold"
                color="gray.700"
                _hover={{ color: 'cyan.600', textDecoration: 'none' }}
              >
                Dashboard
              </ChakraLink>
              <ChakraLink 
                as={Link} 
                to="/projects"
                fontWeight="semibold"
                color="gray.700"
                _hover={{ color: 'cyan.600', textDecoration: 'none' }}
              >
                Projects
              </ChakraLink>
              <ChakraLink 
                as={Link} 
                to="/insights"
                fontWeight="semibold"
                color="gray.700"
                _hover={{ color: 'cyan.600', textDecoration: 'none' }}
              >
                Insights
              </ChakraLink>
              <ChakraLink 
                as={Link} 
                to="/forms"
                fontWeight="semibold"
                color="gray.700"
                _hover={{ color: 'cyan.600', textDecoration: 'none' }}
              >
                Forms
              </ChakraLink>
            </>
          )}
          {currentUser?.role === 'admin' && (
            <ChakraLink 
              as={Link} 
              to="/hiring"
              fontWeight="semibold"
              color="gray.700"
              _hover={{ color: 'cyan.600', textDecoration: 'none' }}
            >
              Hiring
            </ChakraLink>
          )}
          {currentUser?.role === 'admin' && (
            <ChakraLink 
              as={Link} 
              to="/users"
              fontWeight="semibold"
              color="gray.700"
              _hover={{ color: 'cyan.600', textDecoration: 'none' }}
            >
              Users
            </ChakraLink>
          )}
          {currentUser?.role === 'admin' && (
            <ChakraLink 
              as={Link} 
              to="/analytics"
              fontWeight="semibold"
              color="gray.700"
              _hover={{ color: 'cyan.600', textDecoration: 'none' }}
            >
              Analytics
            </ChakraLink>
          )}
          {currentUser?.role === 'admin' && (
            <ChakraLink 
              as={Link} 
              to="/settings"
              fontWeight="semibold"
              color="gray.700"
              _hover={{ color: 'cyan.600', textDecoration: 'none' }}
            >
              Settings
            </ChakraLink>
          )}
        </HStack>
        <Spacer />
        <HStack spacing={3}>
          <NotificationBell />
          <Button size="sm" variant="outline" onClick={onLogout}>Logout</Button>
        </HStack>
        <Button 
          size="md" 
          bgGradient="linear(to-r, cyan.400, blue.500)" 
          color="white"
          onClick={onLogout}
          _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)', transform: 'translateY(-2px)', shadow: 'lg' }}
          shadow="md"
        >
          Logout
        </Button>
      </Flex>
      {/* Floating CogniBot lives here so it's global */}
      <CogniBot />
    </Box>
  )
}
