import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, useToast, Button, Card, CardBody, Text,
  VStack, HStack, Flex, Badge, Progress, SimpleGrid,
  Checkbox, Link, Divider, Icon, Avatar, Spinner, Alert, AlertIcon
} from '@chakra-ui/react'
import { CheckCircleIcon, TimeIcon, WarningIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const CATEGORY_COLORS = {
  documentation: 'blue',
  setup: 'purple',
  training: 'green',
  compliance: 'orange',
  other: 'gray'
}

const PRIORITY_COLORS = {
  high: 'red',
  medium: 'orange',
  low: 'green'
}

export default function OnboardingCenter() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadOnboardingTasks()
  }, [])

  const loadOnboardingTasks = async () => {
    try {
      setLoading(true)
      // Get current user
      const userRes = await api.get('/auth/me')
      setCurrentUser(userRes.data)
      
      // Get onboarding tasks
      const tasksRes = await api.get(`/hiring/onboarding/${userRes.data.id}`)
      setTasks(tasksRes.data)
    } catch (e) {
      toast({ title: 'Failed to load onboarding tasks', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTask = async (task) => {
    try {
      await api.patch(`/hiring/onboarding/${task.id}`, {
        is_completed: !task.is_completed
      })
      
      toast({
        title: task.is_completed ? 'Task marked as incomplete' : 'Task completed! 🎉',
        status: 'success'
      })
      
      loadOnboardingTasks()
    } catch (e) {
      toast({ title: 'Failed to update task', status: 'error' })
    }
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="xl" />
        </Flex>
      </Container>
    )
  }

  const completedTasks = tasks.filter(t => t.is_completed).length
  const totalTasks = tasks.length
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(task)
    return acc
  }, {})

  // Overdue tasks
  const overdueTasks = tasks.filter(t => 
    !t.is_completed && t.due_date && new Date(t.due_date) < new Date()
  )

  return (
    <Container maxW="7xl" py={8}>
      {/* Header */}
      <VStack align="start" spacing={1} mb={6}>
        <Heading size="lg">Welcome to the Team! 🎉</Heading>
        <Text color="gray.600">
          Complete these onboarding tasks to get started
        </Text>
      </VStack>

      {/* Progress Card */}
      <Card mb={6} shadow="lg" bg="blue.50" borderColor="blue.200" borderWidth="1px">
        <CardBody>
          <Flex justify="space-between" align="center" mb={3}>
            <VStack align="start" spacing={0}>
              <Heading size="md">Onboarding Progress</Heading>
              <Text fontSize="sm" color="gray.600">
                {completedTasks} of {totalTasks} tasks completed
              </Text>
            </VStack>
            <Text fontSize="3xl" fontWeight="bold" color="blue.600">
              {progressPercent.toFixed(0)}%
            </Text>
          </Flex>
          <Progress
            value={progressPercent}
            colorScheme="blue"
            size="lg"
            borderRadius="full"
          />
        </CardBody>
      </Card>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <Alert status="warning" mb={6} borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">
              You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
            </Text>
            <Text fontSize="sm">
              Please complete these as soon as possible
            </Text>
          </Box>
        </Alert>
      )}

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <HStack>
              <Icon as={CheckCircleIcon} color="green.500" boxSize={6} />
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.600">Completed</Text>
                <Text fontSize="2xl" fontWeight="bold">{completedTasks}</Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <HStack>
              <Icon as={TimeIcon} color="blue.500" boxSize={6} />
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.600">In Progress</Text>
                <Text fontSize="2xl" fontWeight="bold">{totalTasks - completedTasks}</Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <HStack>
              <Icon as={WarningIcon} color="orange.500" boxSize={6} />
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.600">Overdue</Text>
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                  {overdueTasks.length}
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <HStack>
              <Avatar name={currentUser?.full_name} size="sm" />
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.600">Welcome</Text>
                <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                  {currentUser?.full_name}
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Tasks by Category */}
      {Object.keys(tasksByCategory).map(category => {
        const categoryTasks = tasksByCategory[category]
        const completed = categoryTasks.filter(t => t.is_completed).length
        
        return (
          <Card key={category} mb={6} shadow="md">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <HStack>
                  <Badge colorScheme={CATEGORY_COLORS[category] || 'gray'} fontSize="md" px={3} py={1}>
                    {category.toUpperCase()}
                  </Badge>
                  <Text color="gray.600" fontSize="sm">
                    {completed}/{categoryTasks.length} completed
                  </Text>
                </HStack>
                <Progress
                  value={(completed / categoryTasks.length) * 100}
                  colorScheme={CATEGORY_COLORS[category] || 'gray'}
                  size="sm"
                  w="200px"
                  borderRadius="full"
                />
              </Flex>

              <VStack spacing={3} align="stretch">
                {categoryTasks.sort((a, b) => a.order - b.order).map(task => {
                  const isOverdue = !task.is_completed && task.due_date && new Date(task.due_date) < new Date()
                  
                  return (
                    <Card
                      key={task.id}
                      bg={task.is_completed ? 'green.50' : 'white'}
                      borderColor={isOverdue ? 'red.300' : task.is_completed ? 'green.300' : 'gray.200'}
                      borderWidth="2px"
                      opacity={task.is_completed ? 0.7 : 1}
                    >
                      <CardBody py={4}>
                        <Flex justify="space-between" align="start">
                          <HStack align="start" flex={1}>
                            <Checkbox
                              isChecked={task.is_completed}
                              onChange={() => handleToggleTask(task)}
                              size="lg"
                              colorScheme="green"
                              mt={1}
                            />
                            <VStack align="start" spacing={2} flex={1}>
                              <HStack>
                                <Text
                                  fontWeight="bold"
                                  textDecoration={task.is_completed ? 'line-through' : 'none'}
                                >
                                  {task.title}
                                </Text>
                                <Badge colorScheme={PRIORITY_COLORS[task.priority]}>
                                  {task.priority}
                                </Badge>
                                {isOverdue && (
                                  <Badge colorScheme="red">OVERDUE</Badge>
                                )}
                              </HStack>
                              
                              {task.description && (
                                <Text fontSize="sm" color="gray.600">
                                  {task.description}
                                </Text>
                              )}

                              {task.instructions && (
                                <Box
                                  bg="blue.50"
                                  p={3}
                                  rounded="md"
                                  w="full"
                                  borderLeft="4px"
                                  borderColor="blue.400"
                                >
                                  <Text fontSize="sm" fontWeight="bold" mb={1}>
                                    Instructions:
                                  </Text>
                                  <Text fontSize="sm" whiteSpace="pre-wrap">
                                    {task.instructions}
                                  </Text>
                                </Box>
                              )}

                              {task.resources && task.resources.length > 0 && (
                                <Box>
                                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                                    Resources:
                                  </Text>
                                  <VStack align="start" spacing={1}>
                                    {task.resources.map((resource, i) => (
                                      <Link
                                        key={i}
                                        href={resource}
                                        isExternal
                                        fontSize="sm"
                                        color="blue.600"
                                      >
                                        <HStack spacing={1}>
                                          <ExternalLinkIcon />
                                          <Text>{resource}</Text>
                                        </HStack>
                                      </Link>
                                    ))}
                                  </VStack>
                                </Box>
                              )}

                              {task.due_date && (
                                <HStack fontSize="xs" color={isOverdue ? 'red.600' : 'gray.600'}>
                                  <TimeIcon />
                                  <Text fontWeight={isOverdue ? 'bold' : 'normal'}>
                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                  </Text>
                                </HStack>
                              )}

                              {task.completed_at && (
                                <HStack fontSize="xs" color="green.600">
                                  <CheckCircleIcon />
                                  <Text>
                                    Completed: {new Date(task.completed_at).toLocaleDateString()}
                                  </Text>
                                </HStack>
                              )}
                            </VStack>
                          </HStack>
                        </Flex>
                      </CardBody>
                    </Card>
                  )
                })}
              </VStack>
            </CardBody>
          </Card>
        )
      })}

      {tasks.length === 0 && (
        <Card>
          <CardBody>
            <VStack spacing={4} py={8}>
              <Icon as={CheckCircleIcon} boxSize={16} color="green.500" />
              <Heading size="md">All Set!</Heading>
              <Text color="gray.600" textAlign="center">
                You don't have any onboarding tasks yet. <br />
                Check back later or contact your manager.
              </Text>
              <Button colorScheme="blue" onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}
    </Container>
  )
}
