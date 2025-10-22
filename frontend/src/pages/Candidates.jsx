import React, { useEffect, useState } from 'react'
import { Box, Button, Container, Flex, Heading, Input, Select, Stack, Table, Tbody, Td, Th, Thead, Tr, useToast, Textarea } from '@chakra-ui/react'
import api from '../api/client'

export default function Candidates() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [statusMap, setStatusMap] = useState({})
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/candidates/')
      setCandidates(data)
      const map = {}
      data.forEach((c) => { map[c.id] = c.status })
      setStatusMap(map)
    } catch (e) {
      toast({ title: 'Failed to load candidates', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const addCandidate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/candidates/', { name, email, resume_text: resumeText })
      setName(''); setEmail(''); setResumeText('')
      toast({ title: 'Candidate added', status: 'success' })
      load()
    } catch (e) {
      toast({ title: 'Failed to add candidate', status: 'error' })
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/candidates/${id}`, { status })
      toast({ title: 'Status updated', status: 'success' })
      load()
    } catch {
      toast({ title: 'Update failed', status: 'error' })
    }
  }

  const statuses = ['applied', 'screened', 'interview', 'offer', 'hired', 'rejected']

  return (
    <Container maxW="6xl" py={8}>
      <Heading size="lg" mb={6}>Candidates</Heading>
      <Box as="form" onSubmit={addCandidate} bg="white" p={4} border="1px" borderColor="gray.200" rounded="md" mb={6}>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <Input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} required />
          <Input placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Button type="submit" colorScheme="blue">Add Candidate</Button>
        </Stack>
        <Textarea placeholder="Resume text (optional)" mt={3} value={resumeText} onChange={(e)=>setResumeText(e.target.value)} />
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Score</Th>
            </Tr>
          </Thead>
          <Tbody>
            {candidates.map((c) => (
              <Tr key={c.id}>
                <Td>{c.id}</Td>
                <Td>{c.name}</Td>
                <Td>{c.email || '-'}</Td>
                <Td>
                  <Select size="sm" value={statusMap[c.id] || c.status} onChange={(e) => updateStatus(c.id, e.target.value)}>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Td>
                <Td>{c.score?.toFixed?.(1) || 0}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  )
}
