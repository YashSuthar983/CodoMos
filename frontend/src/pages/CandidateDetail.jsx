import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, useToast, Button, Card, CardBody, Text,
  VStack, HStack, Flex, Badge, Avatar, Divider, SimpleGrid,
  Tabs, TabList, TabPanels, Tab, TabPanel, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, FormControl, FormLabel, Textarea, Select, Input,
  Table, Thead, Tbody, Tr, Th, Td, Progress, IconButton, Link,
  Stat, StatLabel, StatNumber, Spinner, Alert, AlertIcon
} from '@chakra-ui/react'
import { ArrowBackIcon, EditIcon, EmailIcon, PhoneIcon, ExternalLinkIcon, StarIcon } from '@chakra-ui/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

const HIRING_STAGES = [
  { key: 'applied', label: 'Applied', color: 'gray' },
  { key: 'screening', label: 'Screening', color: 'blue' },
  { key: 'interview', label: 'Interview', color: 'purple' },
  { key: 'technical_assessment', label: 'Technical Assessment', color: 'orange' },
  { key: 'offer', label: 'Offer', color: 'green' },
  { key: 'hired', label: 'Hired', color: 'teal' },
  { key: 'rejected', label: 'Rejected', color: 'red' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'gray' }
]

const TASK_STATUS_COLORS = {
  assigned: 'gray',
  in_progress: 'blue',
  submitted: 'purple',
  reviewed: 'orange',
  passed: 'green',
  failed: 'red'
}

