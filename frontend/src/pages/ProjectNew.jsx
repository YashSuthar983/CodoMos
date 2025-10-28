import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Container, Heading, Card, CardBody, Input, Button, VStack, useToast, FormControl, FormLabel, FormHelperText } from '@chakra-ui/react'
import api from '../api/client'

export default function ProjectNew() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: 'Project name is required', status: 'warning' })
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/projects/', { name: name.trim(), status: 'active' })
      toast({ title: 'Project created!', status: 'success' })
      navigate(`/projects/${res.data.id}`)
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to create project'
      toast({ title: 'Error', description: msg, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="2xl" py={8}>
        <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm" mb={4}>← Back to Dashboard</Button>
        
        <Card>
          <CardBody>
            <Heading size="lg" mb={6}>Create New Project</Heading>
            <form onSubmit={handleSubmit}>
              <VStack spacing={6} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Project Name</FormLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Web App"
                    size="lg"
                  />
                  <FormHelperText>Give your project a descriptive name</FormHelperText>
                </FormControl>

                <Button type="submit" colorScheme="blue" size="lg" isLoading={loading}>
                  Create Project
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </Container>
    </Box>
  )
}
