import React, { useEffect, useState } from 'react'
import { Box, Container, Heading, SimpleGrid, Spinner, useToast, Button, Card, CardBody, Text, Badge, VStack, Flex, Icon, Grid, Progress, Stat, StatLabel, StatNumber, StatHelpText, Divider } from '@chakra-ui/react'
import api from '../api/client'
import { Link } from 'react-router-dom'
import { FaProjectDiagram, FaChartLine, FaBullseye, FaCalendarAlt, FaUsers, FaCheckCircle, FaClock } from 'react-icons/fa'

function ProjectCard({ project, repoCount }) {
  return (
    <Card 
      as={Link} 
      to={`/projects/${project.id}`} 
      _hover={{ shadow: '2xl', transform: 'translateY(-4px)', borderColor: 'cyan.400' }} 
      transition="all 0.3s"
      borderWidth="2px"
      borderColor="cyan.100"
    >
      <CardBody>
        <VStack align="start" spacing={3}>
          <Flex w="full" justify="space-between" align="center">
            <Heading size="md">{project.name}</Heading>
            <Badge 
              bgGradient={project.status === 'active' ? 'linear(to-r, cyan.400, blue.500)' : 'gray.400'}
              color="white"
              px={3}
              py={1}
              borderRadius="full"
            >
              {project.status}
            </Badge>
          </Flex>
          <Text fontSize="sm" color="gray.600">{repoCount} {repoCount === 1 ? 'repository' : 'repositories'} linked</Text>
          <Text fontSize="xs" color="gray.500">Click to manage repos, team & settings</Text>
        </VStack>
      </CardBody>
    </Card>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [repos, setRepos] = useState([])
  const [reviewStats, setReviewStats] = useState(null)
  const [goalStats, setGoalStats] = useState(null)
  const [upcomingMeetings, setUpcomingMeetings] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const toast = useToast()

  useEffect(() => {
    async function load() {
      try {
        const [proj, reposData, user, reviews, goals, meetings] = await Promise.all([
          api.get('/projects/'),
          api.get('/projects/repos'),
          api.get('/auth/me'),
          api.get('/performance/reviews/stats').catch(() => ({ data: { total_reviews: 0, completed: 0, average_rating: 0 } })),
          api.get('/performance/goals/stats').catch(() => ({ data: { total_goals: 0, completed: 0, in_progress: 0, completion_rate: 0 } })),
          api.get('/performance/meetings/upcoming').catch(() => ({ data: [] }))
        ])
        setProjects(proj.data || [])
        setRepos(reposData.data || [])
        setCurrentUser(user.data)
        setReviewStats(reviews.data)
        setGoalStats(goals.data)
        setUpcomingMeetings(meetings.data || [])
      } catch (err) {
        toast({ title: 'Failed to load dashboard', status: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const getRepoCount = (projectId) => {
    return repos.filter(r => (r.project_ids || []).includes(projectId)).length
  }

  if (loading) return (
    <Container maxW="6xl" py={8}><Spinner /></Container>
  )

  const activeProjects = projects.filter(p => p.status === 'active')

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="7xl" py={8}>
        {/* Welcome Header */}
        <VStack align="start" spacing={2} mb={8}>
          <Heading size="2xl" bgGradient="linear(to-r, cyan.600, blue.700)" bgClip="text">
            Welcome back{currentUser?.full_name ? `, ${currentUser.full_name}` : ''}! 👋
          </Heading>
          <Text fontSize="lg" color="gray.600">Here's what's happening with your work today</Text>
        </VStack>

        {/* Stats Overview */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <Card 
            borderWidth="2px" 
            borderColor="cyan.100"
            _hover={{ borderColor: 'cyan.300', shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.3s"
          >
            <CardBody>
              <Flex align="center" justify="space-between">
                <Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="semibold">Active Projects</Text>
                  <Heading size="2xl" color="cyan.600" mt={2}>{activeProjects.length}</Heading>
                  <Text fontSize="xs" color="gray.500" mt={1}>{projects.length} total</Text>
                </Box>
                <Box 
                  p={3} 
                  borderRadius="xl" 
                  bgGradient="linear(to-br, cyan.400, blue.500)"
                >
                  <Icon as={FaProjectDiagram} boxSize={8} color="white" />
                </Box>
              </Flex>
            </CardBody>
          </Card>

          <Card 
            borderWidth="2px" 
            borderColor="blue.100"
            _hover={{ borderColor: 'blue.300', shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.3s"
          >
            <CardBody>
              <Flex align="center" justify="space-between">
                <Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="semibold">Performance Reviews</Text>
                  <Heading size="2xl" color="blue.600" mt={2}>{reviewStats?.completed || 0}</Heading>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {reviewStats?.average_rating ? `${reviewStats.average_rating.toFixed(1)} avg rating` : 'No ratings yet'}
                  </Text>
                </Box>
                <Box 
                  p={3} 
                  borderRadius="xl" 
                  bgGradient="linear(to-br, blue.400, blue.600)"
                >
                  <Icon as={FaChartLine} boxSize={8} color="white" />
                </Box>
              </Flex>
            </CardBody>
          </Card>

          <Card 
            borderWidth="2px" 
            borderColor="teal.100"
            _hover={{ borderColor: 'teal.300', shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.3s"
          >
            <CardBody>
              <Flex align="center" justify="space-between">
                <Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="semibold">Goals Progress</Text>
                  <Heading size="2xl" color="teal.600" mt={2}>{goalStats?.completed || 0}/{goalStats?.total_goals || 0}</Heading>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {goalStats?.completion_rate || 0}% complete
                  </Text>
                </Box>
                <Box 
                  p={3} 
                  borderRadius="xl" 
                  bgGradient="linear(to-br, teal.400, teal.600)"
                >
                  <Icon as={FaBullseye} boxSize={8} color="white" />
                </Box>
              </Flex>
            </CardBody>
          </Card>

          <Card 
            borderWidth="2px" 
            borderColor="purple.100"
            _hover={{ borderColor: 'purple.300', shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.3s"
          >
            <CardBody>
              <Flex align="center" justify="space-between">
                <Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="semibold">Upcoming Meetings</Text>
                  <Heading size="2xl" color="purple.600" mt={2}>{upcomingMeetings?.length || 0}</Heading>
                  <Text fontSize="xs" color="gray.500" mt={1}>scheduled soon</Text>
                </Box>
                <Box 
                  p={3} 
                  borderRadius="xl" 
                  bgGradient="linear(to-br, purple.400, purple.600)"
                >
                  <Icon as={FaCalendarAlt} boxSize={8} color="white" />
                </Box>
              </Flex>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Main Content Grid */}
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6} mb={8}>
          {/* Active Projects */}
          <Card borderWidth="2px" borderColor="cyan.100" shadow="lg">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="gray.700">Active Projects</Heading>
                <Button 
                  as={Link} 
                  to="/projects/new" 
                  size="sm"
                  bgGradient="linear(to-r, cyan.400, blue.500)"
                  color="white"
                  _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)' }}
                >
                  + New
                </Button>
              </Flex>
              <Divider mb={4} />
              {activeProjects.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Icon as={FaProjectDiagram} boxSize={12} color="gray.400" mb={4} />
                  <Text color="gray.600" mb={4}>No active projects yet</Text>
                  <Button 
                    as={Link} 
                    to="/projects/new" 
                    size="sm"
                    colorScheme="cyan"
                  >
                    Create First Project
                  </Button>
                </Box>
              ) : (
                <VStack spacing={3} align="stretch">
                  {activeProjects.slice(0, 5).map(proj => (
                    <Card 
                      key={proj.id}
                      as={Link}
                      to={`/projects/${proj.id}`}
                      variant="outline"
                      borderColor="cyan.100"
                      _hover={{ borderColor: 'cyan.400', bg: 'cyan.50' }}
                      transition="all 0.2s"
                    >
                      <CardBody py={3}>
                        <Flex justify="space-between" align="center">
                          <Box>
                            <Text fontWeight="semibold" color="gray.800">{proj.name}</Text>
                            <Text fontSize="xs" color="gray.600">{getRepoCount(proj.id)} repositories</Text>
                          </Box>
                          <Badge 
                            bgGradient="linear(to-r, cyan.400, blue.500)"
                            color="white"
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {proj.status}
                          </Badge>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                  {activeProjects.length > 5 && (
                    <Button as={Link} to="/projects" variant="ghost" colorScheme="cyan" size="sm">
                      View all {activeProjects.length} projects →
                    </Button>
                  )}
                </VStack>
              )}
            </CardBody>
          </Card>

          {/* Upcoming Meetings */}
          <Card borderWidth="2px" borderColor="purple.100" shadow="lg">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="gray.700">Upcoming 1:1s</Heading>
                <Button 
                  as={Link} 
                  to="/performance/meetings" 
                  size="sm"
                  colorScheme="purple"
                  variant="ghost"
                >
                  View All
                </Button>
              </Flex>
              <Divider mb={4} />
              {upcomingMeetings?.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <Icon as={FaCalendarAlt} boxSize={10} color="gray.400" mb={3} />
                  <Text fontSize="sm" color="gray.600" mb={3}>No upcoming meetings</Text>
                  <Button 
                    as={Link} 
                    to="/performance/meetings" 
                    size="sm"
                    colorScheme="purple"
                  >
                    Schedule Meeting
                  </Button>
                </Box>
              ) : (
                <VStack spacing={3} align="stretch">
                  {upcomingMeetings.slice(0, 4).map((meeting, idx) => (
                    <Card key={idx} variant="outline" borderColor="purple.100">
                      <CardBody py={3}>
                        <Text fontWeight="semibold" fontSize="sm" color="gray.800" mb={1}>{meeting.title}</Text>
                        <Flex align="center" gap={2}>
                          <Icon as={FaClock} boxSize={3} color="gray.500" />
                          <Text fontSize="xs" color="gray.600">
                            {new Date(meeting.scheduled_date).toLocaleDateString()} at {new Date(meeting.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </CardBody>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Card borderWidth="2px" borderColor="cyan.100" shadow="lg">
          <CardBody>
            <Heading size="md" color="gray.700" mb={4}>Quick Actions</Heading>
            <Divider mb={4} />
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Button
                as={Link}
                to="/performance/reviews"
                h="auto"
                py={6}
                flexDirection="column"
                gap={2}
                bgGradient="linear(to-br, cyan.50, blue.50)"
                borderWidth="2px"
                borderColor="cyan.200"
                _hover={{ borderColor: 'cyan.400', transform: 'translateY(-2px)', shadow: 'lg' }}
              >
                <Icon as={FaChartLine} boxSize={8} color="cyan.600" />
                <Text fontWeight="semibold" color="gray.700">Performance Reviews</Text>
              </Button>
              <Button
                as={Link}
                to="/performance/goals"
                h="auto"
                py={6}
                flexDirection="column"
                gap={2}
                bgGradient="linear(to-br, teal.50, cyan.50)"
                borderWidth="2px"
                borderColor="teal.200"
                _hover={{ borderColor: 'teal.400', transform: 'translateY(-2px)', shadow: 'lg' }}
              >
                <Icon as={FaBullseye} boxSize={8} color="teal.600" />
                <Text fontWeight="semibold" color="gray.700">Goals & OKRs</Text>
              </Button>
              <Button
                as={Link}
                to="/users"
                h="auto"
                py={6}
                flexDirection="column"
                gap={2}
                bgGradient="linear(to-br, purple.50, pink.50)"
                borderWidth="2px"
                borderColor="purple.200"
                _hover={{ borderColor: 'purple.400', transform: 'translateY(-2px)', shadow: 'lg' }}
              >
                <Icon as={FaUsers} boxSize={8} color="purple.600" />
                <Text fontWeight="semibold" color="gray.700">Team Members</Text>
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Container>
    </Box>
  )
}
