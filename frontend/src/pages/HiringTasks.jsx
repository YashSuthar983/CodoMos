import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, useToast, Button, Card, CardBody, Text,
  VStack, HStack, Flex, Badge, SimpleGrid, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, FormControl, FormLabel, Input, Textarea, Select,
  IconButton, Table, Thead, Tbody, Tr, Th, Td, Switch
} from '@chakra-ui/react'
import { AddIcon, EditIcon, DeleteIcon, ArrowBackIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const TASK_TYPES = [
  { key: 'coding_challenge', label: 'Coding Challenge' },
  { key: 'take_home_project', label: 'Take Home Project' },
  { key: 'written_assessment', label: 'Written Assessment' },
  { key: 'portfolio_review', label: 'Portfolio Review' },
  { key: 'video_introduction', label: 'Video Introduction' },
  { key: 'custom', label: 'Custom' }
]

const RECOMMENDED_STAGES = [
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'technical_assessment', label: 'Technical Assessment' }
]

export default function HiringTasks() {
  const [tasks, setTasks] = useState([])
  const [jobPostings, setJobPostings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState(null)
  const toast = useToast()
  const navigate = useNavigate()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'coding_challenge',
    instructions: '',
    requirements: '',
    submission_format: '',
    reference_links: '',
    evaluation_criteria: '',
    max_score: '100',
    passing_score: '60',
    estimated_duration: '',
    deadline_days: '7',
    recommended_stage: '',
    is_required: false,
    auto_assign: false,
    auto_assign_stages: [],
    job_posting_id: ''
  })

  useEffect(() => {
    loadTasks()
    loadJobPostings()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const res = await api.get('/hiring/tasks/templates')
      setTasks(res.data)
    } catch (e) {
      toast({ title: 'Failed to load tasks', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadJobPostings = async () => {
    try {
      const res = await api.get('/hiring/jobs')
      setJobPostings(res.data)
    } catch (e) {
      console.error('Failed to load job postings:', e)
    }
  }

  const openAddTask = () => {
    setEditingTask(null)
    setFormData({
      title: '',
      description: '',
      task_type: 'coding_challenge',
      instructions: '',
      requirements: '',
      submission_format: '',
      reference_links: '',
      evaluation_criteria: '',
      max_score: '100',
      passing_score: '60',
      estimated_duration: '',
      deadline_days: '7',
      recommended_stage: '',
      is_required: false,
      auto_assign: false,
      auto_assign_stages: [],
      job_posting_id: ''
    })
    onOpen()
  }

  const openEditTask = (task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      instructions: task.instructions || '',
      requirements: task.requirements.join(', '),
      submission_format: task.submission_format || '',
      reference_links: task.reference_links.join(', '),
      evaluation_criteria: task.evaluation_criteria.join(', '),
      max_score: task.max_score.toString(),
      passing_score: task.passing_score.toString(),
      estimated_duration: task.estimated_duration?.toString() || '',
      deadline_days: task.deadline_days?.toString() || '',
      recommended_stage: task.recommended_stage || '',
      is_required: task.is_required,
      auto_assign: task.auto_assign || false,
      auto_assign_stages: task.auto_assign_stages || [],
      job_posting_id: task.job_posting_id || ''
    })
    onOpen()
  }

  const handleSaveTask = async () => {
    try {
      if (!formData.title || !formData.description) {
        toast({ title: 'Title and description are required', status: 'warning' })
        return
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        task_type: formData.task_type,
        instructions: formData.instructions || null,
        requirements: formData.requirements
          ? formData.requirements.split(',').map(r => r.trim()).filter(r => r)
          : [],
        submission_format: formData.submission_format || null,
        reference_links: formData.reference_links
          ? formData.reference_links.split(',').map(l => l.trim()).filter(l => l)
          : [],
        evaluation_criteria: formData.evaluation_criteria
          ? formData.evaluation_criteria.split(',').map(c => c.trim()).filter(c => c)
          : [],
        max_score: parseFloat(formData.max_score),
        passing_score: parseFloat(formData.passing_score),
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
        deadline_days: formData.deadline_days ? parseInt(formData.deadline_days) : null,
        recommended_stage: formData.recommended_stage || null,
        is_required: formData.is_required,
        auto_assign: formData.auto_assign,
        auto_assign_stages: formData.auto_assign_stages,
        job_posting_id: formData.job_posting_id || null
      }

      if (editingTask) {
        await api.patch(`/hiring/tasks/templates/${editingTask.id}`, payload)
        toast({ title: 'Task updated successfully', status: 'success' })
      } else {
        await api.post('/hiring/tasks/templates', payload)
        toast({ title: 'Task created successfully', status: 'success' })
      }

      onClose()
      loadTasks()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to save task'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task template?')) {
      return
    }

    try {
      await api.delete(`/hiring/tasks/templates/${taskId}`)
      toast({ title: 'Task deleted successfully', status: 'success' })
      loadTasks()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to delete task'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const handleToggleActive = async (task) => {
    try {
      await api.patch(`/hiring/tasks/templates/${task.id}`, {
        is_active: !task.is_active
      })
      toast({
        title: task.is_active ? 'Task deactivated' : 'Task activated',
        status: 'success'
      })
      loadTasks()
    } catch (e) {
      toast({ title: 'Failed to update task', status: 'error' })
    }
  }

  return (
    <Container maxW="7xl" py={8}>
      {/* Back Button */}
      <Button 
        leftIcon={<ArrowBackIcon />} 
        variant="ghost" 
        colorScheme="cyan"
        mb={4}
        onClick={() => navigate('/hiring')}
      >
        Back to Hiring Dashboard
      </Button>

      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="xl" bgGradient="linear(to-r, cyan.600, blue.700)" bgClip="text">
            📋 Hiring Task Templates
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Create reusable task templates to assign to candidates automatically or manually
          </Text>
        </VStack>
        <Button 
          leftIcon={<AddIcon />} 
          bgGradient="linear(to-r, cyan.400, blue.500)"
          color="white"
          _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)' }}
          shadow="md"
          onClick={openAddTask}
        >
          Create Task Template
        </Button>
      </Flex>

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
        <Card 
          borderWidth="2px" 
          borderColor="cyan.100"
          _hover={{ borderColor: 'cyan.300', shadow: 'lg', transform: 'translateY(-2px)' }}
          transition="all 0.3s"
        >
          <CardBody>
            <Text fontSize="sm" color="gray.600" fontWeight="semibold">Total Templates</Text>
            <Text fontSize="3xl" fontWeight="bold" color="cyan.600">{tasks.length}</Text>
          </CardBody>
        </Card>
        <Card 
          borderWidth="2px" 
          borderColor="green.100"
          _hover={{ borderColor: 'green.300', shadow: 'lg', transform: 'translateY(-2px)' }}
          transition="all 0.3s"
        >
          <CardBody>
            <Text fontSize="sm" color="gray.600" fontWeight="semibold">Active Templates</Text>
            <Text fontSize="3xl" fontWeight="bold" color="green.500">
              {tasks.filter(t => t.is_active).length}
            </Text>
          </CardBody>
        </Card>
        <Card 
          borderWidth="2px" 
          borderColor="orange.100"
          _hover={{ borderColor: 'orange.300', shadow: 'lg', transform: 'translateY(-2px)' }}
          transition="all 0.3s"
        >
          <CardBody>
            <Text fontSize="sm" color="gray.600" fontWeight="semibold">Required Tasks</Text>
            <Text fontSize="3xl" fontWeight="bold" color="orange.500">
              {tasks.filter(t => t.is_required).length}
            </Text>
          </CardBody>
        </Card>
        <Card 
          bg="purple.50" 
          borderColor="purple.200" 
          borderWidth="2px"
          _hover={{ borderColor: 'purple.400', shadow: 'lg', transform: 'translateY(-2px)' }}
          transition="all 0.3s"
        >
          <CardBody>
            <Text fontSize="sm" color="gray.600" fontWeight="semibold">🤖 Auto-Assign Tasks</Text>
            <Text fontSize="3xl" fontWeight="bold" color="purple.600">
              {tasks.filter(t => t.auto_assign).length}
            </Text>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Tasks Grid */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {tasks.map(task => (
          <Card key={task.id} shadow="md">
            <CardBody>
              <Flex justify="space-between" align="start" mb={3}>
                <VStack align="start" spacing={1} flex={1}>
                  <HStack>
                    <Heading size="sm">{task.title}</Heading>
                    <Badge
                      colorScheme={task.is_active ? 'green' : 'gray'}
                    >
                      {task.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {task.is_required && (
                      <Badge colorScheme="orange">Required</Badge>
                    )}
                    {task.auto_assign && (
                      <Badge colorScheme="purple">🤖 Auto-Assign</Badge>
                    )}
                    {task.job_posting_id && (
                      <Badge colorScheme="blue">
                        🏯 {jobPostings.find(j => j.id === task.job_posting_id)?.title || 'Specific Job'}
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {task.description}
                  </Text>
                </VStack>
                <HStack>
                  <IconButton
                    icon={<EditIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditTask(task)}
                    aria-label="Edit task"
                  />
                  <IconButton
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label="Delete task"
                  />
                </HStack>
              </Flex>

              <VStack align="stretch" spacing={2}>
                <HStack spacing={2}>
                  <Badge colorScheme="blue">
                    {TASK_TYPES.find(t => t.key === task.task_type)?.label || task.task_type}
                  </Badge>
                  {task.recommended_stage && (
                    <Badge colorScheme="purple">
                      Stage: {task.recommended_stage}
                    </Badge>
                  )}
                  {task.estimated_duration && (
                    <Badge colorScheme="cyan">{task.estimated_duration}h</Badge>
                  )}
                </HStack>
                {task.auto_assign && task.auto_assign_stages && task.auto_assign_stages.length > 0 && (
                  <HStack mt={2} flexWrap="wrap">
                    <Text fontSize="xs" color="purple.600" fontWeight="bold">Auto-assign at:</Text>
                    {task.auto_assign_stages.map(stage => (
                      <Badge key={stage} size="sm" colorScheme="purple" fontSize="xs">
                        {stage.replace('_', ' ')}
                      </Badge>
                    ))}
                  </HStack>
                )}

                <HStack justify="space-between" fontSize="sm">
                  <Text color="gray.600">
                    Passing: {task.passing_score}/{task.max_score}
                  </Text>
                  <HStack>
                    <Text color="gray.600">Active:</Text>
                    <Switch
                      isChecked={task.is_active}
                      onChange={() => handleToggleActive(task)}
                      colorScheme="green"
                    />
                  </HStack>
                </HStack>

                {task.requirements.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.700">
                      Requirements:
                    </Text>
                    <VStack align="start" spacing={0}>
                      {task.requirements.slice(0, 3).map((req, i) => (
                        <Text key={i} fontSize="xs" color="gray.600">
                          • {req}
                        </Text>
                      ))}
                      {task.requirements.length > 3 && (
                        <Text fontSize="xs" color="gray.500">
                          +{task.requirements.length - 3} more
                        </Text>
                      )}
                    </VStack>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}

        {tasks.length === 0 && !loading && (
          <Card gridColumn="span 2">
            <CardBody>
              <Text textAlign="center" color="gray.500" py={8}>
                No task templates found. Click "Create Task Template" to get started.
              </Text>
            </CardBody>
          </Card>
        )}
      </SimpleGrid>

      {/* Create/Edit Task Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingTask ? 'Edit Task Template' : 'Create Task Template'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Build a REST API"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the task..."
                  rows={3}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Task Type</FormLabel>
                <Select
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                >
                  {TASK_TYPES.map(type => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </Select>
              </FormControl>

              {/* Job Posting Selection */}
              <Box w="100%" p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                <FormControl>
                  <VStack align="start" spacing={2}>
                    <FormLabel fontWeight="bold" color="blue.700" mb={0}>
                      🏯 Job-Specific Task (Optional)
                    </FormLabel>
                    <Text fontSize="xs" color="gray.600" mb={2}>
                      Leave empty for tasks that apply to ALL positions, or select a specific job posting
                    </Text>
                    <Select
                      value={formData.job_posting_id}
                      onChange={(e) => setFormData({ ...formData, job_posting_id: e.target.value })}
                      bg="white"
                      placeholder="All Positions (Global Task)"
                    >
                      {jobPostings.map(job => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.department || 'No Dept'} ({job.status})
                        </option>
                      ))}
                    </Select>
                    {formData.job_posting_id && (
                      <Text fontSize="xs" color="blue.600" fontWeight="bold">
                        ✅ This task will ONLY be assigned to candidates for the selected job
                      </Text>
                    )}
                    {!formData.job_posting_id && (
                      <Text fontSize="xs" color="gray.500">
                        🌐 This task will be available for ALL job positions
                      </Text>
                    )}
                  </VStack>
                </FormControl>
              </Box>

              <FormControl>
                <FormLabel>Instructions</FormLabel>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Detailed instructions for the candidate..."
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Requirements (comma-separated)</FormLabel>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Use Python 3.9+, Include unit tests, etc."
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Submission Format</FormLabel>
                <Input
                  value={formData.submission_format}
                  onChange={(e) => setFormData({ ...formData, submission_format: e.target.value })}
                  placeholder="GitHub repository, PDF document, Video link, etc."
                />
              </FormControl>

              <FormControl>
                <FormLabel>Reference Links (comma-separated URLs)</FormLabel>
                <Textarea
                  value={formData.reference_links}
                  onChange={(e) => setFormData({ ...formData, reference_links: e.target.value })}
                  placeholder="https://docs.example.com, https://api-spec.com"
                  rows={2}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Evaluation Criteria (comma-separated)</FormLabel>
                <Textarea
                  value={formData.evaluation_criteria}
                  onChange={(e) => setFormData({ ...formData, evaluation_criteria: e.target.value })}
                  placeholder="Code quality, Test coverage, Documentation, Performance"
                  rows={2}
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Max Score</FormLabel>
                  <Input
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Passing Score</FormLabel>
                  <Input
                    type="number"
                    value={formData.passing_score}
                    onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Est. Duration (hours)</FormLabel>
                  <Input
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="4"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Deadline (days)</FormLabel>
                  <Input
                    type="number"
                    value={formData.deadline_days}
                    onChange={(e) => setFormData({ ...formData, deadline_days: e.target.value })}
                    placeholder="7"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Recommended Stage</FormLabel>
                <Select
                  value={formData.recommended_stage}
                  onChange={(e) => setFormData({ ...formData, recommended_stage: e.target.value })}
                  placeholder="Select stage..."
                >
                  {RECOMMENDED_STAGES.map(stage => (
                    <option key={stage.key} value={stage.key}>{stage.label}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Is Required Task?</FormLabel>
                <Switch
                  isChecked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  colorScheme="orange"
                />
              </FormControl>

              {/* Auto-Assignment Section */}
              <Box w="100%" p={4} bg="purple.50" borderRadius="md" borderWidth="2px" borderColor="purple.200">
                <VStack spacing={3} align="stretch">
                  <FormControl display="flex" alignItems="center">
                    <VStack align="start" spacing={0} flex="1">
                      <FormLabel mb="0" fontWeight="bold" color="purple.700">🤖 Auto-Assign to Candidates</FormLabel>
                      <Text fontSize="xs" color="gray.600">Automatically assign this task when candidates reach specific stages</Text>
                    </VStack>
                    <Switch
                      isChecked={formData.auto_assign}
                      onChange={(e) => setFormData({ ...formData, auto_assign: e.target.checked })}
                      colorScheme="purple"
                      size="lg"
                    />
                  </FormControl>

                  {formData.auto_assign && (
                    <FormControl>
                      <FormLabel fontSize="sm">Auto-Assign at Stages (select multiple)</FormLabel>
                      <VStack spacing={2} align="stretch">
                        {[
                          { key: 'applied', label: 'Applied', color: 'gray' },
                          { key: 'screening', label: 'Screening', color: 'blue' },
                          { key: 'interview', label: 'Interview', color: 'purple' },
                          { key: 'technical_assessment', label: 'Technical Assessment', color: 'orange' },
                          { key: 'offer', label: 'Offer', color: 'green' }
                        ].map(stage => (
                          <Box
                            key={stage.key}
                            p={2}
                            borderWidth="1px"
                            borderRadius="md"
                            cursor="pointer"
                            bg={formData.auto_assign_stages.includes(stage.key) ? `${stage.color}.100` : 'white'}
                            borderColor={formData.auto_assign_stages.includes(stage.key) ? `${stage.color}.400` : 'gray.200'}
                            onClick={() => {
                              const stages = formData.auto_assign_stages.includes(stage.key)
                                ? formData.auto_assign_stages.filter(s => s !== stage.key)
                                : [...formData.auto_assign_stages, stage.key]
                              setFormData({ ...formData, auto_assign_stages: stages })
                            }}
                            _hover={{ borderColor: `${stage.color}.400` }}
                          >
                            <HStack>
                              <Box
                                w="20px"
                                h="20px"
                                borderRadius="md"
                                borderWidth="2px"
                                borderColor={formData.auto_assign_stages.includes(stage.key) ? `${stage.color}.500` : 'gray.300'}
                                bg={formData.auto_assign_stages.includes(stage.key) ? `${stage.color}.500` : 'white'}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                color="white"
                                fontSize="xs"
                              >
                                {formData.auto_assign_stages.includes(stage.key) && '✓'}
                              </Box>
                              <Badge colorScheme={stage.color}>{stage.label}</Badge>
                            </HStack>
                          </Box>
                        ))}
                      </VStack>
                      <Text fontSize="xs" color="gray.500" mt={2}>
                        Selected: {formData.auto_assign_stages.length} stage(s)
                      </Text>
                    </FormControl>
                  )}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveTask}>
              {editingTask ? 'Update' : 'Create'} Template
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}
