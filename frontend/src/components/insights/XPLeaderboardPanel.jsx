import React, { useState } from 'react'
import {
  VStack, HStack, Card, CardHeader, CardBody, Heading,
  Select, Text, Box, Tag
} from '@chakra-ui/react'
import { FaTrophy } from 'react-icons/fa'
import api from '../../api/client'

export default function XPLeaderboardPanel({ leaderboard: initialLeaderboard }) {
  const [period, setPeriod] = useState('monthly')
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard)

  const handlePeriodChange = async (e) => {
    const newPeriod = e.target.value
    setPeriod(newPeriod)
    try {
      const response = await api.get(`/github-insights/xp/leaderboard?period=${newPeriod}`)
      setLeaderboard(response.data)
    } catch (err) {
      // Silently ignore for now; the main page toasts on data load failures
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">XP Leaderboard</Heading>
            <Select 
              size="sm" 
              maxW="150px" 
              value={period}
              onChange={handlePeriodChange}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all-time">All Time</option>
            </Select>
          </HStack>
        </CardHeader>
        <CardBody>
          {leaderboard?.entries?.length > 0 ? (
            <VStack align="stretch" spacing={3}>
              {leaderboard.entries.map((entry, idx) => (
                <HStack 
                  key={idx} 
                  p={3} 
                  borderRadius="md" 
                  bg={idx < 3 ? 'yellow.50' : 'gray.50'}
                >
                  <Box minW="30px">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </Box>
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontWeight="medium">{entry.login}</Text>
                    <HStack spacing={2}>
                      {entry.skill_breakdown && Object.entries(entry.skill_breakdown).slice(0, 3).map(([skill, xp]) => (
                        <Tag key={skill} size="sm">{skill}</Tag>
                      ))}
                    </HStack>
                  </VStack>
                  <VStack align="end" spacing={0}>
                    <HStack>
                      <FaTrophy color="gold" />
                      <Text fontWeight="bold">{entry.total_xp} XP</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">
                      {entry.event_count} contributions
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500">No XP data available yet</Text>
          )}
          
          {leaderboard && (
            <VStack mt={6} pt={4} borderTop="1px" borderColor="gray.200">
              <Text fontSize="sm" color="gray.600">
                Period: {leaderboard.period} • Total XP Awarded: {leaderboard.total_xp_awarded}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {leaderboard.total_participants} participants
              </Text>
            </VStack>
          )}
        </CardBody>
      </Card>
    </VStack>
  )
}
