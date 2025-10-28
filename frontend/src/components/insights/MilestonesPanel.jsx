import React from 'react'
import {
  VStack, HStack, Card, CardBody, Heading, Text, Badge,
  Progress, Alert, AlertIcon
} from '@chakra-ui/react'
import { FaFlag } from 'react-icons/fa'
import { format, parseISO } from 'date-fns'

export default function MilestonesPanel({ milestones }) {
  return (
    <VStack spacing={4} align="stretch">
      {milestones.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          No milestones found for this repository
        </Alert>
      ) : (
        milestones.map((milestone) => (
          <Card key={milestone.id}>
            <CardBody>
              <HStack justify="space-between" mb={2}>
                <VStack align="start" spacing={1}>
                  <HStack>
                    <FaFlag />
                    <Heading size="sm">{milestone.title}</Heading>
                    <Badge colorScheme={milestone.state === 'open' ? 'green' : 'gray'}>
                      {milestone.state}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">{milestone.description}</Text>
                </VStack>
                <VStack align="end" spacing={0}>
                  <Text fontWeight="bold">{milestone.progress_percentage.toFixed(0)}%</Text>
                  <Text fontSize="sm" color="gray.600">
                    {milestone.closed_issues}/{milestone.closed_issues + milestone.open_issues} issues
                  </Text>
                </VStack>
              </HStack>
              <Progress 
                value={milestone.progress_percentage} 
                size="sm" 
                colorScheme="green"
                borderRadius="full"
              />
              {milestone.due_on && (
                <Text fontSize="xs" color="gray.500" mt={2}>
                  Due: {format(parseISO(milestone.due_on), 'PPP')}
                </Text>
              )}
            </CardBody>
          </Card>
        ))
      )}
    </VStack>
  )
}
