import React from 'react'
import {
  VStack, HStack, SimpleGrid, Stat, StatLabel, StatNumber,
  Tabs, TabList, Tab, TabPanels, TabPanel, Card, CardBody,
  Text, Badge, Tag
} from '@chakra-ui/react'
import { FaBug } from 'react-icons/fa'
import { BiGitPullRequest } from 'react-icons/bi'
import { differenceInDays, parseISO } from 'date-fns'

export default function IssuesAndPRsPanel({ issues, pullRequests, prStats }) {
  return (
    <VStack spacing={6} align="stretch">
      {/* PR Review Stats */}
      {prStats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat>
            <StatLabel>Approval Rate</StatLabel>
            <StatNumber>{prStats.approval_rate.toFixed(1)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Avg Time to Merge</StatLabel>
            <StatNumber>{prStats.avg_time_to_merge_hours.toFixed(1)}h</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Avg Reviews/PR</StatLabel>
            <StatNumber>{prStats.avg_reviews_per_pr.toFixed(1)}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Review Response</StatLabel>
            <StatNumber>{prStats.avg_review_response_hours.toFixed(1)}h</StatNumber>
          </Stat>
        </SimpleGrid>
      )}

      <Tabs>
        <TabList>
          <Tab>Open Issues ({issues.filter(i => i.state === 'open').length})</Tab>
          <Tab>Pull Requests ({pullRequests.filter(pr => pr.state === 'open').length})</Tab>
        </TabList>
        
        <TabPanels>
          {/* Issues Tab */}
          <TabPanel>
            <VStack align="stretch" spacing={3}>
              {issues.filter(i => i.state === 'open').slice(0, 10).map((issue) => (
                <Card key={issue.id} size="sm">
                  <CardBody>
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <FaBug color="#d73a49" />
                        <Text fontWeight="medium">#{issue.number}</Text>
                        <Text>{issue.title}</Text>
                      </HStack>
                      {issue.is_stale && <Badge colorScheme="orange">Stale</Badge>}
                    </HStack>
                    <HStack spacing={2}>
                      {issue.labels.map((label, idx) => (
                        <Tag key={idx} size="sm">{label}</Tag>
                      ))}
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      Opened by {issue.author_login} • {differenceInDays(new Date(), parseISO(issue.created_at))} days ago
                    </Text>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </TabPanel>
          
          {/* Pull Requests Tab */}
          <TabPanel>
            <VStack align="stretch" spacing={3}>
              {pullRequests.filter(pr => pr.state === 'open').slice(0, 10).map((pr) => (
                <Card key={pr.id} size="sm">
                  <CardBody>
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <BiGitPullRequest color="#28a745" />
                        <Text fontWeight="medium">#{pr.number}</Text>
                        <Text>{pr.title}</Text>
                      </HStack>
                      <HStack>
                        {pr.merged && <Badge colorScheme="purple">Merged</Badge>}
                        <Badge colorScheme="green">+{pr.additions}</Badge>
                        <Badge colorScheme="red">-{pr.deletions}</Badge>
                      </HStack>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="xs">
                        {pr.head_branch} → {pr.base_branch}
                      </Text>
                      {pr.approved_count > 0 && (
                        <Badge colorScheme="green" fontSize="xs">
                          {pr.approved_count} approved
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      By {pr.author_login} • {pr.commits_count} commits • {pr.changed_files} files
                    </Text>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  )
}
