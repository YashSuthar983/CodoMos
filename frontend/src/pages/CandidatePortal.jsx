import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, useToast, Card, CardBody, Text,
  VStack, HStack, Flex, Badge, SimpleGrid, Progress, Divider,
  Button, Spinner, Icon, Table, Thead, Tbody, Tr, Th, Td,
  Textarea, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Alert, AlertIcon, AlertTitle, AlertDescription, Input
} from '@chakra-ui/react'
import { FaUser, FaEnvelope, FaPhone, FaBriefcase, FaCheckCircle, FaClock, FaFileAlt } from 'react-icons/fa'
import api from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function CandidatePortal() {
  const [candidate, setCandidate] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [submissionText, setSubmissionText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const resumeModal = useDisclosure()

  useEffect(() => {
    loadCandidateData()
  }, [])

  const loadCandidateData = async () => {
    try {
      setLoading(true)
      // Get current user
      const userRes = await api.get('/auth/me')
      console.log('✅ User authenticated - Full data:', userRes.data)
      console.log('✅ Candidate ID check:', {
        email: userRes.data.email,
        role: userRes.data.role,
        candidate_id: userRes.data.candidate_id,
        has_candidate_id: !!userRes.data.candidate_id,
        typeof_candidate_id: typeof userRes.data.candidate_id
      })
      setCurrentUser(userRes.data)

      if (userRes.data.role !== 'candidate' || !userRes.data.candidate_id) {
        console.log('❌ Access denied - User info:', {
          email: userRes.data.email,
          role: userRes.data.role,
          candidate_id: userRes.data.candidate_id,
          reason: userRes.data.role !== 'candidate' ? 'Not a candidate role' : 'Missing candidate_id'
        })
        toast({
          title: 'Access Denied',
          description: `This portal is for candidates only. You are logged in as: ${userRes.data.email} (${userRes.data.role}). Please log in with your candidate credentials.`,
          status: 'error',
          duration: 8000,
          isClosable: true
        })
        navigate('/dashboard')
        return
      }

      // Get candidate data
      console.log('📡 Fetching candidate data for ID:', userRes.data.candidate_id)
      const candidateRes = await api.get(`/hiring/candidates/${userRes.data.candidate_id}`)
      console.log('✅ Candidate data received:', candidateRes.data)
      
      // candidateRes.data contains { candidate, tasks, interview_notes, stage_history }
      setCandidate(candidateRes.data.candidate || candidateRes.data)

      // Get task submissions
      console.log('📡 Fetching tasks...')
      const tasksRes = await api.get(`/hiring/candidates/${userRes.data.candidate_id}/tasks`)
      console.log('✅ Tasks received:', tasksRes.data)
      setTasks(tasksRes.data || [])
    } catch (e) {
      console.error('❌ Error loading candidate data:', e)
      console.error('❌ Error response:', e?.response?.data)
      toast({
        title: 'Failed to load data',
        description: e?.response?.data?.detail || 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitTask = async () => {
    if (!submissionText.trim()) {
      toast({ title: 'Please provide your submission', status: 'warning' })
      return
    }

    try {
      await api.patch(`/hiring/task-submissions/${selectedTask.id}`, {
        submission_text: submissionText,
        status: 'submitted'
      })
      toast({
        title: 'Task submitted successfully!',
        description: 'Your submission is under review',
        status: 'success'
      })
      onClose()
      setSubmissionText('')
      loadCandidateData()
    } catch (e) {
      toast({
        title: 'Submission failed',
        description: e?.response?.data?.detail || 'Please try again',
        status: 'error'
      })
    }
  }

  const handleResumeUpload = async () => {
    if (!selectedFile) {
      toast({ title: 'Please select a resume file', status: 'warning' })
      return
    }

    const formData = new FormData()
    formData.append('resume_file', selectedFile)

    try {
      setUploadingResume(true)
      const res = await api.post(
        `/hiring/candidates/${candidate.id}/upload-resume`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      toast({
        title: '✨ Resume Uploaded & Analyzed!',
        description: `Your resume has been analyzed. Match Score: ${res.data.overall_score?.toFixed(0)}%`,
        status: 'success',
        duration: 7000,
        isClosable: true
      })

      setSelectedFile(null)
      resumeModal.onClose()
      await loadCandidateData()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to upload resume'
      toast({ title: 'Upload Failed', description: msg, status: 'error', duration: 5000 })
    } finally {
      setUploadingResume(false)
    }
  }

  const getStageColor = (stage) => {
    const colors = {
      applied: 'blue',
      screening: 'cyan',
      interview: 'purple',
      technical_assessment: 'teal',
      offer: 'green',
      hired: 'green',
      rejected: 'red',
      withdrawn: 'gray'
    }
    return colors[stage] || 'gray'
  }

  const getTaskStatusColor = (status) => {
    const colors = {
      pending: 'gray',
      in_progress: 'blue',
      submitted: 'purple',
      passed: 'green',
      failed: 'red'
    }
    return colors[status] || 'gray'
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="xl" color="cyan.500" />
        </Flex>
      </Container>
    )
  }

  if (!candidate) {
    return (
      <Container maxW="7xl" py={8}>
        <Text>No candidate data found</Text>
      </Container>
    )
  }

  return (
    <Box bg="gray.50" minH="100vh" py={8}>
      <Container maxW="7xl">
        {/* Header */}
        <VStack align="start" spacing={2} mb={8}>
          <Heading size="2xl" bgGradient="linear(to-r, cyan.600, blue.700)" bgClip="text">
            Candidate Portal 👋
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Track your application status and complete assigned tasks
          </Text>
        </VStack>

        {/* Application Status Card */}
        <Card borderWidth="2px" borderColor="cyan.100" shadow="lg" mb={6}>
          <CardBody>
            <Heading size="md" mb={4}>Application Status</Heading>
            <Divider mb={4} />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <VStack align="start" spacing={3}>
                <HStack>
                  <Icon as={FaUser} color="cyan.500" />
                  <Text fontWeight="semibold">Full Name:</Text>
                  <Text>{candidate.full_name}</Text>
                </HStack>
                <HStack>
                  <Icon as={FaEnvelope} color="cyan.500" />
                  <Text fontWeight="semibold">Email:</Text>
                  <Text>{candidate.email}</Text>
                </HStack>
                <HStack>
                  <Icon as={FaPhone} color="cyan.500" />
                  <Text fontWeight="semibold">Phone:</Text>
                  <Text>{candidate.phone || 'N/A'}</Text>
                </HStack>
              </VStack>
              <VStack align="start" spacing={3}>
                <HStack>
                  <Icon as={FaBriefcase} color="cyan.500" />
                  <Text fontWeight="semibold">Applied For:</Text>
                  <Text>{candidate.position_applied}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="semibold">Current Stage:</Text>
                  <Badge
                    colorScheme={getStageColor(candidate.current_stage)}
                    px={3}
                    py={1}
                    borderRadius="full"
                    textTransform="capitalize"
                  >
                    {candidate.current_stage?.replace('_', ' ')}
                  </Badge>
                </HStack>
                <HStack>
                  <Text fontWeight="semibold">Application Date:</Text>
                  <Text>{new Date(candidate.applied_date).toLocaleDateString()}</Text>
                </HStack>
              </VStack>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Resume Upload Card */}
        <Card 
          borderWidth="2px" 
          borderColor={candidate.resume_text ? 'green.200' : 'purple.100'} 
          shadow="lg" 
          mb={6}
          bg={candidate.resume_text ? 'green.50' : 'purple.50'}
        >
          <CardBody>
            <Flex justify="space-between" align="center" mb={4}>
              <HStack>
                <Icon as={FaFileAlt} color={candidate.resume_text ? 'green.600' : 'purple.600'} boxSize={5} />
                <Heading size="md">
                  {candidate.resume_text ? '📄 Your Resume' : '📤 Upload Your Resume'}
                </Heading>
              </HStack>
              {candidate.resume_text && candidate.ai_analyzed_at && (
                <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
                  ✨ AI Analyzed
                </Badge>
              )}
            </Flex>
            <Divider mb={4} />
            
            {candidate.resume_text ? (
              <VStack align="stretch" spacing={4}>
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle fontSize="sm">Resume on file</AlertTitle>
                    <AlertDescription fontSize="xs">
                      {candidate.resume_url && `Filename: ${candidate.resume_url.split('_')[1] || 'resume'}`}
                      {candidate.ai_analyzed_at && ` • Analyzed: ${new Date(candidate.ai_analyzed_at).toLocaleDateString()}`}
                    </AlertDescription>
                  </Box>
                </Alert>
                
                {candidate.overall_score > 0 && (
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Box bg="white" p={3} borderRadius="md" borderWidth="1px" borderColor="purple.200">
                      <Text fontSize="xs" color="gray.600" fontWeight="semibold">Match Score</Text>
                      <Heading 
                        size="lg" 
                        color={
                          candidate.overall_score >= 80 ? 'green.600' :
                          candidate.overall_score >= 60 ? 'blue.600' :
                          candidate.overall_score >= 40 ? 'orange.600' : 'red.600'
                        }
                      >
                        {candidate.overall_score.toFixed(0)}%
                      </Heading>
                    </Box>
                    <Box bg="white" p={3} borderRadius="md" borderWidth="1px" borderColor="blue.200">
                      <Text fontSize="xs" color="gray.600" fontWeight="semibold">Technical Skills</Text>
                      <Heading size="lg" color="blue.600">
                        {candidate.technical_score?.toFixed(0) || 'N/A'}%
                      </Heading>
                    </Box>
                    <Box bg="white" p={3} borderRadius="md" borderWidth="1px" borderColor="cyan.200">
                      <Text fontSize="xs" color="gray.600" fontWeight="semibold">AI Confidence</Text>
                      <Badge 
                        colorScheme={
                          candidate.ai_confidence === 'high' ? 'green' :
                          candidate.ai_confidence === 'medium' ? 'yellow' : 'orange'
                        }
                        fontSize="md"
                        px={2}
                        py={1}
                        textTransform="capitalize"
                      >
                        {candidate.ai_confidence || 'Not available'}
                      </Badge>
                    </Box>
                  </SimpleGrid>
                )}
                
                <Button
                  colorScheme="purple"
                  variant="outline"
                  size="sm"
                  onClick={resumeModal.onOpen}
                  leftIcon={<Icon as={FaFileAlt} />}
                >
                  Update Resume
                </Button>
              </VStack>
            ) : (
              <VStack spacing={4}>
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle fontSize="sm">No resume on file</AlertTitle>
                    <AlertDescription fontSize="xs">
                      Upload your resume to get an AI-powered match score and improve your chances!
                    </AlertDescription>
                  </Box>
                </Alert>
                <Button
                  bgGradient="linear(to-r, purple.400, pink.500)"
                  color="white"
                  _hover={{ bgGradient: 'linear(to-r, purple.500, pink.600)' }}
                  size="md"
                  onClick={resumeModal.onOpen}
                  leftIcon={<Icon as={FaFileAlt} />}
                  width="full"
                >
                  Upload Resume & Get AI Analysis
                </Button>
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
          <Card borderWidth="2px" borderColor="cyan.100" _hover={{ borderColor: 'cyan.300', shadow: 'lg' }} transition="all 0.3s">
            <CardBody>
              <Text fontSize="sm" color="gray.600" fontWeight="semibold">Total Tasks</Text>
              <Heading size="2xl" color="cyan.600">{tasks.length}</Heading>
            </CardBody>
          </Card>
          <Card borderWidth="2px" borderColor="green.100" _hover={{ borderColor: 'green.300', shadow: 'lg' }} transition="all 0.3s">
            <CardBody>
              <Text fontSize="sm" color="gray.600" fontWeight="semibold">Completed Tasks</Text>
              <Heading size="2xl" color="green.600">
                {tasks.filter(t => t.status === 'passed').length}
              </Heading>
            </CardBody>
          </Card>
          <Card borderWidth="2px" borderColor="orange.100" _hover={{ borderColor: 'orange.300', shadow: 'lg' }} transition="all 0.3s">
            <CardBody>
              <Text fontSize="sm" color="gray.600" fontWeight="semibold">Pending Tasks</Text>
              <Heading size="2xl" color="orange.600">
                {tasks.filter(t => ['pending', 'in_progress'].includes(t.status)).length}
              </Heading>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Tasks Section */}
        <Card borderWidth="2px" borderColor="cyan.100" shadow="lg">
          <CardBody>
            <Heading size="md" mb={4}>Your Tasks</Heading>
            <Divider mb={4} />
            {tasks.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Icon as={FaFileAlt} boxSize={12} color="gray.400" mb={4} />
                <Text color="gray.600">No tasks assigned yet</Text>
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Task Title</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Score</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tasks.map((task) => (
                    <Tr key={task.id}>
                      <Td fontWeight="semibold">{task.task?.title || 'Unknown Task'}</Td>
                      <Td>
                        <Badge colorScheme="blue">{task.task?.task_type?.replace('_', ' ')}</Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={getTaskStatusColor(task.status)} textTransform="capitalize">
                          {task.status === 'in_progress' ? 'In Progress' : task.status}
                        </Badge>
                      </Td>
                      <Td>
                        {task.score !== null && task.score !== undefined ? (
                          <Text fontWeight="bold" color={task.passed ? 'green.600' : 'red.600'}>
                            {task.score}/{task.task?.max_score || 100}
                            {task.passed && <Icon as={FaCheckCircle} ml={2} color="green.500" />}
                          </Text>
                        ) : (
                          <Text color="gray.500">Not graded</Text>
                        )}
                      </Td>
                      <Td>
                        {task.status === 'pending' || task.status === 'in_progress' ? (
                          <Button
                            size="sm"
                            bgGradient="linear(to-r, cyan.400, blue.500)"
                            color="white"
                            _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)' }}
                            onClick={() => {
                              setSelectedTask(task)
                              setSubmissionText(task.submission_text || '')
                              onOpen()
                            }}
                          >
                            {task.status === 'in_progress' ? 'Update Submission' : 'Start Task'}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" colorScheme="gray" isDisabled>
                            {task.status === 'submitted' ? 'Under Review' : 'Completed'}
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Task Submission Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{selectedTask?.task?.title}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack align="start" spacing={4}>
                <Box>
                  <Text fontWeight="semibold" mb={2}>Description:</Text>
                  <Text color="gray.600">{selectedTask?.task?.description}</Text>
                </Box>
                {selectedTask?.task?.instructions && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Instructions:</Text>
                    <Text color="gray.600" whiteSpace="pre-wrap">{selectedTask?.task?.instructions}</Text>
                  </Box>
                )}
                <Box w="full">
                  <Text fontWeight="semibold" mb={2}>Your Submission:</Text>
                  <Textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Enter your submission here..."
                    rows={8}
                  />
                </Box>
                {selectedTask?.feedback && (
                  <Box w="full" p={4} bg="yellow.50" borderRadius="md" borderWidth="1px" borderColor="yellow.200">
                    <Text fontWeight="semibold" mb={2}>Feedback from Reviewer:</Text>
                    <Text color="gray.700">{selectedTask.feedback}</Text>
                  </Box>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                bgGradient="linear(to-r, cyan.400, blue.500)"
                color="white"
                _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)' }}
                onClick={handleSubmitTask}
              >
                Submit Task
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Resume Upload Modal */}
        <Modal isOpen={resumeModal.isOpen} onClose={resumeModal.onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FaFileAlt} color="purple.500" />
                <Text>
                  {candidate?.resume_text ? 'Update Your Resume' : 'Upload Your Resume'}
                </Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack align="stretch" spacing={4}>
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">AI-Powered Analysis</AlertTitle>
                    <AlertDescription fontSize="xs">
                      Your resume will be automatically analyzed by AI and scored against the job requirements.
                      This helps improve your chances of being selected!
                    </AlertDescription>
                  </Box>
                </Alert>

                <Box>
                  <Text fontWeight="semibold" mb={2} fontSize="sm">
                    Select Resume File
                  </Text>
                  <Input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    p={1}
                    size="md"
                  />
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    Supported formats: TXT, PDF, DOC, DOCX
                  </Text>
                </Box>

                {selectedFile && (
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold">
                        {selectedFile.name}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </Text>
                    </Box>
                  </Alert>
                )}

                {candidate?.resume_text && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="xs">
                      Uploading a new resume will replace your existing one and trigger a new AI analysis.
                    </Text>
                  </Alert>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button 
                variant="ghost" 
                mr={3} 
                onClick={() => {
                  resumeModal.onClose()
                  setSelectedFile(null)
                }}
              >
                Cancel
              </Button>
              <Button
                bgGradient="linear(to-r, purple.400, pink.500)"
                color="white"
                _hover={{ bgGradient: 'linear(to-r, purple.500, pink.600)' }}
                onClick={handleResumeUpload}
                isLoading={uploadingResume}
                isDisabled={!selectedFile}
                leftIcon={<Icon as={FaFileAlt} />}
              >
                {candidate?.resume_text ? 'Update & Re-analyze' : 'Upload & Analyze'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </Box>
  )
}
