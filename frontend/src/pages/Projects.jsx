import React, { useEffect, useState } from 'react'
import { Box, Button, Container, Heading, Input, Stack, Table, Tbody, Td, Th, Thead, Tr, useToast, SimpleGrid, Tag, HStack, Text } from '@chakra-ui/react'
import api from '../api/client'

export default function Projects() {
  const [repos, setRepos] = useState([])
  const [projects, setProjects] = useState([])
  const [repoName, setRepoName] = useState('')
  const [repoTags, setRepoTags] = useState('frontend,web')
  const [projectName, setProjectName] = useState('')
  const [selectedRepoIds, setSelectedRepoIds] = useState('')
  const [ghUsername, setGhUsername] = useState('')
  const toast = useToast()

  const load = async () => {
    try {
      const [r, p, me] = await Promise.all([
        api.get('/projects/repos'),
        api.get('/projects/'),
        api.get('/users/me')
      ])
      setRepos(r.data)
      setProjects(p.data)
      setGhUsername(me.data.github_username || '')
    } catch {
      toast({ title: 'Failed to load', status: 'error' })
    }
  }

  useEffect(() => { load() }, [])

  const createRepo = async (e) => {
    e.preventDefault()
    try {
      const tags = repoTags.split(',').map(s => s.trim()).filter(Boolean)
      await api.post('/projects/repos', { name: repoName, tags })
      setRepoName('')
      toast({ title: 'Repo linked', status: 'success' })
      load()
    } catch {
      toast({ title: 'Create repo failed', status: 'error' })
    }
  }

  const createProject = async (e) => {
    e.preventDefault()
    try {
      const repo_ids = selectedRepoIds.split(',').map(s => s.trim()).filter(Boolean)
      await api.post('/projects/', { name: projectName, repo_ids })
      setProjectName(''); setSelectedRepoIds('')
      toast({ title: 'Project created', status: 'success' })
      load()
    } catch {
      toast({ title: 'Create project failed', status: 'error' })
    }
  }

  const saveGithubUsername = async (e) => {
    e.preventDefault()
    try {
      await api.patch('/users/me', { github_username: ghUsername })
      toast({ title: 'GitHub username saved', status: 'success' })
    } catch {
      toast({ title: 'Save failed', status: 'error' })
    }
  }

  const simulatePrMerged = async (repoId) => {
    try {
      const payload = {
        action: 'closed',
        pull_request: { merged: true, user: { login: ghUsername || 'devuser' } },
      }
      await api.post(`/integrations/github/webhook/${repoId}`, payload, { headers: { 'X-GitHub-Event': 'pull_request' } })
      toast({ title: 'Simulated PR merged. XP awarded if user matched.', status: 'success' })
    } catch {
      toast({ title: 'Simulation failed', status: 'error' })
    }
  }

  return (
    <Container maxW="6xl" py={8}>
      <Heading size="lg" mb={6}>Projects & Repos</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
        <Box as="form" onSubmit={createRepo} bg="white" p={4} border="1px" borderColor="gray.200" rounded="md">
          <Heading size="sm" mb={3}>Link a Repo</Heading>
          <Stack spacing={3}>
            <Input placeholder="Repo name (display)" value={repoName} onChange={(e)=>setRepoName(e.target.value)} required />
            <Input placeholder="Tags (comma-separated)" value={repoTags} onChange={(e)=>setRepoTags(e.target.value)} />
            <Button type="submit" colorScheme="blue">Add Repo</Button>
          </Stack>
        </Box>

        <Box as="form" onSubmit={createProject} bg="white" p={4} border="1px" borderColor="gray.200" rounded="md">
          <Heading size="sm" mb={3}>Create Project</Heading>
          <Stack spacing={3}>
            <Input placeholder="Project name" value={projectName} onChange={(e)=>setProjectName(e.target.value)} required />
            <Input placeholder="Repo IDs (comma-separated)" value={selectedRepoIds} onChange={(e)=>setSelectedRepoIds(e.target.value)} />
            <Button type="submit">Create</Button>
          </Stack>
        </Box>
      </SimpleGrid>

      <Box bg="white" p={4} border="1px" borderColor="gray.200" rounded="md" mb={6}>
        <Heading size="sm" mb={2}>Your GitHub Username</Heading>
        <form onSubmit={saveGithubUsername}>
          <HStack>
            <Input placeholder="e.g., octocat" value={ghUsername} onChange={(e)=>setGhUsername(e.target.value)} maxW="300px" />
            <Button type="submit">Save</Button>
            <Text fontSize="sm" color="gray.500">Used to map PRs to your account for XP</Text>
          </HStack>
        </form>
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto" mb={6}>
        <Heading size="sm" p={4} borderBottom="1px" borderColor="gray.200">Repos</Heading>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Tags</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {repos.map((r) => (
              <Tr key={r.id}>
                <Td>{r.id}</Td>
                <Td>{r.name}</Td>
                <Td>
                  <HStack>
                    {(r.tags || []).map((t, idx) => <Tag key={idx}>{t}</Tag>)}
                  </HStack>
                </Td>
                <Td>
                  <Button size="sm" onClick={() => simulatePrMerged(r.id)}>Simulate PR merged</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto">
        <Heading size="sm" p={4} borderBottom="1px" borderColor="gray.200">Projects</Heading>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Repo IDs</Th>
            </Tr>
          </Thead>
          <Tbody>
            {projects.map((p) => (
              <Tr key={p.id}>
                <Td>{p.id}</Td>
                <Td>{p.name}</Td>
                <Td>{p.status}</Td>
                <Td>{(p.repo_ids || []).join(', ')}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  )
}
