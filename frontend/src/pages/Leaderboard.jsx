import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Container, Heading, useToast, Card, CardBody, Text,
  Table, Thead, Tbody, Tr, Th, Td, Badge, VStack, HStack,
  Flex, Stat, StatLabel, StatNumber, SimpleGrid, Avatar, Spinner
} from '@chakra-ui/react'
import { FaTrophy, FaMedal, FaAward, FaStar } from 'react-icons/fa'
import api from '../api/client'

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [stats, setStats] = useState({ total_users: 0, total_xp: 0 })
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users/leaderboard/organization')
      setLeaderboard(res.data.leaderboard || [])
      setStats({
        total_users: res.data.total_users || 0,
        total_xp: res.data.total_xp || 0
      })
    } catch (e) {
      toast({
        title: 'Failed to load leaderboard',
        description: e.response?.data?.detail || 'An error occurred',
        status: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <FaTrophy color="#FFD700" size={24} />
    if (rank === 2) return <FaMedal color="#C0C0C0" size={22} />
    if (rank === 3) return <FaAward color="#CD7F32" size={20} />
    return null
  }

  const getRankColor = (rank) => {
    if (rank === 1) return 'yellow.400'
    if (rank === 2) return 'gray.400'
    if (rank === 3) return 'orange.400'
    return 'gray.600'
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading size="lg">
              <HStack>
                <FaTrophy color="#FFD700" />
                <Text>Organization Leaderboard</Text>
              </HStack>
            </Heading>
            <Text color="gray.600">Top performers across the organization</Text>
          </VStack>
        </Flex>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Stat bg="white" p={4} rounded="lg" shadow="sm">
            <StatLabel>Total Employees</StatLabel>
            <StatNumber>{stats.total_users}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} rounded="lg" shadow="sm">
            <StatLabel>Total Organization XP</StatLabel>
            <StatNumber color="blue.600">{stats.total_xp.toLocaleString()}</StatNumber>
          </Stat>
        </SimpleGrid>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
            {/* Second Place */}
            <Card bg="gray.50" order={{ base: 2, md: 1 }}>
              <CardBody textAlign="center">
                <VStack spacing={3}>
                  <FaMedal size={40} color="#C0C0C0" />
                  <Avatar
                    size="lg"
                    name={leaderboard[1]?.full_name}
                    bg="gray.500"
                  />
                  <VStack spacing={0}>
                    <Text fontWeight="bold" fontSize="lg">{leaderboard[1]?.full_name}</Text>
                    <Text fontSize="sm" color="gray.600">{leaderboard[1]?.position}</Text>
                  </VStack>
                  <Heading size="md" color="gray.600">#{2}</Heading>
                  <Badge colorScheme="gray" fontSize="md" px={3} py={1}>
                    {leaderboard[1]?.total_xp.toLocaleString()} XP
                  </Badge>
                </VStack>
              </CardBody>
            </Card>

            {/* First Place */}
            <Card bg="yellow.50" borderWidth={2} borderColor="yellow.400" order={{ base: 1, md: 2 }}>
              <CardBody textAlign="center">
                <VStack spacing={3}>
                  <FaTrophy size={48} color="#FFD700" />
                  <Avatar
                    size="xl"
                    name={leaderboard[0]?.full_name}
                    bg="yellow.500"
                  />
                  <VStack spacing={0}>
                    <Text fontWeight="bold" fontSize="xl">{leaderboard[0]?.full_name}</Text>
                    <Text fontSize="sm" color="gray.600">{leaderboard[0]?.position}</Text>
                  </VStack>
                  <Heading size="lg" color="yellow.600">#{1}</Heading>
                  <Badge colorScheme="yellow" fontSize="lg" px={4} py={2}>
                    {leaderboard[0]?.total_xp.toLocaleString()} XP
                  </Badge>
                </VStack>
              </CardBody>
            </Card>

            {/* Third Place */}
            <Card bg="orange.50" order={{ base: 3, md: 3 }}>
              <CardBody textAlign="center">
                <VStack spacing={3}>
                  <FaAward size={36} color="#CD7F32" />
                  <Avatar
                    size="lg"
                    name={leaderboard[2]?.full_name}
                    bg="orange.500"
                  />
                  <VStack spacing={0}>
                    <Text fontWeight="bold" fontSize="lg">{leaderboard[2]?.full_name}</Text>
                    <Text fontSize="sm" color="gray.600">{leaderboard[2]?.position}</Text>
                  </VStack>
                  <Heading size="md" color="orange.600">#{3}</Heading>
                  <Badge colorScheme="orange" fontSize="md" px={3} py={1}>
                    {leaderboard[2]?.total_xp.toLocaleString()} XP
                  </Badge>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Full Leaderboard Table */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>Full Rankings</Heading>
            {loading ? (
              <Flex justify="center" py={8}>
                <Spinner size="lg" color="blue.500" />
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Rank</Th>
                      <Th>Employee</Th>
                      <Th>Position</Th>
                      <Th>Projects</Th>
                      <Th>Top Skill</Th>
                      <Th isNumeric>Total XP</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {leaderboard.map((entry) => (
                      <Tr
                        key={entry.user_id}
                        _hover={{ bg: 'gray.50' }}
                        cursor="pointer"
                        onClick={() => navigate(`/users/${entry.user_id}/profile`)}
                      >
                        <Td>
                          <HStack spacing={2}>
                            {getRankIcon(entry.rank)}
                            <Text
                              fontWeight={entry.rank <= 3 ? 'bold' : 'normal'}
                              color={getRankColor(entry.rank)}
                              fontSize={entry.rank <= 3 ? 'lg' : 'md'}
                            >
                              #{entry.rank}
                            </Text>
                          </HStack>
                        </Td>
                        <Td>
                          <HStack spacing={3}>
                            <Avatar
                              size="sm"
                              name={entry.full_name}
                              bg="blue.500"
                            />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="medium">{entry.full_name}</Text>
                              <Text fontSize="xs" color="gray.600">{entry.email}</Text>
                            </VStack>
                          </HStack>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color="gray.600">
                            {entry.position}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme="blue">{entry.project_count}</Badge>
                        </Td>
                        <Td>
                          {entry.top_skill && (
                            <HStack spacing={2}>
                              <FaStar color="#3182CE" size={12} />
                              <Text fontSize="sm">{entry.top_skill}</Text>
                            </HStack>
                          )}
                        </Td>
                        <Td isNumeric>
                          <Text fontWeight="bold" color="green.600" fontSize="lg">
                            {entry.total_xp.toLocaleString()}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                    {leaderboard.length === 0 && (
                      <Tr>
                        <Td colSpan={6}>
                          <Text p={4} textAlign="center" color="gray.600">
                            No data available yet. Start earning XP!
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
      </VStack>
    </Container>
  )
}
