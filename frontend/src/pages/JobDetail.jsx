import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, useToast, Button, Card, CardBody, Text,
  SimpleGrid, Badge, VStack, HStack, Flex, Tabs, TabList, TabPanels,
  Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td, Spinner, Divider,
  IconButton, Menu, MenuButton, MenuList, MenuItem, Alert, AlertIcon, Stat, StatLabel, StatNumber
} from '@chakra-ui/react'
import { ArrowBackIcon, ExternalLinkIcon, EditIcon, ChevronDownIcon } from '@chakra-ui/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

export default function JobDetail() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadJobDetail()
  }, [jobId])

  const loadJobDetail = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/hiring/jobs/${jobId}`)
      setJob(res.data)
    } catch (e) {
      toast({
        title: 'Error',
        description: e?.response?.data?.detail || 'Failed to load job details',
        status: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    try {
      const res = await api.post(`/hiring/jobs/${jobId}/publish`)
      toast({
        title: 'Job Published!',
        description: res.data.message,
        status: 'success'
      })
      loadJobDetail()
    } catch (e) {
      toast({
        title: 'Error',
        description: e?.response?.data?.detail || 'Failed to publish job',
        status: 'error'
      })
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/hiring/jobs/${jobId}`, { status: newStatus })
      toast({
        title: 'Status Updated',
        status: 'success'
      })
      loadJobDetail()
    } catch (e) {
      toast({
        title: 'Error',
        description: e?.response?.data?.detail || 'Failed to update status',
        status: 'error'
      })
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

  if (!job) {
    return (
      <Container maxW="7xl" py={8}>
        <Text>Job not found</Text>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      {/* Header */}
      <Button
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        mb={4}
        onClick={() => navigate('/hiring')}
      >
        Back to Hiring
      </Button>

      <Flex justify="space-between" align="start" mb={6}>
        <Box>
          <HStack mb={2}>
            <Heading size="xl">{job.title}</Heading>
            <Badge colorScheme={
              job.status === 'active' ? 'green' :
              job.status === 'draft' ? 'gray' :
              job.status === 'paused' ? 'orange' : 'red'
            } fontSize="md">
              {job.status}
            </Badge>
            {job.is_public && <Badge colorScheme="blue" fontSize="md">Public</Badge>}
          </HStack>
          <HStack spacing={4} color="gray.600">
            <Text>📍 {job.location}</Text>
            <Text>💼 {job.job_type.replace('_', ' ')}</Text>
            {job.department && <Text>🏢 {job.department}</Text>}
          </HStack>
        </Box>

        <VStack align="stretch" spacing={2}>
          {job.status === 'draft' && (
            <Button colorScheme="green" onClick={handlePublish}>
              Publish Job
            </Button>
          )}
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline">
              Change Status
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => handleStatusChange('active')}>Active</MenuItem>
              <MenuItem onClick={() => handleStatusChange('paused')}>Paused</MenuItem>
              <MenuItem onClick={() => handleStatusChange('closed')}>Closed</MenuItem>
            </MenuList>
          </Menu>
          {job.application_form_id && (
            <>
              {job.is_public && job.status === 'active' ? (
                <Button
                  leftIcon={<ExternalLinkIcon />}
                  variant="outline"
                  onClick={() => window.open(`/public/forms/${job.application_form_id}`, '_blank')}
                >
                  Preview Form
                </Button>
              ) : (
                <Button variant="outline" isDisabled>
                  Form Private
                </Button>
              )}
              <Button
                colorScheme="purple"
                variant="outline"
                onClick={() => navigate(`/forms/${job.application_form_id}/edit`)}
              >
                ✏️ Edit Application Form
              </Button>
            </>
          )}
        </VStack>
      </Flex>

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Applicants</StatLabel>
              <StatNumber>{job.applicant_count}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Form Responses</StatLabel>
              <StatNumber>{job.form_responses?.length || 0}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>In Interview</StatLabel>
              <StatNumber>
                {job.candidates?.filter(c => c.current_stage === 'interview').length || 0}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Offers Made</StatLabel>
              <StatNumber>
                {job.candidates?.filter(c => c.current_stage === 'offer').length || 0}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Alert for auto-creation */}
      {job.auto_create_candidates && (
        <Alert status="success" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold">✨ Auto-Creation Enabled</Text>
            <Text fontSize="sm">
              Candidates are automatically created when someone submits the application form
            </Text>
            <Text fontSize="sm">
              ✏️ Click "Edit Application Form" above to customize form fields anytime
            </Text>
          </VStack>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs>
        <TabList>
          <Tab>📋 Job Details</Tab>
          <Tab>👥 Candidates ({job.candidates?.length || 0})</Tab>
          <Tab>📝 Form Responses ({job.form_responses?.length || 0})</Tab>
        </TabList>

        <TabPanels>
          {/* Job Details Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Card>
                <CardBody>
                  <Heading size="md" mb={4}>Description</Heading>
                  <Text whiteSpace="pre-wrap">{job.description}</Text>
                </CardBody>
              </Card>

              {job.responsibilities?.length > 0 && (
                <Card>
                  <CardBody>
                    <Heading size="md" mb={4}>Responsibilities</Heading>
                    <VStack align="start" spacing={2}>
                      {job.responsibilities.map((resp, i) => (
                        <HStack key={i} align="start">
                          <Text>•</Text>
                          <Text>{resp}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              )}

              {job.requirements?.length > 0 && (
                <Card>
                  <CardBody>
                    <Heading size="md" mb={4}>Requirements</Heading>
                    <VStack align="start" spacing={2}>
                      {job.requirements.map((req, i) => (
                        <HStack key={i} align="start">
                          <Text>✓</Text>
                          <Text>{req}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              )}

              {job.salary_min && job.salary_max && (
                <Card>
                  <CardBody>
                    <Heading size="md" mb={4}>Compensation</Heading>
                    <Text fontSize="lg" fontWeight="bold">
                      ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                    </Text>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </TabPanel>

          {/* Candidates Tab */}
          <TabPanel>
            {!job.candidates || job.candidates.length === 0 ? (
              <Card>
                <CardBody>
                  <VStack py={8}>
                    <Text fontSize="lg" color="gray.600">No applicants yet</Text>
                    <Text fontSize="sm" color="gray.500">
                      Candidates will appear here when they apply
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th>Stage</Th>
                        <Th>Score</Th>
                        <Th>Applied</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {job.candidates.map((candidate) => (
                        <Tr
                          key={candidate.id}
                          _hover={{ bg: 'gray.50' }}
                          cursor="pointer"
                          onClick={() => navigate(`/hiring/candidates/${candidate.id}`)}
                        >
                          <Td fontWeight="bold">{candidate.full_name}</Td>
                          <Td>{candidate.email}</Td>
                          <Td>
                            <Badge colorScheme="blue">
                              {candidate.current_stage}
                            </Badge>
                          </Td>
                          <Td>
                            {candidate.overall_score > 0 ? (
                              <Text fontWeight="bold">{candidate.overall_score}</Text>
                            ) : (
                              <Text color="gray.400">—</Text>
                            )}
                          </Td>
                          <Td fontSize="sm">
                            {new Date(candidate.created_at).toLocaleDateString()}
                          </Td>
                          <Td>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/hiring/candidates/${candidate.id}`)
                              }}
                            >
                              View Profile
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            )}
          </TabPanel>

          {/* Form Responses Tab */}
          <TabPanel>
            {!job.form_responses || job.form_responses.length === 0 ? (
              <Card>
                <CardBody>
                  <VStack py={8}>
                    <Text fontSize="lg" color="gray.600">No form submissions yet</Text>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <VStack spacing={4} align="stretch">
                {job.form_responses.map((response) => (
                  <Card key={response.id}>
                    <CardBody>
                      <Flex justify="space-between" mb={4}>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">
                            {response.payload.full_name || 'Unknown'}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {response.payload.email}
                          </Text>
                        </VStack>
                        <VStack align="end" spacing={0}>
                          <Text fontSize="sm" color="gray.600">Submitted</Text>
                          <Text fontSize="sm">
                            {new Date(response.created_at).toLocaleString()}
                          </Text>
                        </VStack>
                      </Flex>
                      
                      <Divider mb={4} />
                      
                      <SimpleGrid columns={2} spacing={4}>
                        {Object.entries(response.payload).map(([key, value]) => {
                          if (key === 'full_name' || key === 'email') return null
                          return (
                            <Box key={key}>
                              <Text fontSize="sm" fontWeight="bold" color="gray.600">
                                {key.replace(/_/g, ' ').toUpperCase()}
                              </Text>
                              <Text>{value || '—'}</Text>
                            </Box>
                          )
                        })}
                      </SimpleGrid>

                      {response.candidate_id && (
                        <Button
                          mt={4}
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/hiring/candidates/${response.candidate_id}`)}
                        >
                          View Candidate Profile
                        </Button>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}
