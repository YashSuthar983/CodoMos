import React, { useEffect, useState } from 'react'
import { Box, Button, Container, Heading, Input, Stack, Table, Tbody, Td, Th, Thead, Tr, Textarea, useToast } from '@chakra-ui/react'
import api from '../api/client'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skillsText, setSkillsText] = useState('')
  const toast = useToast()

  const load = async () => {
    try {
      const { data } = await api.get('/roles/')
      setRoles(data)
    } catch {
      toast({ title: 'Failed to load roles', status: 'error' })
    }
  }

  useEffect(() => { load() }, [])

  const addRole = async (e) => {
    e.preventDefault()
    try {
      let skill_requirements = undefined
      if (skillsText.trim()) {
        try {
          skill_requirements = JSON.parse(skillsText)
        } catch {
          toast({ title: 'Skills must be valid JSON (e.g., {"React":3,"Node":2})', status: 'warning' })
          return
        }
      }
      await api.post('/roles/', { title, description, skill_requirements })
      setTitle(''); setDescription(''); setSkillsText('')
      toast({ title: 'Role created', status: 'success' })
      load()
    } catch {
      toast({ title: 'Create failed', status: 'error' })
    }
  }

  return (
    <Container maxW="6xl" py={8}>
      <Heading size="lg" mb={6}>Roles</Heading>
      <Box as="form" onSubmit={addRole} bg="white" p={4} border="1px" borderColor="gray.200" rounded="md" mb={6}>
        <Stack spacing={3}>
          <Input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} required />
          <Input placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
          <Textarea placeholder='Skill requirements JSON (e.g., {"React":3,"Node":2})' value={skillsText} onChange={(e)=>setSkillsText(e.target.value)} />
          <Button type="submit" colorScheme="blue">Create Role</Button>
        </Stack>
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Title</Th>
              <Th>Description</Th>
              <Th>Skill requirements</Th>
            </Tr>
          </Thead>
          <Tbody>
            {roles.map((r) => (
              <Tr key={r.id}>
                <Td>{r.id}</Td>
                <Td>{r.title}</Td>
                <Td>{r.description || '-'}</Td>
                <Td><pre style={{whiteSpace:'pre-wrap'}}>{r.skill_requirements ? JSON.stringify(r.skill_requirements, null, 2) : '-'}</pre></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  )
}
