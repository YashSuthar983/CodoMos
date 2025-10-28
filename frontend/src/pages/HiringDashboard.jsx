import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, useToast, Button, Card, CardBody, Text,
  SimpleGrid, Badge, VStack, HStack, Flex, Stat, StatLabel, StatNumber,
  Menu, MenuButton, MenuList, MenuItem, IconButton, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Input, FormControl, FormLabel, Textarea, Select,
  Tabs, TabList, TabPanels, Tab, TabPanel, Divider, Avatar, Spinner
} from '@chakra-ui/react'
import { AddIcon, ChevronDownIcon, ViewIcon, EmailIcon, PhoneIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const HIRING_STAGES = [
  { key: 'applied', label: 'Applied', color: 'gray' },
  { key: 'screening', label: 'Screening', color: 'blue' },
  { key: 'interview', label: 'Interview', color: 'purple' },
  { key: 'technical_assessment', label: 'Technical', color: 'orange' },
  { key: 'offer', label: 'Offer', color: 'green' },
  { key: 'hired', label: 'Hired', color: 'teal' }
]

export default function HiringDashboard() {
  const [candidates, setCandidates] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState('all')
  const toast = useToast()
  const navigate = useNavigate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position_applied: '',
    resume_text: '',
    portfolio_url: '',
    linkedin_url: '',
    github_username: '',
    source: '',
    expected_salary: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [candidatesRes, statsRes] = await Promise.all([
        api.get('/hiring/candidates'),
        api.get('/hiring/dashboard/stats')
      ])
      setCandidates(candidatesRes.data)
      setStats(statsRes.data)
    } catch (e) {
      toast({ title: 'Failed to load hiring data', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCandidate = async () => {
    try {
      if (!formData.full_name || !formData.email || !formData.position_applied) {
        toast({ title: 'Name, email, and position are required', status: 'warning' })
        return
      }

      await api.post('/hiring/candidates', {
        ...formData,
        expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : null
      })
      
      toast({ title: 'Candidate added successfully', status: 'success' })
      onClose()
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        position_applied: '',
        resume_text: '',
        portfolio_url: '',
        linkedin_url: '',
        github_username: '',
        source: '',
        expected_salary: ''
      })
      loadData()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to add candidate'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const getCandidatesByStage = (stage) => {
    return candidates.filter(c => c.current_stage === stage && c.status === 'active')
  }

  const filteredCandidates = selectedStage === 'all' 
    ? candidates.filter(c => c.status === 'active')
    : getCandidatesByStage(selectedStage)

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
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">Hiring Pipeline</Heading>
          <Text color="gray.600">Manage candidates through the recruitment process</Text>
        </VStack>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onOpen}>
          Add Candidate
        </Button>
      </Flex>

      {/* Stats Dashboard */}
      {stats && (
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
          <Stat bg="white" p={4} rounded="lg" shadow="sm" borderLeft="4px" borderColor="blue.500">
            <StatLabel>Total Candidates</StatLabel>
            <StatNumber>{stats.total_candidates}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} rounded="lg" shadow="sm" borderLeft="4px" borderColor="green.500">
            <StatLabel>Active Pipeline</StatLabel>
            <StatNumber>{stats.active_candidates}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} rounded="lg" shadow="sm" borderLeft="4px" borderColor="teal.500">
            <StatLabel>Hired (Total)</StatLabel>
            <StatNumber>{stats.hired_count}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} rounded="lg" shadow="sm" borderLeft="4px" borderColor="orange.500">
            <StatLabel>Recent (30d)</StatLabel>
            <StatNumber>{stats.recent_applications}</StatNumber>
          </Stat>
        </SimpleGrid>
      )}

      {/* View Toggle */}
      <Tabs onChange={(index) => {
        if (index === 0) setSelectedStage('all')
      }} mb={6}>
        <TabList>
          <Tab>Pipeline View</Tab>
          <Tab>List View</Tab>
        </TabList>

        <TabPanels>
          {/* Pipeline View */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {HIRING_STAGES.map(stage => {
                const stageCandidates = getCandidatesByStage(stage.key)
                return (
                  <Card key={stage.key} shadow="sm">
                    <CardBody>
                      <Flex justify="space-between" align="center" mb={4}>
                        <HStack>
                          <Badge colorScheme={stage.color} fontSize="md" px={3} py={1}>
                            {stage.label}
                          </Badge>
                          <Text fontWeight="bold" color="gray.600">
                            {stageCandidates.length}
                          </Text>
                        </HStack>
                      </Flex>
                      
                      <VStack spacing={3} align="stretch">
                        {stageCandidates.length === 0 ? (
                          <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                            No candidates
                          </Text>
                        ) : (
                          stageCandidates.map(candidate => (
                            <Card
                              key={candidate.id}
                              size="sm"
                              cursor="pointer"
                              _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                              transition="all 0.2s"
                              onClick={() => navigate(`/hiring/candidates/${candidate.id}`)}
                            >
                              <CardBody>
                                <VStack align="stretch" spacing={1}>
                                  <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                                    {candidate.full_name}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                    {candidate.position_applied}
                                  </Text>
                                  <HStack spacing={2} fontSize="xs">
                                    {candidate.email && (
                                      <HStack spacing={1}>
                                        <EmailIcon />
                                        <Text noOfLines={1}>{candidate.email}</Text>
                                      </HStack>
                                    )}
                                  </HStack>
                                  {candidate.overall_score > 0 && (
                                    <Badge colorScheme="purple" fontSize="xs" w="fit-content">
                                      Score: {candidate.overall_score.toFixed(0)}
                                    </Badge>
                                  )}
                                </VStack>
                              </CardBody>
                            </Card>
                          ))
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                )
              })}
            </SimpleGrid>
          </TabPanel>

          {/* List View */}
          <TabPanel px={0}>
            <Card>
              <CardBody>
                {/* Stage Filter */}
                <HStack mb={4}>
                  <Text fontWeight="medium">Filter by Stage:</Text>
                  <Select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    maxW="250px"
                  >
                    <option value="all">All Stages</option>
                    {HIRING_STAGES.map(stage => (
                      <option key={stage.key} value={stage.key}>{stage.label}</option>
                    ))}
                  </Select>
                </HStack>

                <VStack spacing={3} align="stretch">
                  {filteredCandidates.length === 0 ? (
                    <Text textAlign="center" color="gray.500" py={8}>
                      No candidates found
                    </Text>
                  ) : (
                    filteredCandidates.map(candidate => (
                      <Card
                        key={candidate.id}
                        cursor="pointer"
                        _hover={{ shadow: 'md' }}
                        onClick={() => navigate(`/hiring/candidates/${candidate.id}`)}
                      >
                        <CardBody>
                          <Flex justify="space-between" align="center">
                            <HStack spacing={4}>
                              <Avatar name={candidate.full_name} size="md" />
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="bold">{candidate.full_name}</Text>
                                <Text fontSize="sm" color="gray.600">
                                  {candidate.position_applied}
                                </Text>
                                <HStack fontSize="sm" color="gray.500">
                                  <EmailIcon />
                                  <Text>{candidate.email}</Text>
                                  {candidate.phone && (
                                    <>
                                      <PhoneIcon ml={2} />
                                      <Text>{candidate.phone}</Text>
                                    </>
                                  )}
                                </HStack>
                              </VStack>
                            </HStack>
                            
                            <VStack align="end">
                              <Badge
                                colorScheme={
                                  HIRING_STAGES.find(s => s.key === candidate.current_stage)?.color || 'gray'
                                }
                                fontSize="sm"
                              >
                                {HIRING_STAGES.find(s => s.key === candidate.current_stage)?.label || candidate.current_stage}
                              </Badge>
                              {candidate.overall_score > 0 && (
                                <Text fontSize="sm" color="purple.600" fontWeight="medium">
                                  Score: {candidate.overall_score.toFixed(0)}/100
                                </Text>
                              )}
                            </VStack>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Add Candidate Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Candidate</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Position Applied</FormLabel>
                <Input
                  value={formData.position_applied}
                  onChange={(e) => setFormData({ ...formData, position_applied: e.target.value })}
                  placeholder="Senior Backend Developer"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Source</FormLabel>
                <Select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                >
                  <option value="">Select source...</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Referral">Referral</option>
                  <option value="Website">Company Website</option>
                  <option value="Job Board">Job Board</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Portfolio URL</FormLabel>
                <Input
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                  placeholder="https://portfolio.com"
                />
              </FormControl>

              <FormControl>
                <FormLabel>LinkedIn URL</FormLabel>
                <Input
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </FormControl>

              <FormControl>
                <FormLabel>GitHub Username</FormLabel>
                <Input
                  value={formData.github_username}
                  onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                  placeholder="johndoe"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Expected Salary</FormLabel>
                <Input
                  type="number"
                  value={formData.expected_salary}
                  onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                  placeholder="80000"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Resume / Cover Letter</FormLabel>
                <Textarea
                  value={formData.resume_text}
                  onChange={(e) => setFormData({ ...formData, resume_text: e.target.value })}
                  placeholder="Paste resume text or notes..."
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleAddCandidate}>
              Add Candidate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}
