import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Button, Stack, Grid, Card, CardBody, CardHeader,
  Text, Badge, useToast, Flex, HStack, VStack, Icon, Select, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, useDisclosure, FormControl, FormLabel, Input,
  Progress, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  IconButton, Avatar, Table, Thead, Tbody, Tr, Th, Td
} from '@chakra-ui/react';
import { FaPlus, FaEye, FaEdit, FaBullseye, FaCheckCircle, FaExclamationTriangle, FaClock, FaTrophy } from 'react-icons/fa';
import api from '../api/client';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const toast = useToast();

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState('okr');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, statsRes, usersRes] = await Promise.all([
        api.get('/performance/goals/'),
        api.get('/performance/goals/stats'),
        api.get('/users/')
      ]);
      setGoals(goalsRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      toast({
        title: 'Error loading data',
        description: err.response?.data?.detail,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      // Convert date strings to ISO datetime format
      const startDateTime = startDate ? new Date(startDate + 'T00:00:00').toISOString() : null;
      const dueDateTime = dueDate ? new Date(dueDate + 'T23:59:59').toISOString() : null;
      
      await api.post('/performance/goals/', {
        employee_id: employeeId,
        title,
        description,
        goal_type: goalType,
        start_date: startDateTime,
        due_date: dueDateTime,
        target_value: targetValue ? parseFloat(targetValue) : null,
        unit: unit || null
      });
      toast({
        title: 'Goal created successfully',
        status: 'success',
        duration: 3000
      });
      onClose();
      fetchData();
      resetForm();
    } catch (err) {
      toast({
        title: 'Error creating goal',
        description: err.response?.data?.detail,
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleUpdateGoalProgress = async (goalId, progress, status) => {
    try {
      await api.patch(`/performance/goals/${goalId}`, {
        progress_percentage: progress,
        status
      });
      toast({
        title: 'Goal updated',
        status: 'success',
        duration: 3000
      });
      fetchData();
    } catch (err) {
      toast({
        title: 'Error updating goal',
        description: err.response?.data?.detail,
        status: 'error',
        duration: 3000
      });
    }
  };

  const resetForm = () => {
    setEmployeeId('');
    setTitle('');
    setDescription('');
    setGoalType('okr');
    setStartDate('');
    setDueDate('');
    setTargetValue('');
    setUnit('');
  };

  const openViewGoal = (goal) => {
    setSelectedGoal(goal);
    onViewOpen();
  };

  const getStatusColor = (status) => {
    const colors = {
      not_started: 'gray',
      in_progress: 'blue',
      at_risk: 'red',
      completed: 'green',
      cancelled: 'gray'
    };
    return colors[status] || 'gray';
  };

  const getStatusIcon = (status) => {
    const icons = {
      not_started: FaClock,
      in_progress: FaClock,
      at_risk: FaExclamationTriangle,
      completed: FaCheckCircle,
      cancelled: FaClock
    };
    return icons[status] || FaClock;
  };

  const getGoalTypeLabel = (type) => {
    const labels = {
      okr: 'OKR',
      kpi: 'KPI',
      personal: 'Personal',
      team: 'Team',
      company: 'Company'
    };
    return labels[type] || type;
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId || u._id === userId);
    return user?.full_name || 'Unknown';
  };

  if (loading) {
    return (
      <Container maxW="1400px" py={8}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="1400px" py={8}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={8}>
        <VStack align="flex-start" spacing={1}>
          <Heading size="xl">🎯 Goals & OKRs</Heading>
          <Text color="gray.600">Track objectives and key results</Text>
        </VStack>
        <Button
          leftIcon={<FaPlus />}
          colorScheme="purple"
          onClick={onOpen}
        >
          New Goal
        </Button>
      </Flex>

      {/* Stats Cards */}
      {stats && (
        <SimpleGrid columns={{ base: 1, md: 5 }} spacing={6} mb={8}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Goals</StatLabel>
                <StatNumber>{stats.total_goals}</StatNumber>
                <StatHelpText>All time</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Completed</StatLabel>
                <StatNumber color="green.500">{stats.completed}</StatNumber>
                <StatHelpText>
                  <Icon as={FaCheckCircle} color="green.500" mr={1} />
                  Achieved
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>In Progress</StatLabel>
                <StatNumber color="blue.500">{stats.in_progress}</StatNumber>
                <StatHelpText>
                  <Icon as={FaClock} color="blue.500" mr={1} />
                  Active
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>At Risk</StatLabel>
                <StatNumber color="red.500">{stats.at_risk}</StatNumber>
                <StatHelpText>
                  <Icon as={FaExclamationTriangle} color="red.500" mr={1} />
                  Needs attention
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Completion Rate</StatLabel>
                <StatNumber color="purple.500">{stats.completion_rate}%</StatNumber>
                <StatHelpText>
                  <Icon as={FaTrophy} color="purple.500" mr={1} />
                  Success rate
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Goals Grid */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
        {goals.map((goal) => (
          <Card
            key={goal._id}
            borderWidth="2px"
            borderColor={getStatusColor(goal.status) + '.200'}
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardHeader pb={2}>
              <Flex justify="space-between" align="flex-start">
                <VStack align="flex-start" spacing={2} flex={1}>
                  <HStack>
                    <Badge colorScheme={getStatusColor(goal.status)}>
                      {goal.status.replace('_', ' ')}
                    </Badge>
                    <Badge colorScheme="purple">{getGoalTypeLabel(goal.goal_type)}</Badge>
                  </HStack>
                  <Heading size="md">{goal.title}</Heading>
                </VStack>
                <IconButton
                  icon={<FaEye />}
                  size="sm"
                  variant="ghost"
                  colorScheme="purple"
                  onClick={() => openViewGoal(goal)}
                />
              </Flex>
            </CardHeader>
            <CardBody pt={0}>
              <Stack spacing={4}>
                <Text fontSize="sm" color="gray.600" noOfLines={2}>
                  {goal.description}
                </Text>

                <HStack>
                  <Avatar size="xs" name={getUserName(goal.employee_id)} />
                  <Text fontSize="sm" color="gray.600">
                    {getUserName(goal.employee_id)}
                  </Text>
                </HStack>

                <Box>
                  <Flex justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">Progress</Text>
                    <Text fontSize="sm" fontWeight="bold" color="purple.500">
                      {goal.progress_percentage}%
                    </Text>
                  </Flex>
                  <Progress
                    value={goal.progress_percentage}
                    colorScheme={getStatusColor(goal.status)}
                    borderRadius="full"
                    size="sm"
                  />
                </Box>

                <Flex justify="space-between" fontSize="sm" color="gray.600">
                  <Text>
                    Due: {new Date(goal.due_date).toLocaleDateString()}
                  </Text>
                  <Icon as={getStatusIcon(goal.status)} />
                </Flex>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </Grid>

      {goals.length === 0 && (
        <Card>
          <CardBody textAlign="center" py={12}>
            <Icon as={FaBullseye} boxSize={12} color="gray.300" mb={4} />
            <Text color="gray.500">No goals yet. Create your first goal to get started!</Text>
          </CardBody>
        </Card>
      )}

      {/* Create Goal Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Goal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Employee</FormLabel>
                <Select
                  placeholder="Select employee"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Goal Type</FormLabel>
                <Select value={goalType} onChange={(e) => setGoalType(e.target.value)}>
                  <option value="okr">OKR (Objective & Key Results)</option>
                  <option value="kpi">KPI (Key Performance Indicator)</option>
                  <option value="personal">Personal Goal</option>
                  <option value="team">Team Goal</option>
                  <option value="company">Company Goal</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  placeholder="e.g., Increase customer satisfaction"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Describe the goal and expected outcomes..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormControl>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl isRequired>
                  <FormLabel>Start Date</FormLabel>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Due Date</FormLabel>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </FormControl>
              </Grid>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Target Value (Optional)</FormLabel>
                  <Input
                    type="number"
                    placeholder="100"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Unit (Optional)</FormLabel>
                  <Input
                    placeholder="e.g., %, count, days"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </FormControl>
              </Grid>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateGoal}>
              Create Goal
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Goal Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedGoal && (
              <VStack align="flex-start" spacing={2}>
                <Text>{selectedGoal.title}</Text>
                <HStack>
                  <Badge colorScheme={getStatusColor(selectedGoal.status)}>
                    {selectedGoal.status.replace('_', ' ')}
                  </Badge>
                  <Badge colorScheme="purple">
                    {getGoalTypeLabel(selectedGoal.goal_type)}
                  </Badge>
                </HStack>
              </VStack>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedGoal && (
              <Stack spacing={6}>
                <Box>
                  <Text fontWeight="bold" mb={2}>Description</Text>
                  <Text color="gray.600">{selectedGoal.description}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>Owner</Text>
                  <HStack>
                    <Avatar size="sm" name={getUserName(selectedGoal.employee_id)} />
                    <Text>{getUserName(selectedGoal.employee_id)}</Text>
                  </HStack>
                </Box>

                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" mb={1}>Start Date</Text>
                    <Text color="gray.600">{new Date(selectedGoal.start_date).toLocaleDateString()}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" mb={1}>Due Date</Text>
                    <Text color="gray.600">{new Date(selectedGoal.due_date).toLocaleDateString()}</Text>
                  </Box>
                </SimpleGrid>

                <Box>
                  <Flex justify="space-between" mb={3}>
                    <Text fontWeight="bold">Progress</Text>
                    <Text fontWeight="bold" color="purple.500">
                      {selectedGoal.progress_percentage}%
                    </Text>
                  </Flex>
                  <Progress
                    value={selectedGoal.progress_percentage}
                    colorScheme={getStatusColor(selectedGoal.status)}
                    borderRadius="full"
                    size="lg"
                  />
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={3}>Update Status</Text>
                  <SimpleGrid columns={3} spacing={3}>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant={selectedGoal.status === 'in_progress' ? 'solid' : 'outline'}
                      onClick={() => handleUpdateGoalProgress(selectedGoal._id, selectedGoal.progress_percentage, 'in_progress')}
                    >
                      In Progress
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant={selectedGoal.status === 'at_risk' ? 'solid' : 'outline'}
                      onClick={() => handleUpdateGoalProgress(selectedGoal._id, selectedGoal.progress_percentage, 'at_risk')}
                    >
                      At Risk
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="green"
                      variant={selectedGoal.status === 'completed' ? 'solid' : 'outline'}
                      onClick={() => handleUpdateGoalProgress(selectedGoal._id, 100, 'completed')}
                    >
                      Completed
                    </Button>
                  </SimpleGrid>
                </Box>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onViewClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
