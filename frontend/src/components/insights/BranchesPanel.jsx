import React from 'react'
import {
  VStack, HStack, Text, Badge, Card, CardBody, Table,
  Thead, Tbody, Tr, Th, Td, Tooltip
} from '@chakra-ui/react'
import { FaCodeBranch } from 'react-icons/fa'

export default function BranchesPanel({ branches }) {
  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text>Total Branches: {branches.length}</Text>
        <Badge colorScheme="orange">
          {branches.filter(b => b.is_stale).length} stale branches
        </Badge>
      </HStack>
      
      <Card>
        <CardBody>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Branch</Th>
                <Th>Last Commit</Th>
                <Th>Author</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {branches.map((branch) => (
                <Tr key={branch.id}>
                  <Td>
                    <HStack>
                      <FaCodeBranch />
                      <Text fontWeight={branch.is_default ? 'bold' : 'normal'}>
                        {branch.name}
                      </Text>
                      {branch.is_default && <Badge colorScheme="green">default</Badge>}
                      {branch.is_protected && <Badge colorScheme="blue">protected</Badge>}
                    </HStack>
                  </Td>
                  <Td>
                    <Tooltip label={branch.last_commit_message}>
                      <Text fontSize="xs" isTruncated maxW="200px">
                        {branch.last_commit_sha?.substring(0, 7)}
                      </Text>
                    </Tooltip>
                  </Td>
                  <Td>{branch.last_commit_author}</Td>
                  <Td>
                    {branch.is_stale ? (
                      <Badge colorScheme="orange">Stale</Badge>
                    ) : (
                      <Badge colorScheme="green">Active</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  )
}
