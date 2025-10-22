import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import api from '../api/client'
import { Box, Button, Container, Heading, Table, Thead, Tr, Th, Tbody, Td, Text, useToast, HStack } from '@chakra-ui/react'

export default function FormResponses() {
  const { id } = useParams()
  const toast = useToast()
  const [responses, setResponses] = useState([])

  const load = async () => {
    try {
      const { data } = await api.get(`/forms/${id}/responses`)
      setResponses(data)
    } catch (e) {
      toast({ title: 'Failed to load responses', status: 'error' })
    }
  }

  useEffect(() => { load() }, [id])

  return (
    <Container maxW="6xl" py={8}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Responses for Form #{id}</Heading>
        <Button as={RouterLink} to={`/forms/${id}/edit`} variant="outline">Back to Builder</Button>
      </HStack>
      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Mapped Entity</Th>
              <Th>Payload</Th>
            </Tr>
          </Thead>
          <Tbody>
            {responses.map((r) => (
              <Tr key={r.id}>
                <Td>{r.id}</Td>
                <Td><pre style={{ whiteSpace: 'pre-wrap' }}>{r.mapped_entity ? JSON.stringify(r.mapped_entity, null, 2) : '-'}</pre></Td>
                <Td><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.payload, null, 2)}</pre></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  )
}
