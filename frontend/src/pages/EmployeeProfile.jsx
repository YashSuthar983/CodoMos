import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Container, Heading, useToast, Button, Card, CardBody, Text,
  VStack, HStack, Badge, Flex, Stat, StatLabel, StatNumber, SimpleGrid,
  Avatar, Divider, Table, Thead, Tbody, Tr, Th, Td, Tag, Spinner,
  Progress
} from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { FaGithub, FaTrophy, FaProjectDiagram, FaStar } from 'react-icons/fa'
import api from '../api/client'

export default function EmployeeProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/users/${userId}/profile`)
      setProfile(res.data)
    } catch (e) {
      toast({
        title: 'Failed to load profile',
        description: e.response?.data?.detail || 'An error occurred',
        status: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Container>
    )
  }

  if (!profile) {
    return (
      <Container maxW="7xl" py={8}>
        <Text>Profile not found</Text>
        <Button mt={4} onClick={() => navigate('/users')}>Back to Users</Button>
      </Container>
    )
  }

  const { user, stats, projects, recent_xp } = profile
  const sortedSkills = Object.entries(stats.xp_by_skill || {}).sort((a, b) => b[1] - a[1])

  return (
    <Container maxW="7xl" py={8}>
      <Button
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        mb={4}
        onClick={() => navigate('/users')}
      >
        Back to Users
      </Button>

      {/* Profile Header */}
      <Card mb={6}>
        <CardBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={6} align="center">
            <Avatar
              size="2xl"
              name={user.full_name || user.email}
              bg="blue.500"
              color="white"
            />
            <VStack align={{ base: 'center', md: 'start' }} spacing={2} flex={1}>
              <Heading size="lg">{user.full_name || 'Unknown'}</Heading>
              <Text fontSize="lg" color="gray.600">{user.position || 'Employee'}</Text>
              <HStack spacing={3} flexWrap="wrap">
                <Badge colorScheme={user.role === 'admin' ? 'purple' : 'gray'} fontSize="sm">
                  {user.role}
                </Badge>
                <Badge colorScheme={user.is_active ? 'green' : 'red'} fontSize="sm">
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Text fontSize="sm" color="gray.600">{user.email}</Text>
              </HStack>
              {user.github_username && (
                <HStack spacing={2}>
                  <FaGithub />
                  <Text fontSize="sm" color="blue.600">@{user.github_username}</Text>
                </HStack>
              )}
            </VStack>
          </Flex>
        </CardBody>
      </Card>

      {/* Stats Overview */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Stat bg="white" p={6} rounded="lg" shadow="sm" borderLeft="4px" borderColor="blue.400">
          <StatLabel color="gray.600">Total XP</StatLabel>
          <StatNumber fontSize="3xl" color="blue.600">
            <HStack>
              <FaTrophy />
              <Text>{stats.total_xp.toLocaleString()}</Text>
            </HStack>
          </StatNumber>
        </Stat>
        <Stat bg="white" p={6} rounded="lg" shadow="sm" borderLeft="4px" borderColor="green.400">
          <StatLabel color="gray.600">Projects</StatLabel>
          <StatNumber fontSize="3xl" color="green.600">
            <HStack>
              <FaProjectDiagram />
              <Text>{stats.project_count}</Text>
            </HStack>
          </StatNumber>
        </Stat>
        <Stat bg="white" p={6} rounded="lg" shadow="sm" borderLeft="4px" borderColor="purple.400">
          <StatLabel color="gray.600">XP Events</StatLabel>
          <StatNumber fontSize="3xl" color="purple.600">
            <HStack>
              <FaStar />
              <Text>{stats.xp_events_count}</Text>
            </HStack>
          </StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Skills Breakdown */}
      {sortedSkills.length > 0 && (
        <Card mb={6}>
          <CardBody>
            <Heading size="md" mb={4}>Skills & Expertise</Heading>
            <VStack spacing={4} align="stretch">
              {sortedSkills.map(([skill, xp]) => {
                const percentage = (xp / stats.total_xp) * 100
                return (
                  <Box key={skill}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontWeight="medium">{skill}</Text>
                      <Text color="gray.600">{xp} XP</Text>
                    </Flex>
                    <Progress
                      value={percentage}
                      colorScheme="blue"
                      size="sm"
                      rounded="full"
                    />
                  </Box>
                )
              })}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <Card mb={6}>
          <CardBody>
            <Heading size="md" mb={4}>Project Involvement</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {projects.map(project => (
                <Box
                  key={project.id}
                  p={4}
                  bg="gray.50"
                  rounded="lg"
                  cursor="pointer"
                  _hover={{ bg: 'gray.100' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">{project.name}</Text>
                      <Badge colorScheme="blue">{project.role}</Badge>
                    </VStack>
                    <FaProjectDiagram size={24} color="#3182CE" />
                  </Flex>
                </Box>
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      )}

      {/* Recent XP Activity */}
      {recent_xp && recent_xp.length > 0 && (
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>Recent XP Activity</Heading>
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Source</Th>
                    <Th isNumeric>XP Gained</Th>
                    <Th>Date</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recent_xp.map(event => (
                    <Tr key={event.id}>
                      <Td>
                        <Tag colorScheme="blue" size="sm">{event.source}</Tag>
                      </Td>
                      <Td isNumeric>
                        <Text fontWeight="bold" color="green.600">+{event.amount}</Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {event.created_at ? new Date(event.created_at).toLocaleDateString() : '-'}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>
      )}
    </Container>
  )
}
