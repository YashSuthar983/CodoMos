import React from 'react'
import {
  VStack, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, Card, CardHeader, CardBody, Heading, HStack, Tag,
  TagLabel, Box, Text, Avatar, Badge
} from '@chakra-ui/react'
import {
  FaStar, FaCodeBranch, FaEye, FaExclamationCircle
} from 'react-icons/fa'
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

const getLanguageColor = (language) => {
  const colors = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3776ab',
    Java: '#007396',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#CC342D',
    PHP: '#777BB4',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    HTML: '#e34c26',
    CSS: '#563d7c'
  }
  return colors[language] || '#6e7681'
}

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export default function OverviewPanel({ data }) {
  const { metadata, commitVelocity, activities } = data

  return (
    <VStack spacing={6} align="stretch">
      {/* Repository Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Stat>
          <StatLabel><FaStar /> Stars</StatLabel>
          <StatNumber>{formatNumber(metadata?.stars_count || 0)}</StatNumber>
          <StatHelpText>
            <StatArrow type="increase" />
            23% this month
          </StatHelpText>
        </Stat>
        <Stat>
          <StatLabel><FaCodeBranch /> Forks</StatLabel>
          <StatNumber>{formatNumber(metadata?.forks_count || 0)}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel><FaEye /> Watchers</StatLabel>
          <StatNumber>{formatNumber(metadata?.watchers_count || 0)}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel><FaExclamationCircle /> Open Issues</StatLabel>
          <StatNumber>{metadata?.open_issues_count || 0}</StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Language Breakdown */}
      {metadata?.languages && Object.keys(metadata.languages).length > 0 && (
        <Card>
          <CardHeader>
            <Heading size="md">Language Distribution</Heading>
          </CardHeader>
          <CardBody>
            <HStack spacing={2} mb={4} flexWrap="wrap">
              {Object.entries(metadata.languages)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([lang, bytes]) => {
                  const total = Object.values(metadata.languages).reduce((a, b) => a + b, 0)
                  const percentage = (bytes / total) * 100
                  return (
                    <Tag key={lang} size="lg" variant="subtle">
                      <Box
                        w={3}
                        h={3}
                        borderRadius="full"
                        bg={getLanguageColor(lang)}
                        mr={2}
                      />
                      <TagLabel>{lang} ({percentage.toFixed(1)}%)</TagLabel>
                    </Tag>
                  )
                })}
            </HStack>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={Object.entries(metadata.languages).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.keys(metadata.languages).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getLanguageColor(entry)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Commit Velocity Chart */}
      {commitVelocity && (
        <Card>
          <CardHeader>
            <Heading size="md">Commit Velocity</Heading>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={commitVelocity.buckets}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period_start" 
                  tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(parseISO(value), 'PPP')}
                />
                <Area
                  type="monotone"
                  dataKey="commit_count"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorCommits)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Recent Activity Feed */}
      {activities && activities.length > 0 && (
        <Card>
          <CardHeader>
            <Heading size="md">Recent Activity</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {activities.slice(0, 10).map((activity, idx) => (
                <HStack key={idx} p={2} borderBottom="1px" borderColor="gray.100">
                  <Avatar size="sm" name={activity.actor_login} src={activity.actor_avatar} />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" fontWeight="medium">{activity.title}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {activity.actor_login} • {format(parseISO(activity.occurred_at), 'PPp')}
                    </Text>
                  </VStack>
                  <Badge colorScheme={
                    activity.event_type === 'pr_merged' ? 'purple' :
                    activity.event_type === 'issue_closed' ? 'green' :
                    activity.event_type === 'commit' ? 'blue' : 'gray'
                  }>
                    {activity.event_type}
                  </Badge>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  )
}
