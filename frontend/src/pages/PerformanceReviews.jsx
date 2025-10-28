import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Button, Stack, Grid, Card, CardBody, CardHeader,
  Text, Badge, useToast, Flex, HStack, VStack, Icon, Select, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, useDisclosure, FormControl, FormLabel, Input,
  Tabs, TabList, TabPanels, Tab, TabPanel, SimpleGrid, Progress,
  Table, Thead, Tbody, Tr, Th, Td, Avatar, Stat, StatLabel, StatNumber,
  StatHelpText, IconButton, Slider, SliderTrack, SliderFilledTrack, SliderThumb
} from '@chakra-ui/react';
import { FaStar, FaPlus, FaEye, FaEdit, FaCheckCircle, FaClock, FaTrophy, FaChartLine } from 'react-icons/fa';
import api from '../api/client';

export default function PerformanceReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const toast = useToast();

  // Form state for new review
  const [employeeId, setEmployeeId] = useState('');
  const [reviewType, setReviewType] = useState('self_assessment');
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [overallRating, setOverallRating] = useState(3);
  const [technicalRating, setTechnicalRating] = useState(3);
  const [communicationRating, setCommunicationRating] = useState(3);
  const [teamworkRating, setTeamworkRating] = useState(3);
  const [leadershipRating, setLeadershipRating] = useState(3);
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reviewsRes, statsRes, usersRes] = await Promise.all([
        api.get('/performance/reviews/'),
        api.get('/performance/reviews/stats'),
        api.get('/users/')
      ]);
      setReviews(reviewsRes.data);
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

  const handleCreateReview = async () => {
    try {
      // Convert date strings to ISO datetime format
      const startDateTime = periodStart ? new Date(periodStart + 'T00:00:00').toISOString() : null;
      const endDateTime = periodEnd ? new Date(periodEnd + 'T23:59:59').toISOString() : null;
      
      await api.post('/performance/reviews/', {
        employee_id: employeeId,
        review_type: reviewType,
        title,
        period_start: startDateTime,
        period_end: endDateTime
      });
      toast({
        title: 'Review created successfully',
        status: 'success',
        duration: 3000
      });
      onClose();
      fetchData();
      resetForm();
    } catch (err) {
      toast({
        title: 'Error creating review',
        description: err.response?.data?.detail,
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleUpdateReview = async (reviewId) => {
    try {
      await api.patch(`/performance/reviews/${reviewId}`, {
        overall_rating: overallRating,
        technical_skills_rating: technicalRating,
        communication_rating: communicationRating,
        teamwork_rating: teamworkRating,
        leadership_rating: leadershipRating,
        comments,
        status: 'submitted'
      });
      toast({
        title: 'Review updated successfully',
        status: 'success',
        duration: 3000
      });
      onViewClose();
      fetchData();
    } catch (err) {
      toast({
        title: 'Error updating review',
        description: err.response?.data?.detail,
        status: 'error',
        duration: 3000
      });
    }
  };

  const resetForm = () => {
    setEmployeeId('');
    setReviewType('self_assessment');
    setTitle('');
    setPeriodStart('');
    setPeriodEnd('');
    setOverallRating(3);
    setComments('');
  };

  const openViewReview = (review) => {
    setSelectedReview(review);
    setOverallRating(review.overall_rating || 3);
    setTechnicalRating(review.technical_skills_rating || 3);
    setCommunicationRating(review.communication_rating || 3);
    setTeamworkRating(review.teamwork_rating || 3);
    setLeadershipRating(review.leadership_rating || 3);
    setComments(review.comments || '');
    onViewOpen();
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'gray',
      submitted: 'blue',
      in_review: 'orange',
      completed: 'green',
      approved: 'purple'
    };
    return colors[status] || 'gray';
  };

  const getReviewTypeLabel = (type) => {
    const labels = {
      self_assessment: 'Self Assessment',
      manager_review: 'Manager Review',
      peer_review: 'Peer Review',
      annual: 'Annual Review',
      quarterly: 'Quarterly Review',
      mid_year: 'Mid-Year Review'
    };
    return labels[type] || type;
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId || u._id === userId);
    return user?.full_name || 'Unknown';
  };

  const RatingSlider = ({ label, value, onChange }) => (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <HStack spacing={4}>
        <Slider value={value} min={1} max={5} step={1} onChange={onChange}>
          <SliderTrack>
            <SliderFilledTrack bg="purple.500" />
          </SliderTrack>
          <SliderThumb boxSize={6}>
            <Text fontSize="xs" fontWeight="bold">{value}</Text>
          </SliderThumb>
        </Slider>
        <Text minW="40px" fontWeight="bold" color="purple.500">{value}/5</Text>
      </HStack>
    </FormControl>
  );

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
          <Heading size="xl">📈 Performance Reviews</Heading>
          <Text color="gray.600">360-degree feedback and evaluations</Text>
        </VStack>
        <Button
          leftIcon={<FaPlus />}
          colorScheme="purple"
          onClick={onOpen}
        >
          New Review
        </Button>
      </Flex>

      {/* Stats Cards */}
      {stats && (
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Reviews</StatLabel>
                <StatNumber>{stats.total_reviews}</StatNumber>
                <StatHelpText>All time</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Completed</StatLabel>
                <StatNumber>{stats.completed}</StatNumber>
                <StatHelpText>
                  <Icon as={FaCheckCircle} color="green.500" mr={1} />
                  Finished
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Average Rating</StatLabel>
                <StatNumber color="purple.500">{stats.average_rating}</StatNumber>
                <StatHelpText>
                  <Icon as={FaStar} color="yellow.500" mr={1} />
                  Out of 5.0
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Pending</StatLabel>
                <StatNumber color="orange.500">{stats.pending}</StatNumber>
                <StatHelpText>
                  <Icon as={FaClock} color="orange.500" mr={1} />
                  In draft
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Tabs for filtering */}
      <Tabs colorScheme="purple">
        <TabList>
          <Tab>All Reviews</Tab>
          <Tab>Self Assessments</Tab>
          <Tab>Manager Reviews</Tab>
          <Tab>Peer Reviews</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <ReviewsTable reviews={reviews} openViewReview={openViewReview} getUserName={getUserName} getStatusColor={getStatusColor} getReviewTypeLabel={getReviewTypeLabel} />
          </TabPanel>
          <TabPanel px={0}>
            <ReviewsTable reviews={reviews.filter(r => r.review_type === 'self_assessment')} openViewReview={openViewReview} getUserName={getUserName} getStatusColor={getStatusColor} getReviewTypeLabel={getReviewTypeLabel} />
          </TabPanel>
          <TabPanel px={0}>
            <ReviewsTable reviews={reviews.filter(r => r.review_type === 'manager_review')} openViewReview={openViewReview} getUserName={getUserName} getStatusColor={getStatusColor} getReviewTypeLabel={getReviewTypeLabel} />
          </TabPanel>
          <TabPanel px={0}>
            <ReviewsTable reviews={reviews.filter(r => r.review_type === 'peer_review')} openViewReview={openViewReview} getUserName={getUserName} getStatusColor={getStatusColor} getReviewTypeLabel={getReviewTypeLabel} />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Create Review Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Review</ModalHeader>
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
                <FormLabel>Review Type</FormLabel>
                <Select value={reviewType} onChange={(e) => setReviewType(e.target.value)}>
                  <option value="self_assessment">Self Assessment</option>
                  <option value="manager_review">Manager Review</option>
                  <option value="peer_review">Peer Review</option>
                  <option value="quarterly">Quarterly Review</option>
                  <option value="annual">Annual Review</option>
                  <option value="mid_year">Mid-Year Review</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  placeholder="e.g., Q4 2024 Performance Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormControl>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl isRequired>
                  <FormLabel>Period Start</FormLabel>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Period End</FormLabel>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </FormControl>
              </Grid>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateReview}>
              Create Review
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View/Edit Review Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedReview && (
              <VStack align="flex-start" spacing={2}>
                <Text>{selectedReview.title}</Text>
                <HStack>
                  <Badge colorScheme={getStatusColor(selectedReview.status)}>
                    {selectedReview.status}
                  </Badge>
                  <Badge colorScheme="blue">
                    {getReviewTypeLabel(selectedReview.review_type)}
                  </Badge>
                </HStack>
              </VStack>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={6}>
              <RatingSlider
                label="Overall Performance"
                value={overallRating}
                onChange={setOverallRating}
              />
              <RatingSlider
                label="Technical Skills"
                value={technicalRating}
                onChange={setTechnicalRating}
              />
              <RatingSlider
                label="Communication"
                value={communicationRating}
                onChange={setCommunicationRating}
              />
              <RatingSlider
                label="Teamwork"
                value={teamworkRating}
                onChange={setTeamworkRating}
              />
              <RatingSlider
                label="Leadership"
                value={leadershipRating}
                onChange={setLeadershipRating}
              />

              <FormControl>
                <FormLabel>Comments & Feedback</FormLabel>
                <Textarea
                  placeholder="Share detailed feedback, achievements, and areas for improvement..."
                  rows={6}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onViewClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={() => handleUpdateReview(selectedReview._id)}
            >
              Submit Review
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

function ReviewsTable({ reviews, openViewReview, getUserName, getStatusColor, getReviewTypeLabel }) {
  return (
    <Card>
      <CardBody p={0}>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Employee</Th>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Period</Th>
              <Th>Rating</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {reviews.length === 0 ? (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8} color="gray.500">
                  No reviews found
                </Td>
              </Tr>
            ) : (
              reviews.map((review) => (
                <Tr key={review._id}>
                  <Td>
                    <HStack>
                      <Avatar size="sm" name={getUserName(review.employee_id)} />
                      <Text>{getUserName(review.employee_id)}</Text>
                    </HStack>
                  </Td>
                  <Td>{review.title}</Td>
                  <Td>
                    <Badge colorScheme="blue">
                      {getReviewTypeLabel(review.review_type)}
                    </Badge>
                  </Td>
                  <Td fontSize="sm" color="gray.600">
                    {new Date(review.period_start).toLocaleDateString()} - {new Date(review.period_end).toLocaleDateString()}
                  </Td>
                  <Td>
                    {review.overall_rating ? (
                      <HStack>
                        <Icon as={FaStar} color="yellow.500" />
                        <Text fontWeight="bold">{review.overall_rating}/5</Text>
                      </HStack>
                    ) : (
                      <Text color="gray.400">Not rated</Text>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(review.status)}>
                      {review.status}
                    </Badge>
                  </Td>
                  <Td>
                    <IconButton
                      icon={<FaEye />}
                      size="sm"
                      colorScheme="purple"
                      variant="ghost"
                      onClick={() => openViewReview(review)}
                    />
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </CardBody>
    </Card>
  );
}
