import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, useToast, Button, Card, CardBody, Text,
  SimpleGrid, Badge, VStack, HStack, Flex, Stat, StatLabel, StatNumber,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, 
  ModalFooter, ModalCloseButton, Input, FormControl, FormLabel, Textarea, Select,
  Tabs, TabList, TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td,
  IconButton, Menu, MenuButton, MenuList, MenuItem, Spinner, Divider, Alert, AlertIcon
} from '@chakra-ui/react'
import { AddIcon, ViewIcon, ExternalLinkIcon, ChevronDownIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function UnifiedHiringDashboard() {
  const [jobs, setJobs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [sortBy, setSortBy] = useState('date_desc')  // Default: newest first
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadingFor, setUploadingFor] = useState(null)
  const toast = useToast()
  const navigate = useNavigate()
  
  const jobModal = useDisclosure()
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    location: 'Remote',
    job_type: 'full_time',
    department: '',
    create_application_form: true,
    auto_create_candidates: true
  })

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    // Reload when sort changes
    if (candidates.length > 0) {
      loadAllData()
    }
  }, [sortBy])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [jobsRes, candidatesRes, statsRes] = await Promise.all([
        api.get('/hiring/jobs'),
        api.get('/hiring/candidates', { params: { sort_by: sortBy } }),
        api.get('/hiring/dashboard/stats')
      ])
      
      setJobs(jobsRes.data)
      setCandidates(candidatesRes.data)
      setStats(statsRes.data)
    } catch (e) {
      console.error('Error loading data:', e)
      const errorMsg = e?.response?.data?.detail 
        ? (typeof e.response.data.detail === 'string' 
            ? e.response.data.detail 
            : 'Failed to load hiring data')
        : e?.message || 'Failed to load hiring data'
      
      toast({
        title: 'Error loading data',
        description: errorMsg,
        status: 'error',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async () => {
    try {
      await api.post('/hiring/jobs', jobForm)
      toast({
        title: 'Job posting created',
        description: 'Application form has been auto-generated',
        status: 'success'
      })
      jobModal.onClose()
      setJobForm({
        title: '',
        description: '',
        location: 'Remote',
        job_type: 'full_time',
        department: '',
        create_application_form: true,
        auto_create_candidates: true
      })
      loadAllData()
    } catch (e) {
      console.error('Error creating job:', e)
      const errorMsg = e?.response?.data?.detail 
        ? (typeof e.response.data.detail === 'string' 
            ? e.response.data.detail 
            : JSON.stringify(e.response.data.detail))
        : e?.message || 'Failed to create job'
      
      toast({
        title: 'Error creating job',
        description: errorMsg,
        status: 'error',
        duration: 5000
      })
    }
  }

  const handlePublishJob = async (jobId) => {
    try {
      const res = await api.post(`/hiring/jobs/${jobId}/publish`)
      toast({
        title: 'Job Published!',
        description: res.data.message,
        status: 'success',
        duration: 5000
      })
      loadAllData()
    } catch (e) {
      console.error('Error publishing job:', e)
      const errorMsg = e?.response?.data?.detail 
        ? (typeof e.response.data.detail === 'string' 
            ? e.response.data.detail 
            : 'Failed to publish job')
        : e?.message || 'Failed to publish job'
      
      toast({
        title: 'Error publishing job',
        description: errorMsg,
        status: 'error',
        duration: 5000
      })
    }
  }

  const viewJobDetails = (jobId) => {
    navigate(`/hiring/jobs/${jobId}`)
  }

  const handleResumeUpload = async (candidateId) => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        status: 'warning',
        duration: 3000
      })
      return
    }

    const formData = new FormData()
    formData.append('resume_file', selectedFile)

    try {
      setUploadingFor(candidateId)
      const res = await api.post(`/hiring/candidates/${candidateId}/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast({
        title: 'Resume analyzed!',
        description: `Match Score: ${res.data.overall_score?.toFixed(1)}% | Technical: ${res.data.technical_score?.toFixed(1)}%`,
        status: 'success',
        duration: 5000
      })
      
      setSelectedFile(null)
      setUploadingFor(null)
      loadAllData()
    } catch (e) {
      console.error('Error uploading resume:', e)
      toast({
        title: 'Upload failed',
        description: e?.response?.data?.detail || 'Failed to upload and analyze resume',
        status: 'error',
        duration: 5000
      })
      setUploadingFor(null)
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

  return (
    <Container maxW="7xl" py={8}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={8}>
        <Box>
          <Heading size="xl">🎯 Centralized Hiring</Heading>
          <Text color="gray.600" mt={2}>
            Manage jobs, candidates, and applications in one place
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button
            colorScheme="cyan"
            variant="outline"
            onClick={() => navigate('/hiring/tasks')}
          >
            📋 Manage Tasks
          </Button>
          <Button
            leftIcon={<AddIcon />}
            bgGradient="linear(to-r, cyan.400, blue.500)"
            color="white"
            _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)' }}
            onClick={jobModal.onOpen}
          >
            Post New Job
          </Button>
        </HStack>
      </Flex>

      {/* Workflow Info */}
      <Alert status="info" mb={6}>
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold">✨ Streamlined Workflow</Text>
          <Text fontSize="sm">
            1️⃣ Create Job → 2️⃣ Auto-generates Application Form → 3️⃣ Candidates Apply → 4️⃣ Auto-creates in Hiring → 5️⃣ AI Analysis Available
          </Text>
        </VStack>
      </Alert>

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Active Jobs</StatLabel>
              <StatNumber>{jobs.filter(j => j.status === 'active').length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Applicants</StatLabel>
              <StatNumber>{candidates.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>In Interview</StatLabel>
              <StatNumber>
                {candidates.filter(c => c.current_stage === 'interview').length}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending Review</StatLabel>
              <StatNumber>
                {candidates.filter(c => c.current_stage === 'screening').length}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Tabs: Jobs & Candidates */}
      <Tabs>
        <TabList>
          <Tab>🎯 Job Postings ({jobs.length})</Tab>
          <Tab>👥 All Candidates ({candidates.length})</Tab>
        </TabList>

        <TabPanels>
          {/* Job Postings Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {jobs.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8}>
                      <Text fontSize="lg" color="gray.600">
                        No job postings yet
                      </Text>
                      <Button colorScheme="blue" onClick={jobModal.onOpen}>
                        Create Your First Job
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                jobs.map((job) => (
                  <Card key={job.id} _hover={{ shadow: 'md' }} cursor="pointer">
                    <CardBody>
                      <Flex justify="space-between" align="start">
                        <Box flex="1" onClick={() => viewJobDetails(job.id)}>
                          <HStack mb={2}>
                            <Heading size="md">{job.title}</Heading>
                            <Badge colorScheme={
                              job.status === 'active' ? 'green' :
                              job.status === 'draft' ? 'gray' :
                              job.status === 'paused' ? 'orange' : 'red'
                            }>
                              {job.status}
                            </Badge>
                            {job.is_public && <Badge colorScheme="blue">Public</Badge>}
                          </HStack>
                          
                          <HStack spacing={4} mb={3} fontSize="sm" color="gray.600">
                            <Text>📍 {job.location}</Text>
                            <Text>💼 {job.job_type.replace('_', ' ')}</Text>
                            {job.department && <Text>🏢 {job.department}</Text>}
                            <Text>👥 {job.applicant_count} applicants</Text>
                          </HStack>

                          {job.application_form_id && (
                            <Badge colorScheme="purple">
                              ✨ Application Form Ready
                            </Badge>
                          )}
                        </Box>

                        <VStack spacing={2}>
                          {job.status === 'draft' && (
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() => handlePublishJob(job.id)}
                            >
                              Publish Job
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<ViewIcon />}
                            onClick={() => viewJobDetails(job.id)}
                          >
                            View Details
                          </Button>
                          {job.application_form_id && (
                            <>
                              {job.is_public && job.status === 'active' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<ExternalLinkIcon />}
                                  onClick={() => window.open(`/public/forms/${job.application_form_id}`, '_blank')}
                                >
                                  Preview Form
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" isDisabled>
                                  Form Private
                                </Button>
                              )}
                              <Button
                                size="sm"
                                colorScheme="purple"
                                variant="outline"
                                onClick={() => navigate(`/forms/${job.application_form_id}/edit`)}
                              >
                                ✏️ Edit Form
                              </Button>
                            </>
                          )}
                        </VStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))
              )}
            </VStack>
          </TabPanel>

          {/* Candidates Tab */}
          <TabPanel>
            {candidates.length === 0 ? (
              <Card>
                <CardBody>
                  <VStack py={8}>
                    <Text fontSize="lg" color="gray.600">
                      No candidates yet
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Candidates will appear here when they apply to your jobs
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <VStack spacing={4} align="stretch">
                {/* Sorting Controls */}
                <Card>
                  <CardBody>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                      <HStack spacing={3}>
                        <Text fontWeight="bold" fontSize="sm">Sort by:</Text>
                        <Select
                          size="sm"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          width="200px"
                        >
                          <option value="score_desc">🏆 Highest Score</option>
                          <option value="score_asc">📊 Lowest Score</option>
                          <option value="date_desc">📅 Newest First</option>
                          <option value="date">📅 Oldest First</option>
                          <option value="name">🔤 Name (A-Z)</option>
                        </Select>
                      </HStack>
                      <HStack spacing={2}>
                        <Badge colorScheme="purple" fontSize="xs">
                          {candidates.filter(c => c.ai_analyzed_at).length} AI Analyzed
                        </Badge>
                        <Badge colorScheme="green" fontSize="xs">
                          {candidates.filter(c => c.resume_text).length} With Resume
                        </Badge>
                      </HStack>
                    </Flex>
                  </CardBody>
                </Card>

                {/* Candidates Table */}
                <Card>
                  <CardBody overflowX="auto">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Candidate</Th>
                          <Th>Position</Th>
                          <Th>Stage</Th>
                          <Th>Match Score</Th>
                          <Th>Technical</Th>
                          <Th>Status</Th>
                          <Th>Applied</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {candidates.map((candidate) => (
                          <Tr
                            key={candidate.id}
                            _hover={{ bg: 'gray.50' }}
                            cursor="pointer"
                            onClick={() => navigate(`/hiring/candidates/${candidate.id}`)}
                          >
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="bold">{candidate.full_name}</Text>
                                <Text fontSize="xs" color="gray.600">{candidate.email}</Text>
                              </VStack>
                            </Td>
                            <Td maxW="200px">
                              <Text fontSize="sm" noOfLines={2}>{candidate.position_applied}</Text>
                            </Td>
                            <Td>
                              <Badge 
                                colorScheme={
                                  candidate.current_stage === 'hired' ? 'green' :
                                  candidate.current_stage === 'offer' ? 'purple' :
                                  candidate.current_stage === 'interview' ? 'blue' :
                                  candidate.current_stage === 'screening' ? 'cyan' :
                                  candidate.current_stage === 'rejected' ? 'red' : 'gray'
                                }
                                fontSize="xs"
                              >
                                {candidate.current_stage}
                              </Badge>
                            </Td>
                            <Td>
                              {candidate.overall_score > 0 ? (
                                <VStack spacing={0} align="start">
                                  <Text 
                                    fontWeight="bold" 
                                    fontSize="lg"
                                    color={
                                      candidate.overall_score >= 80 ? 'green.500' :
                                      candidate.overall_score >= 60 ? 'blue.500' :
                                      candidate.overall_score >= 40 ? 'orange.500' : 'red.500'
                                    }
                                  >
                                    {candidate.overall_score.toFixed(0)}%
                                  </Text>
                                  {candidate.ai_analyzed_at && (
                                    <Badge colorScheme="purple" fontSize="xx-small">
                                      AI ✨
                                    </Badge>
                                  )}
                                </VStack>
                              ) : (
                                <Text color="gray.400" fontSize="sm">Not scored</Text>
                              )}
                            </Td>
                            <Td>
                              {candidate.technical_score > 0 ? (
                                <Text fontSize="sm" fontWeight="medium">
                                  {candidate.technical_score.toFixed(0)}%
                                </Text>
                              ) : (
                                <Text color="gray.400" fontSize="xs">—</Text>
                              )}
                            </Td>
                            <Td>
                              <VStack align="start" spacing={1}>
                                {candidate.resume_text && (
                                  <Badge colorScheme="green" fontSize="xx-small">
                                    📄 Resume
                                  </Badge>
                                )}
                                {candidate.ai_confidence && (
                                  <Badge 
                                    colorScheme={
                                      candidate.ai_confidence === 'high' ? 'green' :
                                      candidate.ai_confidence === 'medium' ? 'yellow' : 'orange'
                                    }
                                    fontSize="xx-small"
                                  >
                                    {candidate.ai_confidence}
                                  </Badge>
                                )}
                              </VStack>
                            </Td>
                            <Td fontSize="xs" color="gray.600">
                              {new Date(candidate.created_at).toLocaleDateString()}
                            </Td>
                            <Td>
                              <Button
                                size="xs"
                                colorScheme="cyan"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/hiring/candidates/${candidate.id}`)
                                }}
                              >
                                View Details
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>

                {/* Info Alert */}
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="bold">
                      💡 Resume Analysis with AI
                    </Text>
                    <Text fontSize="xs">
                      Upload resumes via candidate detail page or candidates submit them through application forms. 
                      AI automatically analyzes and scores each resume against job requirements.
                    </Text>
                  </VStack>
                </Alert>
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Create Job Modal */}
      <Modal isOpen={jobModal.isOpen} onClose={jobModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Job Posting</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Job Title</FormLabel>
                <Input
                  placeholder="e.g., Senior Backend Developer"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Job description..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
                  rows={4}
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} width="100%">
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input
                    value={jobForm.location}
                    onChange={(e) => setJobForm({...jobForm, location: e.target.value})}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Job Type</FormLabel>
                  <Select
                    value={jobForm.job_type}
                    onChange={(e) => setJobForm({...jobForm, job_type: e.target.value})}
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="freelance">Freelance</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Department</FormLabel>
                <Input
                  placeholder="e.g., Engineering"
                  value={jobForm.department}
                  onChange={(e) => setJobForm({...jobForm, department: e.target.value})}
                />
              </FormControl>

              <Divider />

              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="sm">Auto-Setup Enabled</Text>
                  <Text fontSize="xs">
                    ✨ Application form will be created automatically
                  </Text>
                  <Text fontSize="xs">
                    🤖 Candidates will be auto-created when they apply
                  </Text>
                  <Text fontSize="xs">
                    ✏️ You can edit the form anytime after creation
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={jobModal.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateJob}
              isDisabled={!jobForm.title || !jobForm.description}
            >
              Create Job
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}
