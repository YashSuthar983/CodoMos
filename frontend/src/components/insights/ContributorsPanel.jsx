import React from 'react'
import {
  VStack, HStack, SimpleGrid, Stat, StatLabel, StatNumber,
  Card, CardHeader, CardBody, Heading, Tag, TagLabel,
  Text, Avatar, Badge
} from '@chakra-ui/react'

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export default function ContributorsPanel({ contributors, contributorAnalytics }) {
  return (
    <VStack spacing={6} align="stretch">
      {/* Contributor Analytics Summary */}
      {contributorAnalytics && (
        <Card>
          <CardHeader>
            <Heading size="md">Contributor Analytics</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
              <Stat>
                <StatLabel>Total Contributors</StatLabel>
                <StatNumber>{contributorAnalytics.total_contributors}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Active Contributors</StatLabel>
                <StatNumber>{contributorAnalytics.active_contributors}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Collaboration Index</StatLabel>
                <StatNumber>{contributorAnalytics.collaboration_index.toFixed(2)}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Commits</StatLabel>
                <StatNumber>{formatNumber(contributorAnalytics.contribution_totals.commits)}</StatNumber>
              </Stat>
            </SimpleGrid>
            
            {/* Skill Distribution */}
            {Object.keys(contributorAnalytics.skill_distribution).length > 0 && (
              <>
                <Heading size="sm" mb={3}>Skill Distribution</Heading>
                <HStack spacing={2} mb={4} flexWrap="wrap">
                  {Object.entries(contributorAnalytics.skill_distribution).map(([skill, count]) => (
                    <Tag key={skill} size="lg">
                      <TagLabel>{skill} ({count})</TagLabel>
                    </Tag>
                  ))}
                </HStack>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Contributors List */}
      <Card>
        <CardHeader>
          <Heading size="md">Top Contributors</Heading>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={3}>
            {contributors.slice(0, 10).map((contributor, idx) => (
              <HStack key={contributor.id} p={3} borderRadius="md" bg="gray.50">
                <Text fontWeight="bold" color="gray.600" minW="20px">
                  #{idx + 1}
                </Text>
                <Avatar size="md" name={contributor.login} src={contributor.avatar_url} />
                <VStack align="start" spacing={0} flex={1}>
                  <HStack>
                    <Text fontWeight="medium">{contributor.login}</Text>
                    {contributor.is_active ? (
                      <Badge colorScheme="green">Active</Badge>
                    ) : (
                      <Badge colorScheme="gray">Inactive</Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    {contributor.name || contributor.email || 'No additional info'}
                  </Text>
                </VStack>
                <VStack align="end" spacing={0}>
                  <Text fontWeight="bold">{contributor.commits_count} commits</Text>
                  <HStack spacing={4} fontSize="sm" color="gray.600">
                    <Text>{contributor.prs_merged} PRs</Text>
                    <Text>{contributor.issues_closed} issues</Text>
                    <Text>{contributor.reviews_given} reviews</Text>
                  </HStack>
                </VStack>
              </HStack>
            ))}
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  )
}
