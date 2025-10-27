import React from 'react'
import { Box, Flex, HStack, Link as ChakraLink, Button, Spacer, Text } from '@chakra-ui/react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const onLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <Box bg="white" borderBottom="1px" borderColor="gray.200" px={6} py={3} position="sticky" top={0} zIndex={100}>
      <Flex align="center">
        <Text fontWeight="bold" color="blue.600">CogniWork</Text>
        <HStack spacing={4} ml={8}>
          <ChakraLink as={Link} to="/">Dashboard</ChakraLink>
          <ChakraLink as={Link} to="/candidates">Candidates</ChakraLink>
          <ChakraLink as={Link} to="/roles">Roles</ChakraLink>
          <ChakraLink as={Link} to="/projects">Projects</ChakraLink>
          <ChakraLink as={Link} to="/forms">Forms</ChakraLink>
          {/* Temporary demo link so reviewers can view Employee UI without login */}
          <ChakraLink as={Link} to="/employee-demo">Employee (demo)</ChakraLink>
        </HStack>
        <Spacer />
        <Button size="sm" variant="outline" onClick={onLogout}>Logout</Button>
      </Flex>
    </Box>
  )
}
