import React from 'react'
import {
  Box, VStack, HStack, Text, Card, CardBody, SimpleGrid, Stat, StatLabel,
  StatNumber, Badge, Divider, Button, Flex, Heading
} from '@chakra-ui/react'

export default function TeamContributionsPanel({ project, memberStats, navigate }) {
  if (!memberStats || !memberStats.members || memberStats.members.length === 0) {
    return (
      <Card>
        <CardBody>
          <Text color="gray.600">No team members found for this project.</Text>
        </CardBody>
      </Card>
    )
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Project Summary */}
      <Card bg="blue.50" borderColor="blue.200" borderWidth={2}>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <Heading size="md">Project: {project.name}</Heading>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Stat>
                <StatLabel>Team Size</StatLabel>
                <StatNumber>{memberStats.member_count}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Project XP</StatLabel>
                <StatNumber color="purple.600">{memberStats.total_project_xp}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Avg XP per Member</StatLabel>
                <StatNumber>
                  {memberStats.member_count > 0 
                    ? Math.round(memberStats.total_project_xp / memberStats.member_count) 
                    : 0}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Project Status</StatLabel>
                <Badge colorScheme={project.status === 'active' ? 'green' : 'gray'} fontSize="lg">
                  {project.status}
                </Badge>
              </Stat>
            </SimpleGrid>
          </VStack>
        </CardBody>
      </Card>

      {/* Team Member Cards */}
      <Box>
        <Heading size="md" mb={4}>Team Member Contributions</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {memberStats.members.map((member, index) => (
            <Card 
              key={member.user_id} 
              variant="outline" 
              bg={index === 0 ? 'purple.50' : 'gray.50'}
              borderColor={index === 0 ? 'purple.300' : 'gray.200'}
              borderWidth={index === 0 ? 2 : 1}
            >
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <HStack spacing={2} mb={1}>
                        <Text fontWeight="bold" fontSize="lg">{member.full_name}</Text>
                        {index === 0 && <Badge colorScheme="purple">🏆 Top Contributor</Badge>}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">{member.position || 'Team Member'}</Text>
                    </Box>
                    <Badge 
                      colorScheme={
                        member.role === 'owner' ? 'purple' : 
                        member.role === 'maintainer' ? 'blue' : 'green'
                      }
                    >
                      {member.role}
                    </Badge>
                  </Flex>
                  
                  <Divider />
                  
                  <SimpleGrid columns={2} spacing={2}>
                    <Stat size="sm">
                      <StatLabel>Total XP</StatLabel>
                      <StatNumber color="purple.500">{member.stats.total_xp}</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel>Events</StatLabel>
                      <StatNumber>{member.stats.xp_events_count}</StatNumber>
                    </Stat>
                  </SimpleGrid>
                  
                  {member.stats.top_skill && (
                    <Box>
                      <Text fontSize="xs" color="gray.600" mb={1}>Top Skill</Text>
                      <Badge colorScheme="cyan" fontSize="sm">{member.stats.top_skill}</Badge>
                    </Box>
                  )}
                  
                  {member.recent_activity && member.recent_activity.length > 0 && (
                    <Box>
                      <Text fontSize="xs" color="gray.600" mb={2}>Recent Activity</Text>
                      <VStack align="stretch" spacing={1}>
                        {member.recent_activity.slice(0, 3).map((activity, idx) => (
                          <Flex key={idx} justify="space-between" fontSize="xs" p={2} bg="white" rounded="md">
                            <Text color="gray.700" isTruncated maxW="150px">{activity.source}</Text>
                            <Badge size="sm" colorScheme="green">+{activity.amount} XP</Badge>
                          </Flex>
                        ))}
                      </VStack>
                    </Box>
                  )}
                  
                  {member.stats.xp_by_skill && Object.keys(member.stats.xp_by_skill).length > 0 && (
                    <Box>
                      <Text fontSize="xs" color="gray.600" mb={2}>Skill Distribution</Text>
                      <VStack align="stretch" spacing={1}>
                        {Object.entries(member.stats.xp_by_skill)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3)
                          .map(([skill, xp]) => (
                            <Flex key={skill} justify="space-between" fontSize="xs">
                              <Text color="gray.700">{skill}</Text>
                              <Text fontWeight="bold" color="purple.600">{xp} XP</Text>
                            </Flex>
                          ))}
                      </VStack>
                    </Box>
                  )}
                  
                  <Divider />
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    colorScheme="blue"
                    onClick={() => navigate(`/users/${member.user_id}/profile`)}
                  >
                    View Full Profile →
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Contribution Chart Summary */}
      <Card>
        <CardBody>
          <Heading size="sm" mb={4}>Contribution Distribution</Heading>
          <VStack align="stretch" spacing={3}>
            {memberStats.members.map((member) => {
              const percentage = memberStats.total_project_xp > 0
                ? ((member.stats.total_xp / memberStats.total_project_xp) * 100).toFixed(1)
                : 0
              
              return (
                <Box key={member.user_id}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="medium">{member.full_name}</Text>
                    <Text fontSize="sm" color="gray.600">{percentage}% ({member.stats.total_xp} XP)</Text>
                  </Flex>
                  <Box w="100%" h="8px" bg="gray.200" rounded="full" overflow="hidden">
                    <Box 
                      h="100%" 
                      bg="purple.500" 
                      w={`${percentage}%`}
                      transition="width 0.3s"
                    />
                  </Box>
                </Box>
              )
            })}
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  )
}
