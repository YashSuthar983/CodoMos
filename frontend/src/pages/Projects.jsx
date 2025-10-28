import React, { useEffect, useState } from 'react'
import { Box, Button, Container, Heading, Input, Stack, Table, Tbody, Td, Th, Thead, Tr, useToast, SimpleGrid, Tag, HStack, Text, Alert, AlertIcon, AlertDescription } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import api from '../api/client'

export default function Projects() {
  const [repos, setRepos] = useState([])
  const [projects, setProjects] = useState([])
  const [repoName, setRepoName] = useState('')
  const [repoTags, setRepoTags] = useState('frontend,web')
  const [repoSecret, setRepoSecret] = useState('')
  const [repoOwner, setRepoOwner] = useState('')
  const [repoRepoName, setRepoRepoName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [selectedRepoIds, setSelectedRepoIds] = useState('')
  const [ghUsername, setGhUsername] = useState('')
  const [ghRepos, setGhRepos] = useState([])
  const [ghReposLoading, setGhReposLoading] = useState(false)
  const toast = useToast()

  const randomSecret = (len = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let s = ''
    for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
    return s
  }

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

  const linkRepoFromGh = async (gr, withWebhook = false) => {
    try {
      const payload = {
        name: gr.name,
        owner: gr.owner_login,
        repo_name: gr.name,
      }
      if (withWebhook) payload.webhook_secret = randomSecret(40)
      const r = await api.post('/projects/repos', payload)
      const created = r.data
      toast({ title: 'Repo linked', description: created.name, status: 'success' })
      if (withWebhook) {
        await api.post(`/projects/repos/${created.id}/github/webhook`)
        toast({ title: 'GitHub webhook created', status: 'success' })
      }
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to link repo'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

    // Try to load GitHub repos via PAT; ignore 400 (no PAT saved)
    await loadGhRepos(true)
  }

  useEffect(() => { load() }, [])

  const loadGhRepos = async (silent = false) => {
    setGhReposLoading(true)
    try {
      const res = await api.get('/projects/repos/github/list')
      setGhRepos(res.data || [])
    } catch (e) {
      if (e?.response?.status !== 400 && !silent) {
        const msg = e?.response?.data?.detail || 'Failed to load GitHub repos'
        toast({ title: 'Error', description: msg, status: 'error' })
      }
    } finally {
      setGhReposLoading(false)
    }
  }

  const createRepo = async (e) => {
    e.preventDefault()
    try {
      const tags = repoTags.split(',').map(s => s.trim()).filter(Boolean)
      await api.post('/projects/repos', { name: repoName, tags, webhook_secret: repoSecret || undefined, owner: repoOwner || undefined, repo_name: repoRepoName || undefined })
      setRepoName('')
      setRepoSecret('')
      setRepoOwner('')
      setRepoRepoName('')
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

  const copyWebhookUrl = async (repoId) => {
    try {
      const base = api.defaults.baseURL?.replace(/\/$/, '') || ''
      const url = `${base}/integrations/github/webhook/${repoId}`
      await navigator.clipboard.writeText(url)
      toast({ title: 'Webhook URL copied', description: url, status: 'success' })
    } catch (e) {
      toast({ title: 'Copy failed', status: 'error' })
    }
  }

  const createWebhook = async (repo) => {
    try {
      const body = {}
      if (!repo.owner && repoOwner) body.owner = repoOwner
      if (!repo.repo_name && repoRepoName) body.repo_name = repoRepoName
      await api.post(`/projects/repos/${repo.id}/github/webhook`, Object.keys(body).length ? body : undefined)
      toast({ title: 'GitHub webhook created', status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to create webhook'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const deleteWebhook = async (repo) => {
    try {
      await api.delete(`/projects/repos/${repo.id}/github/webhook`)
      toast({ title: 'GitHub webhook deleted', status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to delete webhook'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const setOwnerRepo = async (repo) => {
    try {
      const owner = window.prompt('GitHub owner/org (e.g., octocat)', repo.owner || '')
      if (owner === null) return
      const name = window.prompt('GitHub repo name (e.g., hello-world)', repo.repo_name || '')
      if (name === null) return
      if (!owner.trim() || !name.trim()) {
        toast({ title: 'Both owner and repo name are required', status: 'warning' })
        return
      }
      await api.patch(`/projects/repos/${repo.id}`, { owner: owner.trim(), repo_name: name.trim() })
      toast({ title: 'Owner/Repo updated', description: `${owner}/${name}`, status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to update owner/repo'
      toast({ title: 'Error', description: msg, status: 'error' })
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
            <Input placeholder="Webhook Secret (optional, for GitHub)" type="password" value={repoSecret} onChange={(e)=>setRepoSecret(e.target.value)} />
            <HStack>
              <Input placeholder="GitHub owner/org (optional)" value={repoOwner} onChange={(e)=>setRepoOwner(e.target.value)} />
              <Input placeholder="GitHub repo name (optional)" value={repoRepoName} onChange={(e)=>setRepoRepoName(e.target.value)} />
            </HStack>
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
        <Heading size="sm" mb={3}>Your GitHub Settings</Heading>
        <form onSubmit={saveGithubUsername}>
          <Stack spacing={3}>
            <HStack>
              <Input 
                placeholder="GitHub Username (e.g., octocat)" 
                value={ghUsername} 
                onChange={(e)=>setGhUsername(e.target.value)} 
                maxW="300px" 
              />
              <Button type="submit" colorScheme="blue">Save Username</Button>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Your GitHub username maps PRs to your account for XP tracking.
            </Text>
          </Stack>
        </form>
      </Box>

      <Box bg="white" p={4} border="1px" borderColor="gray.200" rounded="md" mb={6}>
        <Heading size="sm" mb={3}>Connect GitHub Repositories</Heading>
        
        {(!ghReposLoading && ghRepos.length === 0) && (
          <Alert status="info" mb={4}>
            <AlertIcon />
            <AlertDescription>
              No GitHub repositories found. Please configure your{' '}
              <Link to="/settings" style={{ color: '#3182ce', textDecoration: 'underline' }}>
                GitHub Personal Access Token in Settings
              </Link>
              {' '}first, then click Load Repos below.
            </AlertDescription>
          </Alert>
        )}
        
        <HStack mb={3}>
          <Button size="sm" colorScheme="blue" onClick={() => loadGhRepos()} isLoading={ghReposLoading}>Load Repos</Button>
          <Text fontSize="sm" color="gray.600">
            Lists all repositories accessible with your configured GitHub PAT.
          </Text>
        </HStack>
        {ghRepos.length > 0 && (
          <Box border="1px" borderColor="gray.200" rounded="md" overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Full name</Th>
                  <Th>Private</Th>
                  <Th>Open</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {ghRepos.map(gr => (
                  <Tr key={gr.id}>
                    <Td>{gr.full_name}</Td>
                    <Td>{gr.private ? 'Yes' : 'No'}</Td>
                    <Td><a href={gr.html_url} target="_blank" rel="noreferrer">GitHub</a></Td>
                    <Td>
                      <HStack>
                        <Button size="xs" onClick={() => {
                          setRepoOwner(gr.owner_login)
                          setRepoRepoName(gr.name)
                          if (!repoName) setRepoName(gr.name)
                          toast({ title: 'Prefilled link form', description: `${gr.full_name}`, status: 'info' })
                        }}>Prefill</Button>
                        <Button size="xs" colorScheme="blue" variant="outline" onClick={() => linkRepoFromGh(gr, false)}>Link</Button>
                        <Button size="xs" colorScheme="green" variant="solid" onClick={() => linkRepoFromGh(gr, true)}>Link + Hook</Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto" mb={6}>
        <Heading size="sm" p={4} borderBottom="1px" borderColor="gray.200">Repos</Heading>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Tags</Th>
              <Th>Owner/Repo</Th>
              <Th>Webhook</Th>
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
                <Td>{(r.owner || '-')}/{(r.repo_name || '-')}</Td>
                <Td>{r.webhook_id ? `#${r.webhook_id}` : '—'}</Td>
                <Td>
                  <HStack>
                    {(!r.owner || !r.repo_name) && (
                      <Button size="sm" colorScheme="blue" variant="outline" onClick={() => setOwnerRepo(r)}>Set Owner/Repo</Button>
                    )}
                    <Button size="sm" onClick={() => simulatePrMerged(r.id)}>Simulate PR merged</Button>
                    <Button size="sm" variant="outline" onClick={() => copyWebhookUrl(r.id)}>Copy Webhook URL</Button>
                    {!r.webhook_id && (
                      <Button size="sm" colorScheme="green" variant="outline" onClick={() => createWebhook(r)}>Create Hook</Button>
                    )}
                    {r.webhook_id && (
                      <Button size="sm" colorScheme="red" variant="outline" onClick={() => deleteWebhook(r)}>Delete Hook</Button>
                    )}
                  </HStack>
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
