import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Button, Stack, Card, CardBody, CardHeader,
  Text, Badge, useToast, Flex, HStack, VStack, Icon, Select, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, useDisclosure, FormControl, FormLabel, Input,
  SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Avatar,
  Divider, List, ListItem, ListIcon, Checkbox, IconButton, Grid
} from '@chakra-ui/react';
import { 
  FaPlus, FaEye, FaCalendarAlt, FaCheckCircle, FaClock, 
  FaUsers, FaClipboardList, FaTasks, FaEdit 
} from 'react-icons/fa';
import api from '../api/client';

export default function OneOnOneMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const toast = useToast();

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState('');
  const [agendaItems, setAgendaItems] = useState(['']);
  const [managerNotes, setManagerNotes] = useState('');
  const [employeeNotes, setEmployeeNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [meetingsRes, upcomingRes, usersRes] = await Promise.all([
        api.get('/performance/meetings/'),
        api.get('/performance/meetings/upcoming'),
        api.get('/users/')
      ]);
      setMeetings(meetingsRes.data);
      setUpcomingMeetings(upcomingRes.data);
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

  const handleCreateMeeting = async () => {
    try {
      // Convert to ISO datetime format
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      
      await api.post('/performance/meetings/', {
        employee_id: employeeId,
        title,
        scheduled_date: dateTime,
        duration_minutes: parseInt(duration),
        agenda: agendaItems.filter(item => item.trim() !== '')
      });
      toast({
        title: 'Meeting scheduled successfully',
        status: 'success',
        duration: 3000
      });
      onClose();
      fetchData();
      resetForm();
    } catch (err) {
      toast({
        title: 'Error scheduling meeting',
        description: err.response?.data?.detail,
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleUpdateMeeting = async (meetingId, status) => {
    try {
      await api.patch(`/performance/meetings/${meetingId}`, {
        status,
        manager_notes: managerNotes,
        employee_notes: employeeNotes
      });
      toast({
        title: 'Meeting updated',
        status: 'success',
        duration: 3000
      });
      onViewClose();
      fetchData();
    } catch (err) {
      toast({
        title: 'Error updating meeting',
        description: err.response?.data?.detail,
        status: 'error',
        duration: 3000
      });
    }
  };

  const resetForm = () => {
    setEmployeeId('');
    setTitle('');
    setScheduledDate('');
    setScheduledTime('');
    setDuration(30);
    setLocation('');
    setAgendaItems(['']);
    setManagerNotes('');
    setEmployeeNotes('');
  };

  const openViewMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setManagerNotes(meeting.manager_notes || '');
    setEmployeeNotes(meeting.employee_notes || '');
    onViewOpen();
  };

  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, '']);
  };

  const updateAgendaItem = (index, value) => {
    const newAgenda = [...agendaItems];
    newAgenda[index] = value;
    setAgendaItems(newAgenda);
  };

  const removeAgendaItem = (index) => {
    const newAgenda = agendaItems.filter((_, i) => i !== index);
    setAgendaItems(newAgenda);
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'blue',
      completed: 'green',
      cancelled: 'red',
      rescheduled: 'orange'
    };
    return colors[status] || 'gray';
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
          <Heading size="xl">📅 One-on-One Meetings</Heading>
          <Text color="gray.600">Schedule and manage 1:1s with your team</Text>
        </VStack>
        <Button
          leftIcon={<FaPlus />}
          colorScheme="purple"
          onClick={onOpen}
        >
          Schedule Meeting
        </Button>
      </Flex>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Upcoming Meetings</StatLabel>
              <StatNumber color="blue.500">{upcomingMeetings.length}</StatNumber>
              <StatHelpText>
                <Icon as={FaCalendarAlt} color="blue.500" mr={1} />
                Next 30 days
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Meetings</StatLabel>
              <StatNumber>{meetings.length}</StatNumber>
              <StatHelpText>
                <Icon as={FaUsers} color="purple.500" mr={1} />
                All time
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Completed</StatLabel>
              <StatNumber color="green.500">
                {meetings.filter(m => m.status === 'completed').length}
              </StatNumber>
              <StatHelpText>
                <Icon as={FaCheckCircle} color="green.500" mr={1} />
                Finished
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Upcoming Meetings Section */}
      {upcomingMeetings.length > 0 && (
        <Box mb={8}>
          <Heading size="md" mb={4}>🔜 Upcoming Meetings</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            {upcomingMeetings.map((meeting) => (
              <Card
                key={meeting._id}
                borderWidth="2px"
                borderColor="blue.200"
                bg="blue.50"
                cursor="pointer"
                onClick={() => openViewMeeting(meeting)}
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                <CardBody>
                  <Flex justify="space-between" align="flex-start" mb={3}>
                    <VStack align="flex-start" spacing={1}>
                      <Text fontWeight="bold" fontSize="lg">{meeting.title}</Text>
                      <HStack>
                        <Avatar size="xs" name={getUserName(meeting.employee_id)} />
                        <Text fontSize="sm" color="gray.600">
                          {getUserName(meeting.employee_id)}
                        </Text>
                      </HStack>
                    </VStack>
                    <Badge colorScheme="blue">Scheduled</Badge>
                  </Flex>
                  <Divider mb={3} />
                  <SimpleGrid columns={2} spacing={2} fontSize="sm">
                    <HStack>
                      <Icon as={FaCalendarAlt} color="blue.500" />
                      <Text>{new Date(meeting.scheduled_date).toLocaleDateString()}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaClock} color="blue.500" />
                      <Text>{new Date(meeting.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </HStack>
                  </SimpleGrid>
                  {meeting.agenda && meeting.agenda.length > 0 && (
                    <Box mt={3}>
                      <Text fontSize="xs" fontWeight="bold" mb={1}>Agenda:</Text>
                      <List spacing={1}>
                        {meeting.agenda.slice(0, 2).map((item, idx) => (
                          <ListItem key={idx} fontSize="xs" color="gray.600">
                            <ListIcon as={FaClipboardList} color="blue.400" />
                            {item}
                          </ListItem>
                        ))}
                        {meeting.agenda.length > 2 && (
                          <Text fontSize="xs" color="gray.500" ml={5}>
                            +{meeting.agenda.length - 2} more items
                          </Text>
                        )}
                      </List>
                    </Box>
                  )}
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Box>
      )}

      {/* All Meetings Section */}
      <Box>
        <Heading size="md" mb={4}>📋 Meeting History</Heading>
        <Stack spacing={3}>
          {meetings.filter(m => m.status !== 'scheduled' || new Date(m.scheduled_date) < new Date()).map((meeting) => (
            <Card
              key={meeting._id}
              cursor="pointer"
              onClick={() => openViewMeeting(meeting)}
              _hover={{ shadow: 'md' }}
              transition="all 0.2s"
            >
              <CardBody>
                <Flex justify="space-between" align="center">
                  <HStack spacing={4} flex={1}>
                    <Avatar size="sm" name={getUserName(meeting.employee_id)} />
                    <VStack align="flex-start" spacing={0}>
                      <Text fontWeight="bold">{meeting.title}</Text>
                      <Text fontSize="sm" color="gray.600">
                        with {getUserName(meeting.employee_id)}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack spacing={4}>
                    <VStack align="flex-end" spacing={0}>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(meeting.scheduled_date).toLocaleDateString()}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {meeting.duration_minutes} min
                      </Text>
                    </VStack>
                    <Badge colorScheme={getStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                    <IconButton
                      icon={<FaEye />}
                      size="sm"
                      variant="ghost"
                      colorScheme="purple"
                    />
                  </HStack>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </Stack>
      </Box>

      {meetings.length === 0 && (
        <Card>
          <CardBody textAlign="center" py={12}>
            <Icon as={FaCalendarAlt} boxSize={12} color="gray.300" mb={4} />
            <Text color="gray.500">No meetings yet. Schedule your first 1:1!</Text>
          </CardBody>
        </Card>
      )}

      {/* Create Meeting Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Schedule New Meeting</ModalHeader>
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
                <FormLabel>Meeting Title</FormLabel>
                <Input
                  placeholder="e.g., Weekly 1:1 Check-in"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormControl>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl isRequired>
                  <FormLabel>Date</FormLabel>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Time</FormLabel>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </FormControl>
              </Grid>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input
                    placeholder="e.g., Office, Zoom"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </FormControl>
              </Grid>

              <FormControl>
                <FormLabel>Agenda Items</FormLabel>
                <Stack spacing={2}>
                  {agendaItems.map((item, index) => (
                    <Flex key={index} gap={2}>
                      <Input
                        placeholder={`Agenda item ${index + 1}`}
                        value={item}
                        onChange={(e) => updateAgendaItem(index, e.target.value)}
                      />
                      {agendaItems.length > 1 && (
                        <IconButton
                          icon={<Text>✕</Text>}
                          size="sm"
                          onClick={() => removeAgendaItem(index)}
                        />
                      )}
                    </Flex>
                  ))}
                  <Button size="sm" variant="ghost" onClick={addAgendaItem}>
                    + Add Agenda Item
                  </Button>
                </Stack>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateMeeting}>
              Schedule Meeting
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Meeting Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedMeeting && (
              <VStack align="flex-start" spacing={2}>
                <Text>{selectedMeeting.title}</Text>
                <HStack>
                  <Badge colorScheme={getStatusColor(selectedMeeting.status)}>
                    {selectedMeeting.status}
                  </Badge>
                  <Text fontSize="sm" color="gray.600">
                    {new Date(selectedMeeting.scheduled_date).toLocaleDateString()} at{' '}
                    {new Date(selectedMeeting.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </HStack>
              </VStack>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedMeeting && (
              <Stack spacing={6}>
                <Box>
                  <Text fontWeight="bold" mb={2}>Participant</Text>
                  <HStack>
                    <Avatar size="sm" name={getUserName(selectedMeeting.employee_id)} />
                    <Text>{getUserName(selectedMeeting.employee_id)}</Text>
                  </HStack>
                </Box>

                {selectedMeeting.agenda && selectedMeeting.agenda.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Agenda</Text>
                    <List spacing={2}>
                      {selectedMeeting.agenda.map((item, idx) => (
                        <ListItem key={idx}>
                          <ListIcon as={FaClipboardList} color="purple.500" />
                          {item}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                <FormControl>
                  <FormLabel>Manager Notes</FormLabel>
                  <Textarea
                    placeholder="Add your notes from the meeting..."
                    rows={4}
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Employee Notes</FormLabel>
                  <Textarea
                    placeholder="Employee's notes..."
                    rows={4}
                    value={employeeNotes}
                    onChange={(e) => setEmployeeNotes(e.target.value)}
                    isReadOnly={selectedMeeting.status === 'completed'}
                  />
                </FormControl>

                {selectedMeeting.status === 'scheduled' && (
                  <Box>
                    <Text fontWeight="bold" mb={3}>Mark Meeting As:</Text>
                    <SimpleGrid columns={2} spacing={3}>
                      <Button
                        colorScheme="green"
                        onClick={() => handleUpdateMeeting(selectedMeeting._id, 'completed')}
                      >
                        Completed
                      </Button>
                      <Button
                        colorScheme="red"
                        variant="outline"
                        onClick={() => handleUpdateMeeting(selectedMeeting._id, 'cancelled')}
                      >
                        Cancelled
                      </Button>
                    </SimpleGrid>
                  </Box>
                )}
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onViewClose}>
              Close
            </Button>
            {selectedMeeting && selectedMeeting.status !== 'completed' && (
              <Button
                colorScheme="purple"
                onClick={() => handleUpdateMeeting(selectedMeeting._id, selectedMeeting.status)}
              >
                Save Notes
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
