import React, { useEffect, useState } from 'react'
import { Box, Button, Container, Heading, Input, Stack, Table, Tbody, Td, Th, Thead, Tr, useToast, Switch, HStack, Text, IconButton } from '@chakra-ui/react'
import { Link, useNavigate } from 'react-router-dom'
import { CopyIcon, EditIcon } from '@chakra-ui/icons'
import api from '../api/client'

export default function Forms() {
  const [forms, setForms] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/forms/')
      setForms(data)
    } catch {
      toast({ title: 'Failed to load forms', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createForm = async (e) => {
    e.preventDefault()
    try {
      const schema = { fields: [] }
      const { data } = await api.post('/forms/', { name, schema, published: false })
      setName('')
      toast({ title: 'Form created', status: 'success' })
      navigate(`/forms/${data.id}/edit`)
    } catch {
      toast({ title: 'Create form failed', status: 'error' })
    }
  }

  const togglePublish = async (form) => {
    try {
      const updated = await api.patch(`/forms/${form.id}`, { published: !form.published })
      toast({ title: updated.data.published ? 'Form published' : 'Form unpublished', status: 'success' })
      load()
    } catch {
      toast({ title: 'Update failed', status: 'error' })
    }
  }

  const copyLink = async (id) => {
    const url = `${window.location.origin}/public/forms/${id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Public link copied', description: url, status: 'success' })
    } catch {
      toast({ title: 'Copy failed', status: 'error' })
    }
  }

  return (
    <Container maxW="6xl" py={8}>
      <Heading size="lg" mb={6}>Forms</Heading>
      <Box as="form" onSubmit={createForm} bg="white" p={4} border="1px" borderColor="gray.200" rounded="md" mb={6}>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
          <Input placeholder="Form name" value={name} onChange={(e)=>setName(e.target.value)} required />
          <Button type="submit" colorScheme="blue">Create</Button>
        </Stack>
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Published</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {forms.map((f) => (
              <Tr key={f.id}>
                <Td>{f.id}</Td>
                <Td>{f.name}</Td>
                <Td>
                  <HStack>
                    <Switch isChecked={f.published} onChange={() => togglePublish(f)} />
                    <Text fontSize="sm" color="gray.500">{f.published ? 'On' : 'Off'}</Text>
                  </HStack>
                </Td>
                <Td>
                  <HStack>
                    <IconButton aria-label="Edit" icon={<EditIcon />} size="sm" as={Link} to={`/forms/${f.id}/edit`} />
                    <Button size="sm" onClick={() => copyLink(f.id)} leftIcon={<CopyIcon />}>Public link</Button>
                    <Button size="sm" as={Link} to={`/forms/${f.id}/responses`}>Responses</Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  )
}