export default function CandidateDetail() {
  const { candidateId } = useParams()
  const [candidate, setCandidate] = useState(null)
  const [tasks, setTasks] = useState([])
  const [interviewNotes, setInterviewNotes] = useState([])
  const [stageHistory, setStageHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [availableTasks, setAvailableTasks] = useState([])
  
  const toast = useToast()
  const navigate = useNavigate()
  
  const stageModal = useDisclosure()
  const taskModal = useDisclosure()
  const interviewModal = useDisclosure()
  const convertModal = useDisclosure()
  
  const [newStage, setNewStage] = useState('')
  const [stageNotes, setStageNotes] = useState('')
  const [selectedTasks, setSelectedTasks] = useState([])
  const [deadlineDays, setDeadlineDays] = useState('7')
  
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    rating: '',
    notes: '',
    strengths: '',
    concerns: '',
    recommendation: ''
  })

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadingResume, setUploadingResume] = useState(false)

  useEffect(() => {
    loadCandidateDetail()
    loadAvailableTasks()
  }, [candidateId])

  const loadCandidateDetail = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/hiring/candidates/${candidateId}`)
      setCandidate(res.data.candidate)
      setTasks(res.data.tasks || [])
      setInterviewNotes(res.data.interview_notes || [])
      setStageHistory(res.data.stage_history || [])
    } catch (e) {
      toast({ title: 'Failed to load candidate details', status: 'error' })
      navigate('/hiring')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableTasks = async () => {
    try {
      const res = await api.get('/hiring/tasks/templates', {
        params: { is_active: true }
      })
      setAvailableTasks(res.data)
    } catch (e) {
      console.error('Failed to load tasks:', e)
    }
  }

  const handleChangeStage = async () => {
    try {
      await api.post(`/hiring/candidates/${candidateId}/change-stage`, {
        new_stage: newStage,
        notes: stageNotes || null
      })
      toast({ title: 'Stage updated successfully', status: 'success' })
      stageModal.onClose()
      setNewStage('')
      setStageNotes('')
      loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to update stage'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const handleAssignTasks = async () => {
    try {
      if (selectedTasks.length === 0) {
        toast({ 
          title: 'No Tasks Selected', 
          description: 'Please select at least one task to assign',
          status: 'warning',
          duration: 4000
        })
        return
      }

      const res = await api.post(`/hiring/candidates/${candidateId}/assign-tasks`, {
        task_ids: selectedTasks,
        deadline_days: deadlineDays ? parseInt(deadlineDays) : null
      })
      
      toast({ 
        title: '✅ Tasks Assigned!', 
        description: `Successfully assigned ${selectedTasks.length} task(s) to ${candidate.full_name}. Check the Tasks tab.`,
        status: 'success',
        duration: 5000,
        isClosable: true
      })
      
      taskModal.onClose()
      setSelectedTasks([])
      setDeadlineDays('7')
      await loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to assign tasks'
      toast({ 
        title: 'Task Assignment Failed', 
        description: msg, 
        status: 'error',
        duration: 6000,
        isClosable: true
      })
    }
  }

  const handleAddInterviewNote = async () => {
    try {
      await api.post('/hiring/interview-notes', {
        candidate_id: candidateId,
        interview_date: new Date(interviewData.interview_date).toISOString(),
        stage: candidate.current_stage,
        rating: interviewData.rating ? parseInt(interviewData.rating) : null,
        notes: interviewData.notes || null,
        strengths: interviewData.strengths ? interviewData.strengths.split(',').map(s => s.trim()) : [],
        concerns: interviewData.concerns ? interviewData.concerns.split(',').map(s => s.trim()) : [],
        recommendation: interviewData.recommendation || null
      })
      
      toast({ title: 'Interview note added', status: 'success' })
      interviewModal.onClose()
      setInterviewData({
        interview_date: '',
        rating: '',
        notes: '',
        strengths: '',
        concerns: '',
        recommendation: ''
      })
      loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to add interview note'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const handleConvertToEmployee = async () => {
    try {
      const res = await api.post(`/hiring/candidates/${candidateId}/convert-to-employee`, {
        generate_password: true,
        role: 'user'
      })
      
      toast({
        title: 'Candidate converted to employee!',
        description: `Temporary password: ${res.data.temporary_password}`,
        status: 'success',
        duration: 15000,
        isClosable: true
      })
      
      convertModal.onClose()
      loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to convert candidate'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const handleRequestAIAnalysis = async () => {
    try {
      setLoading(true)
      const res = await api.post(`/hiring/candidates/${candidateId}/ai-analyze`)
      
      toast({
        title: '✨ AI Analysis Complete!',
        description: res.data.message || 'AI has analyzed the candidate. Check the AI Insights tab below.',
        status: 'success',
        duration: 7000,
        isClosable: true
      })
      
      // Show the analysis results
      if (res.data.analysis) {
        console.log('AI Analysis Results:', res.data.analysis)
        
        // Log detailed breakdown for debugging
        console.log('Overall Score:', res.data.analysis.overall_score)
        console.log('Strengths:', res.data.analysis.strengths)
        console.log('Concerns:', res.data.analysis.concerns)
        console.log('Recommendation:', res.data.analysis.recommendation)
      }
      
      await loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'AI analysis failed'
      
      // Show more helpful error messages
      let description = msg
      if (msg.includes('form responses')) {
        description = 'This candidate needs to have a form response. Make sure they submitted the application form.'
      }
      
      toast({ 
        title: 'AI Analysis Failed', 
        description: description,
        status: 'error',
        duration: 7000,
        isClosable: true
      })
      
      console.error('AI Analysis Error:', e.response?.data)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyAISuggestions = async () => {
    if (!window.confirm('Apply AI suggestions to this candidate? This will update their scores.')) {
      return
    }
    
    try {
      const res = await api.post(
        `/hiring/candidates/${candidateId}/apply-ai-suggestions?apply_scores=true`
      )
      
      toast({
        title: 'AI Suggestions Applied',
        description: res.data.message,
        status: 'success'
      })
      
      loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to apply suggestions'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const handleResumeUpload = async () => {
    if (!selectedFile) {
      toast({ title: 'Please select a file', status: 'warning' })
      return
    }

    const formData = new FormData()
    formData.append('resume_file', selectedFile)

    try {
      setUploadingResume(true)
      const res = await api.post(
        `/hiring/candidates/${candidateId}/upload-resume`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      toast({
        title: '✨ Resume Uploaded & Analyzed!',
        description: `Match Score: ${res.data.overall_score?.toFixed(1)}% | Technical: ${res.data.technical_score?.toFixed(1)}%`,
        status: 'success',
        duration: 7000,
        isClosable: true
      })

      setSelectedFile(null)
      // Reset file input
      const fileInput = document.getElementById('resume-upload')
      if (fileInput) fileInput.value = ''
      
      await loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to upload resume'
      toast({ title: 'Upload Failed', description: msg, status: 'error', duration: 5000 })
    } finally {
      setUploadingResume(false)
    }
  }

  const handleReanalyzeResume = async () => {
    try {
      setUploadingResume(true)
      const res = await api.post(`/hiring/candidates/${candidateId}/analyze-resume`)

      toast({
        title: '✨ Resume Re-analyzed!',
        description: `New Match Score: ${res.data.overall_score?.toFixed(1)}%`,
        status: 'success',
        duration: 5000
      })

      await loadCandidateDetail()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to re-analyze resume'
      toast({ title: 'Analysis Failed', description: msg, status: 'error', duration: 5000 })
    } finally {
      setUploadingResume(false)
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

  if (!candidate) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          Candidate not found
        </Alert>
      </Container>
    )
  }

  const currentStageInfo = HIRING_STAGES.find(s => s.key === candidate.current_stage)

  return (
    <Container maxW="7xl" py={8}>
      {/* Header */}
      <Button
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        mb={4}
        onClick={() => navigate('/hiring')}
      >
        Back to Pipeline
      </Button>

      {/* Candidate Profile Card */}
      <Card mb={6} shadow="md">
        <CardBody>
          <Flex justify="space-between" align="start">
            <HStack spacing={4} align="start">
              <Avatar name={candidate.full_name} size="xl" />
              <VStack align="start" spacing={1}>
                <Heading size="lg">{candidate.full_name}</Heading>
                <Text fontSize="lg" color="gray.600">{candidate.position_applied}</Text>
                <HStack spacing={4} fontSize="sm" color="gray.600">
                  <HStack>
                    <EmailIcon />
                    <Text>{candidate.email}</Text>
                  </HStack>
                  {candidate.phone && (
                    <HStack>
                      <PhoneIcon />
                      <Text>{candidate.phone}</Text>
                    </HStack>
                  )}
                </HStack>
                <HStack spacing={2} mt={2}>
                  {candidate.portfolio_url && (
                    <Link href={candidate.portfolio_url} isExternal>
                      <Button size="xs" variant="outline" rightIcon={<ExternalLinkIcon />}>
                        Portfolio
                      </Button>
                    </Link>
                  )}
                  {candidate.linkedin_url && (
                    <Link href={candidate.linkedin_url} isExternal>
                      <Button size="xs" variant="outline" rightIcon={<ExternalLinkIcon />}>
                        LinkedIn
                      </Button>
                    </Link>
                  )}
                  {candidate.github_username && (
                    <Link href={`https://github.com/${candidate.github_username}`} isExternal>
                      <Button size="xs" variant="outline" rightIcon={<ExternalLinkIcon />}>
                        GitHub
                      </Button>
                    </Link>
                  )}
                </HStack>
              </VStack>
            </HStack>

            <VStack align="end">
              <Badge
                colorScheme={currentStageInfo?.color || 'gray'}
                fontSize="lg"
                px={4}
                py={2}
                borderRadius="md"
              >
                {currentStageInfo?.label || candidate.current_stage}
              </Badge>
              <HStack spacing={2} mt={4}>
                <Button size="sm" colorScheme="blue" onClick={stageModal.onOpen}>
                  Change Stage
                </Button>
                {candidate.current_stage === 'hired' && !candidate.employee_id && (
                  <Button size="sm" colorScheme="green" onClick={convertModal.onOpen}>
                    Convert to Employee
                  </Button>
                )}
              </HStack>
            </VStack>
          </Flex>

          <Divider my={4} />

          {/* Stats */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat>
              <StatLabel>Overall Score</StatLabel>
              <StatNumber>{candidate.overall_score.toFixed(0)}/100</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Technical Score</StatLabel>
              <StatNumber>{candidate.technical_score?.toFixed(0) || 'N/A'}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Cultural Fit</StatLabel>
              <StatNumber>{candidate.cultural_fit_score?.toFixed(0) || 'N/A'}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Status</StatLabel>
              <StatNumber>
                <Badge colorScheme={candidate.status === 'active' ? 'green' : 'gray'}>
                  {candidate.status}
                </Badge>
              </StatNumber>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs>
        <TabList>
          <Tab>Tasks ({tasks.length})</Tab>
          <Tab>Interview Notes ({interviewNotes.length})</Tab>
          <Tab>Stage History</Tab>
          <Tab>AI Insights {candidate.ai_analysis && '✨'}</Tab>
          <Tab>Details</Tab>
        </TabList>

        <TabPanels>
          {/* Tasks Tab */}
          <TabPanel>
            <Flex justify="space-between" mb={4}>
              <Heading size="md">Assigned Tasks</Heading>
              <Button size="sm" colorScheme="blue" onClick={taskModal.onOpen}>
                Assign Tasks
              </Button>
            </Flex>

            <VStack spacing={4} align="stretch">
              {tasks.length === 0 ? (
                <Text textAlign="center" color="gray.500" py={8}>
                  No tasks assigned yet
                </Text>
              ) : (
                tasks.map(({ task, submission }) => (
                  <Card key={submission.id}>
                    <CardBody>
                      <Flex justify="space-between" align="start">
                        <VStack align="start" spacing={2} flex={1}>
                          <HStack>
                            <Heading size="sm">{task.title}</Heading>
                            <Badge colorScheme={TASK_STATUS_COLORS[submission.status]}>
                              {submission.status.replace('_', ' ')}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">{task.description}</Text>
                          <HStack spacing={4} fontSize="sm">
                            <Text>
                              <strong>Type:</strong> {task.task_type.replace('_', ' ')}
                            </Text>
                            {submission.deadline && (
                              <Text>
                                <strong>Deadline:</strong>{' '}
                                {new Date(submission.deadline).toLocaleDateString()}
                              </Text>
                            )}
                            {submission.score !== null && (
                              <Text color="purple.600">
                                <strong>Score:</strong> {submission.score.toFixed(0)}/{task.max_score}
                              </Text>
                            )}
                          </HStack>
                          {submission.submission_url && (
                            <Link href={submission.submission_url} isExternal color="blue.600">
                              View Submission <ExternalLinkIcon mx="2px" />
                            </Link>
                          )}
                          {submission.feedback && (
                            <Box bg="gray.50" p={3} rounded="md" w="full">
                              <Text fontSize="sm">
                                <strong>Feedback:</strong> {submission.feedback}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))
              )}
            </VStack>
          </TabPanel>

          {/* Interview Notes Tab */}
          <TabPanel>
            <Flex justify="space-between" mb={4}>
              <Heading size="md">Interview Feedback</Heading>
              <Button size="sm" colorScheme="blue" onClick={interviewModal.onOpen}>
                Add Interview Note
              </Button>
            </Flex>

            <VStack spacing={4} align="stretch">
              {interviewNotes.length === 0 ? (
                <Text textAlign="center" color="gray.500" py={8}>
                  No interview notes yet
                </Text>
              ) : (
                interviewNotes.map(note => (
                  <Card key={note.id}>
                    <CardBody>
                      <HStack justify="space-between" mb={2}>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{note.interviewer_name || 'Unknown'}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {new Date(note.interview_date).toLocaleDateString()}
                          </Text>
                        </VStack>
                        {note.rating && (
                          <HStack>
                            {[...Array(note.rating)].map((_, i) => (
                              <StarIcon key={i} color="yellow.400" />
                            ))}
                          </HStack>
                        )}
                      </HStack>
                      {note.notes && <Text mb={2}>{note.notes}</Text>}
                      {note.strengths.length > 0 && (
                        <Box mb={2}>
                          <Text fontSize="sm" fontWeight="bold" color="green.600">Strengths:</Text>
                          {note.strengths.map((s, i) => (
                            <Text key={i} fontSize="sm">• {s}</Text>
                          ))}
                        </Box>
                      )}
                      {note.concerns.length > 0 && (
                        <Box>
                          <Text fontSize="sm" fontWeight="bold" color="orange.600">Concerns:</Text>
                          {note.concerns.map((c, i) => (
                            <Text key={i} fontSize="sm">• {c}</Text>
                          ))}
                        </Box>
                      )}
                      {note.recommendation && (
                        <Badge mt={2} colorScheme={note.recommendation === 'hire' ? 'green' : 'red'}>
                          Recommendation: {note.recommendation}
                        </Badge>
                      )}
                    </CardBody>
                  </Card>
                ))
              )}
            </VStack>
          </TabPanel>

          {/* Stage History Tab */}
          <TabPanel>
            <Heading size="md" mb={4}>Stage History</Heading>
            <VStack spacing={3} align="stretch">
              {stageHistory.map((entry, index) => (
                <Card key={index}>
                  <CardBody>
                    <Flex justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Badge colorScheme="blue">{entry.stage}</Badge>
                        <Text fontSize="sm">{entry.notes}</Text>
                        <Text fontSize="xs" color="gray.500">by {entry.changed_by}</Text>
                      </VStack>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(entry.timestamp).toLocaleString()}
                      </Text>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </TabPanel>

          {/* AI Insights Tab */}
          <TabPanel>
            <Flex justify="space-between" mb={4}>
              <Heading size="md">AI Analysis & Suggestions</Heading>
              <Button
                size="sm"
                colorScheme="purple"
                onClick={handleRequestAIAnalysis}
                isLoading={loading}
              >
                {candidate.ai_analysis ? 'Re-analyze with AI' : 'Request AI Analysis'}
              </Button>
            </Flex>

            <Alert status="info" mb={4}>
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">AI Assistance Notice</Text>
                <Text fontSize="sm">
                  AI provides suggestions to assist evaluation. Final hiring decisions require human judgment.
                </Text>
              </Box>
            </Alert>

            {!candidate.ai_analysis ? (
              <Card>
                <CardBody>
                  <VStack spacing={4} py={8}>
                    <Text fontSize="lg" color="gray.600">
                      No AI analysis yet. Click "Request AI Analysis" to get unbiased suggestions.
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      AI will analyze form responses and provide objective feedback.
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <VStack spacing={4} align="stretch">
                {/* AI Scores */}
                <Card>
                  <CardBody>
                    <Heading size="sm" mb={4}>AI Suggested Scores</Heading>
                    <SimpleGrid columns={3} spacing={4}>
                      <Stat>
                        <StatLabel>Overall</StatLabel>
                        <StatNumber>{candidate.ai_analysis.overall_score}/100</StatNumber>
                        <Badge colorScheme="purple">AI Suggestion</Badge>
                      </Stat>
                      <Stat>
                        <StatLabel>Technical</StatLabel>
                        <StatNumber>{candidate.ai_analysis.technical_score}/100</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Cultural Fit</StatLabel>
                        <StatNumber>{candidate.ai_analysis.cultural_fit_score}/100</StatNumber>
                      </Stat>
                    </SimpleGrid>
                    <Divider my={4} />
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" color="gray.600">Confidence:</Text>
                        <Badge colorScheme={candidate.ai_confidence === 'high' ? 'green' : 'orange'}>
                          {candidate.ai_confidence}
                        </Badge>
                      </VStack>
                      <VStack align="end" spacing={0}>
                        <Text fontSize="sm" color="gray.600">Analyzed:</Text>
                        <Text fontSize="sm">
                          {candidate.ai_analyzed_at ? new Date(candidate.ai_analyzed_at).toLocaleString() : 'N/A'}
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Strengths */}
                {candidate.ai_analysis.strengths?.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3} color="green.600">💪 Strengths</Heading>
                      <VStack align="start" spacing={2}>
                        {candidate.ai_analysis.strengths.map((strength, i) => (
                          <HStack key={i} align="start">
                            <Text>✓</Text>
                            <Text>{strength}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Concerns */}
                {candidate.ai_analysis.concerns?.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3} color="orange.600">⚠️ Areas to Explore</Heading>
                      <VStack align="start" spacing={2}>
                        {candidate.ai_analysis.concerns.map((concern, i) => (
                          <HStack key={i} align="start">
                            <Text>•</Text>
                            <Text>{concern}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Recommendations */}
                {candidate.ai_analysis.recommendations?.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3} color="blue.600">💡 Recommendations</Heading>
                      <VStack align="start" spacing={2}>
                        {candidate.ai_analysis.recommendations.map((rec, i) => (
                          <HStack key={i} align="start">
                            <Text>→</Text>
                            <Text>{rec}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Reasoning & Bias Check */}
                <Card>
                  <CardBody>
                    <Heading size="sm" mb={3}>Analysis Details</Heading>
                    <VStack align="start" spacing={3}>
                      {candidate.ai_analysis.reasoning && (
                        <Box>
                          <Text fontWeight="bold" fontSize="sm">Reasoning:</Text>
                          <Text fontSize="sm">{candidate.ai_analysis.reasoning}</Text>
                        </Box>
                      )}
                      {candidate.ai_analysis.bias_check && (
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="purple.600">Bias Check:</Text>
                          <Text fontSize="sm">{candidate.ai_analysis.bias_check}</Text>
                        </Box>
                      )}
                      <Alert status="warning" size="sm">
                        <AlertIcon />
                        <Text fontSize="xs">
                          {candidate.ai_analysis.disclaimer || 'AI suggestions require human review'}
                        </Text>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Apply Suggestions Button */}
                <Card bg="purple.50" borderColor="purple.200" borderWidth="2px">
                  <CardBody>
                    <Flex justify="space-between" align="center">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">Apply AI Suggestions</Text>
                        <Text fontSize="sm" color="gray.600">
                          This will update the candidate's scores based on AI analysis
                        </Text>
                      </VStack>
                      <Button
                        colorScheme="purple"
                        onClick={handleApplyAISuggestions}
                        size="sm"
                      >
                        Apply Suggestions
                      </Button>
                    </Flex>
                  </CardBody>
                </Card>
              </VStack>
            )}
          </TabPanel>

          {/* Details Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {/* Resume Upload Section */}
              <Card borderColor={candidate.resume_text ? 'green.300' : 'gray.200'} borderWidth="2px">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Flex justify="space-between" align="center">
                      <VStack align="start" spacing={1}>
                        <Heading size="sm">📄 Resume Management</Heading>
                        {candidate.resume_text && (
                          <HStack spacing={2}>
                            <Badge colorScheme="green">Resume Uploaded</Badge>
                            {candidate.ai_analyzed_at && (
                              <Badge colorScheme="purple">✨ AI Analyzed</Badge>
                            )}
                          </HStack>
                        )}
                      </VStack>
                      {candidate.resume_url && (
                        <Link href={candidate.resume_url} isExternal>
                          <Button size="xs" variant="outline" rightIcon={<ExternalLinkIcon />}>
                            View Original
                          </Button>
                        </Link>
                      )}
                    </Flex>

                    <Divider />

                    {/* Upload Form */}
                    <VStack align="stretch" spacing={3}>
                      <FormControl>
                        <FormLabel fontSize="sm" fontWeight="bold">
                          {candidate.resume_text ? 'Replace Resume' : 'Upload Resume'}
                        </FormLabel>
                        <Input
                          id="resume-upload"
                          type="file"
                          accept=".txt,.pdf,.doc,.docx"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                          size="sm"
                          p={1}
                        />
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          Supported formats: TXT, PDF, DOC, DOCX. Resume will be automatically analyzed by AI.
                        </Text>
                      </FormControl>

                      <HStack spacing={2}>
                        <Button
                          colorScheme="cyan"
                          size="sm"
                          onClick={handleResumeUpload}
                          isLoading={uploadingResume}
                          isDisabled={!selectedFile}
                          leftIcon={selectedFile ? <Text>✨</Text> : null}
                        >
                          {candidate.resume_text ? 'Replace & Analyze' : 'Upload & Analyze'}
                        </Button>
                        
                        {candidate.resume_text && candidate.job_posting_id && (
                          <Button
                            colorScheme="purple"
                            variant="outline"
                            size="sm"
                            onClick={handleReanalyzeResume}
                            isLoading={uploadingResume}
                          >
                            🔄 Re-analyze Existing Resume
                          </Button>
                        )}
                      </HStack>

                      {/* Resume Analysis Preview */}
                      {candidate.ai_analysis && (
                        <Box bg="purple.50" p={3} rounded="md" borderWidth="1px" borderColor="purple.200">
                          <VStack align="start" spacing={2}>
                            <Text fontSize="sm" fontWeight="bold" color="purple.700">
                              ✨ AI Resume Analysis Summary
                            </Text>
                            <SimpleGrid columns={3} spacing={2} width="full">
                              <Box>
                                <Text fontSize="xs" color="gray.600">Match Score</Text>
                                <Text fontSize="lg" fontWeight="bold" color="purple.600">
                                  {candidate.ai_analysis.match_score || candidate.overall_score}%
                                </Text>
                              </Box>
                              <Box>
                                <Text fontSize="xs" color="gray.600">Technical</Text>
                                <Text fontSize="lg" fontWeight="bold" color="blue.600">
                                  {candidate.ai_analysis.technical_match || candidate.technical_score}%
                                </Text>
                              </Box>
                              <Box>
                                <Text fontSize="xs" color="gray.600">Experience</Text>
                                <Text fontSize="lg" fontWeight="bold" color="green.600">
                                  {candidate.ai_analysis.experience_match || 'N/A'}%
                                </Text>
                              </Box>
                            </SimpleGrid>
                            {candidate.ai_analysis.summary && (
                              <Box>
                                <Text fontSize="xs" fontWeight="bold">Summary:</Text>
                                <Text fontSize="xs" color="gray.700">{candidate.ai_analysis.summary}</Text>
                              </Box>
                            )}
                            {candidate.ai_analysis.top_relevant_skills && candidate.ai_analysis.top_relevant_skills.length > 0 && (
                              <Box>
                                <Text fontSize="xs" fontWeight="bold">Top Skills:</Text>
                                <HStack spacing={1} flexWrap="wrap">
                                  {candidate.ai_analysis.top_relevant_skills.slice(0, 5).map((skill, i) => (
                                    <Badge key={i} colorScheme="cyan" fontSize="xx-small">{skill}</Badge>
                                  ))}
                                </HStack>
                              </Box>
                            )}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Heading size="sm" mb={3}>Additional Information</Heading>
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">Source</Text>
                      <Text>{candidate.source || 'N/A'}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">Expected Salary</Text>
                      <Text>{candidate.expected_salary ? `$${candidate.expected_salary.toLocaleString()}` : 'N/A'}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">Applied On</Text>
                      <Text>{new Date(candidate.created_at).toLocaleDateString()}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">Last Updated</Text>
                      <Text>{new Date(candidate.updated_at).toLocaleDateString()}</Text>
                    </Box>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {candidate.resume_text && (
                <Card>
                  <CardBody>
                    <Heading size="sm" mb={3}>Resume / Notes</Heading>
                    <Text whiteSpace="pre-wrap">{candidate.resume_text}</Text>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Change Stage Modal */}
      <Modal isOpen={stageModal.isOpen} onClose={stageModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Change Hiring Stage</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>New Stage</FormLabel>
                <Select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  placeholder="Select stage..."
                >
                  {HIRING_STAGES.map(stage => (
                    <option key={stage.key} value={stage.key}>{stage.label}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder="Add notes about this stage change..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={stageModal.onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleChangeStage}>Update Stage</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Assign Tasks Modal */}
      <Modal isOpen={taskModal.isOpen} onClose={taskModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Assign Tasks to Candidate</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Deadline (days from now)</FormLabel>
                <Input
                  type="number"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  placeholder="7"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Select Tasks ({availableTasks.length} available)</FormLabel>
                {availableTasks.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">No Active Tasks</Text>
                      <Text fontSize="sm">Create task templates first in the Tasks page before assigning them to candidates.</Text>
                    </Box>
                  </Alert>
                ) : (
                  <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
                    {availableTasks.map(task => (
                    <Card
                      key={task.id}
                      cursor="pointer"
                      bg={selectedTasks.includes(task.id) ? 'blue.50' : 'white'}
                      borderColor={selectedTasks.includes(task.id) ? 'blue.500' : 'gray.200'}
                      borderWidth="2px"
                      onClick={() => {
                        setSelectedTasks(prev =>
                          prev.includes(task.id)
                            ? prev.filter(id => id !== task.id)
                            : [...prev, task.id]
                        )
                      }}
                    >
                      <CardBody py={3}>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="bold">{task.title}</Text>
                          <Text fontSize="sm" color="gray.600" noOfLines={2}>
                            {task.description}
                          </Text>
                          <HStack>
                            <Badge>{task.task_type.replace('_', ' ')}</Badge>
                            {task.estimated_duration && (
                              <Badge colorScheme="purple">{task.estimated_duration}h</Badge>
                            )}
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                    ))}
                  </VStack>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={taskModal.onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleAssignTasks}>
              Assign {selectedTasks.length} Task(s)
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Interview Note Modal */}
      <Modal isOpen={interviewModal.isOpen} onClose={interviewModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Interview Feedback</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Interview Date</FormLabel>
                <Input
                  type="datetime-local"
                  value={interviewData.interview_date}
                  onChange={(e) => setInterviewData({ ...interviewData, interview_date: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Rating (1-5 stars)</FormLabel>
                <Select
                  value={interviewData.rating}
                  onChange={(e) => setInterviewData({ ...interviewData, rating: e.target.value })}
                  placeholder="Select rating..."
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={interviewData.notes}
                  onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                  placeholder="General notes about the interview..."
                  rows={3}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Strengths (comma-separated)</FormLabel>
                <Input
                  value={interviewData.strengths}
                  onChange={(e) => setInterviewData({ ...interviewData, strengths: e.target.value })}
                  placeholder="Good communication, Problem solving, etc."
                />
              </FormControl>
              <FormControl>
                <FormLabel>Concerns (comma-separated)</FormLabel>
                <Input
                  value={interviewData.concerns}
                  onChange={(e) => setInterviewData({ ...interviewData, concerns: e.target.value })}
                  placeholder="Needs more experience with X, etc."
                />
              </FormControl>
              <FormControl>
                <FormLabel>Recommendation</FormLabel>
                <Select
                  value={interviewData.recommendation}
                  onChange={(e) => setInterviewData({ ...interviewData, recommendation: e.target.value })}
                  placeholder="Select recommendation..."
                >
                  <option value="hire">Hire</option>
                  <option value="maybe">Maybe</option>
                  <option value="reject">Reject</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={interviewModal.onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleAddInterviewNote}>Add Note</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Convert to Employee Modal */}
      <Modal isOpen={convertModal.isOpen} onClose={convertModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Convert to Employee</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="info" mb={4}>
              <AlertIcon />
              This will create a user account and generate onboarding tasks.
            </Alert>
            <Text>
              Convert <strong>{candidate.full_name}</strong> to an employee?
            </Text>
            <Text fontSize="sm" color="gray.600" mt={2}>
              A temporary password will be generated and displayed after conversion.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={convertModal.onClose}>Cancel</Button>
            <Button colorScheme="green" onClick={handleConvertToEmployee}>
              Convert to Employee
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}
