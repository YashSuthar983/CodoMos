import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Container, Heading, Spinner, useToast, Button, Card, CardBody, Text, Table, Thead, Tbody, Tr, Th, Td, Badge, VStack, Input, Flex, Collapse, IconButton, SimpleGrid, Stat, StatLabel, StatNumber, HStack, Alert, AlertIcon, AlertDescription, Tag, Select, Checkbox, FormControl, FormLabel, Divider, Textarea } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { ChevronUpIcon } from '@chakra-ui/icons'
import api from '../api/client'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState(null)
  const [allRepos, setAllRepos] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [xpEvents, setXpEvents] = useState([])
  const [ghRepos, setGhRepos] = useState([])
  const [ghReposLoading, setGhReposLoading] = useState(false)
  const [showGithubWizard, setShowGithubWizard] = useState(false)
  const toast = useToast()

  // Team & Settings state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [memberRole, setMemberRole] = useState('contributor')
  const [savingSettings, setSavingSettings] = useState(false)

  const [desc, setDesc] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [defaultRepoId, setDefaultRepoId] = useState('')
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [slackUrl, setSlackUrl] = useState('')
  const [discordUrl, setDiscordUrl] = useState('')

  useEffect(() => {
    load()
  }, [projectId])

  const load = async () => {
    try {
      const [projRes, reposRes, usersRes, xpRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get('/projects/repos'),
        api.get('/users'),
        api.get('/xp/events')
      ])
      setProject(projRes.data)
      setAllRepos(reposRes.data)
      setAllUsers(usersRes.data)
      setXpEvents(xpRes.data)
    } catch (e) {
      toast({ title: 'Failed to load project', status: 'error' })
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Populate settings state when project loads
  useEffect(() => {
    if (!project) return
    setDesc(project.description || '')
    setTagsStr((project.tags || []).join(', '))
    setVisibility(project.visibility || 'private')
    setDefaultRepoId(project.default_repo_id || '')
    const notif = project.notifications || {}
    setEmailEnabled(!!notif.email_enabled)
    setSlackUrl(notif.slack_webhook_url || '')
    setDiscordUrl(notif.discord_webhook_url || '')
  }, [project])

  const loadGhRepos = async () => {
    setGhReposLoading(true)
    try {
      const res = await api.get('/projects/repos/github/list')
      setGhRepos(res.data || [])
      if ((res.data || []).length === 0) {
        // Do not toast here; an inline alert will be shown in the wizard
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to load GitHub repos'
      toast({ title: 'Error', description: msg, status: 'error' })
    } finally {
      setGhReposLoading(false)
    }
  }

  const linkRepo = async (gr, createWebhook = true) => {
    try {
      const payload = {
        name: gr.name,
        owner: gr.owner_login,
        repo_name: gr.name,
        webhook_secret: createWebhook ? randomSecret(40) : undefined,
      }
      const r = await api.post('/projects/repos', payload)
      const created = r.data
      
      // Try to create webhook if requested
      let webhookCreated = false
      if (createWebhook) {
        try {
          await api.post(`/projects/repos/${created.id}/github/webhook`)
          webhookCreated = true
        } catch (webhookError) {
          const errMsg = webhookError?.response?.data?.detail || ''
          if (errMsg.includes('127.0.0.1') || errMsg.includes('localhost') || errMsg.includes('not supported')) {
            toast({ 
              title: 'Repo linked (webhook skipped)', 
              description: 'Webhook creation failed: GitHub requires public URL. Repo linked successfully without webhook.',
              status: 'warning',
              duration: 8000
            })
          } else {
            throw webhookError
          }
        }
      }
      
      // Link to project by updating project's repo_ids
      const updatedRepoIds = [...(project.repo_ids || []), created.id]
      await api.patch(`/projects/${projectId}`, { repo_ids: updatedRepoIds })
      
      if (webhookCreated) {
        toast({ title: `✓ ${gr.name} linked with webhook!`, status: 'success' })
      } else if (!createWebhook) {
        toast({ title: `✓ ${gr.name} linked (no webhook)`, status: 'success', description: 'Add webhook later in production' })
      }
      
      setGhRepos([])
      setShowGithubWizard(false)
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to link repo'
      toast({ title: 'Error', description: msg, status: 'error', duration: 6000 })
    }
  }

  const randomSecret = (len = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let s = ''
    for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
    return s
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

  const createWebhook = async (repo) => {
    try {
      const body = {}
      if (!repo.owner) {
        const owner = window.prompt('GitHub owner/org (e.g., octocat)', '')
        if (!owner) throw new Error('Owner required')
        body.owner = owner
      }
      if (!repo.repo_name) {
        const name = window.prompt('GitHub repo name (e.g., hello-world)', '')
        if (!name) throw new Error('Repo name required')
        body.repo_name = name
      }
      await api.post(`/projects/repos/${repo.id}/github/webhook`, Object.keys(body).length ? body : undefined)
      toast({ title: 'GitHub webhook created', status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to create webhook'
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

  const unlinkRepo = async (repo) => {
    try {
      await api.post(`/projects/${projectId}/repos/${repo.id}/unlink`)
      toast({ title: 'Repo unlinked from project', status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to unlink repo'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const setDefault = async (repo) => {
    try {
      await api.post(`/projects/${projectId}/repos/${repo.id}/set-default`)
      toast({ title: 'Default repo set', status: 'success' })
      setDefaultRepoId(repo.id)
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to set default repo'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const addMember = async (e) => {
    e.preventDefault()
    if (!selectedUserId) {
      toast({ title: 'Please select a user', status: 'warning' })
      return
    }
    try {
      await api.post(`/projects/${projectId}/members`, { user_id: selectedUserId, role: memberRole })
      toast({ title: 'Member added', status: 'success' })
      setSelectedUserId('')
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to add member'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const updateMemberRole = async (userId, role) => {
    try {
      await api.patch(`/projects/${projectId}/members/${userId}`, null, { params: { role } })
      toast({ title: 'Member updated', status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to update member'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const removeMember = async (userId) => {
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`)
      toast({ title: 'Member removed', status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to remove member'
      toast({ title: 'Error', description: msg, status: 'error' })
    }
  }

  const saveProjectSettings = async (e) => {
    e.preventDefault()
    try {
      setSavingSettings(true)
      const payload = {
        description: desc || null,
        tags: tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
        visibility,
        default_repo_id: defaultRepoId || null,
        notifications: {
          email_enabled: emailEnabled,
          slack_webhook_url: slackUrl || null,
          discord_webhook_url: discordUrl || null,
        }
      }
      await api.patch(`/projects/${projectId}`, payload)
      toast({ title: 'Project settings saved', status: 'success' })
      load()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to save settings'
      toast({ title: 'Error', description: msg, status: 'error' })
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) return <Container maxW="6xl" py={8}><Spinner /></Container>
  if (!project) return <Container maxW="6xl" py={8}><Text>Project not found</Text></Container>

  // Get repos that belong to this project
  const projectRepos = allRepos.filter(r => (project.repo_ids || []).includes(r.id))
  const activeWebhooks = projectRepos.filter(r => r.webhook_id).length

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="6xl" py={8}>
        <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm" mb={4}>← Back to Dashboard</Button>
        
        <Flex justify="space-between" align="center" mb={6}>
          <HStack spacing={3}>
            <Heading size="lg">{project.name}</Heading>
            <Badge colorScheme={project.status === 'active' ? 'green' : 'gray'} fontSize="md" px={3} py={1}>{project.status}</Badge>
          </HStack>
          <Button colorScheme="blue" onClick={() => setShowGithubWizard(!showGithubWizard)}>
            + Connect GitHub Repo
          </Button>
        </Flex>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
          <Stat bg="white" p={4} rounded="lg" shadow="sm">
            <StatLabel>Repositories</StatLabel>
            <StatNumber>{projectRepos.length}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} rounded="lg" shadow="sm">
            <StatLabel>Active Webhooks</StatLabel>
            <StatNumber>{activeWebhooks}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} rounded="lg" shadow="sm">
            <StatLabel>Total XP Events</StatLabel>
            <StatNumber>{xpEvents.length}</StatNumber>
          </Stat>
        </SimpleGrid>

        {/* GitHub Connection Wizard */}
        <Collapse in={showGithubWizard} animateOpacity>
          <Card mb={6} bg="blue.50" borderColor="blue.200" borderWidth={2}>
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md">Connect GitHub Repository</Heading>
                <IconButton
                  icon={<ChevronUpIcon />}
                  onClick={() => setShowGithubWizard(false)}
                  variant="ghost"
                  size="sm"
                />
              </Flex>
              
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="semibold" mb={2}>Step 1: Load your GitHub repositories</Text>
                  <Alert status="info" mb={3} bg="white">
                    <AlertIcon />
                    <AlertDescription>
                      We use the organization-wide GitHub PAT from{' '}
                      <Link to="/settings" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>Settings → GitHub Integration</Link>.
                      If nothing appears, configure it there first.
                    </AlertDescription>
                  </Alert>
                  <HStack>
                    <Button onClick={loadGhRepos} isLoading={ghReposLoading} colorScheme="blue" minW="150px">
                      {ghRepos.length > 0 ? 'Reload Repos' : 'Load Repos'}
                    </Button>
                    <Text fontSize="sm" color="gray.700">Then select a repo to link it to this project.</Text>
                  </HStack>
                </Box>

                {ghRepos.length > 0 && (
                  <Box>
                    <Text fontWeight="semibold" mb={3}>Step 2: Select Repository</Text>
                    <Box bg="white" rounded="md" border="1px" borderColor="gray.200" maxH="400px" overflowY="auto">
                      <Table size="sm">
                        <Thead bg="gray.50" position="sticky" top={0}>
                          <Tr>
                            <Th>Repository</Th>
                            <Th>Private</Th>
                            <Th>Action</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {ghRepos.map(gr => (
                            <Tr key={gr.id} _hover={{ bg: 'gray.50' }}>
                              <Td>
                                <VStack align="start" spacing={0}>
                                  <Text fontWeight="medium">{gr.name}</Text>
                                  <Text fontSize="xs" color="gray.600">{gr.owner_login}</Text>
                                </VStack>
                              </Td>
                              <Td>{gr.private ? <Badge colorScheme="orange">Private</Badge> : <Badge>Public</Badge>}</Td>
                              <Td>
                                <HStack spacing={2}>
                                  <Button
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={() => linkRepo(gr, false)}
                                  >
                                    Link Only
                                  </Button>
                                  <Button
                                    size="sm"
                                    colorScheme="green"
                                    onClick={() => linkRepo(gr, true)}
                                  >
                                    Link + Webhook
                                  </Button>
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Box>
                )}

                {/* Link existing internal repos not yet in this project */}
                <Box>
                  <Text fontWeight="semibold" mb={2}>Or: Link an existing internal repo</Text>
                  <Box bg="white" rounded="md" border="1px" borderColor="gray.200" maxH="260px" overflowY="auto">
                    <Table size="sm">
                      <Thead bg="gray.50" position="sticky" top={0}>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Owner/Repo</Th>
                          <Th>Tags</Th>
                          <Th>Action</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {allRepos.filter(r => !(project.repo_ids || []).includes(r.id)).map(r => (
                          <Tr key={r.id} _hover={{ bg: 'gray.50' }}>
                            <Td>{r.name}</Td>
                            <Td><Text fontSize="sm" color="gray.600">{(r.owner || '-')}/{(r.repo_name || '-')}</Text></Td>
                            <Td>
                              <HStack>
                                {(r.tags || []).map((t, idx) => <Tag key={idx}>{t}</Tag>)}
                              </HStack>
                            </Td>
                            <Td>
                              <Button size="sm" onClick={async () => {
                                const updatedRepoIds = [...(project.repo_ids || []), r.id]
                                await api.patch(`/projects/${projectId}`, { repo_ids: updatedRepoIds })
                                toast({ title: 'Repo linked to project', status: 'success' })
                                load()
                              }}>Link</Button>
                            </Td>
                          </Tr>
                        ))}
                        {allRepos.filter(r => !(project.repo_ids || []).includes(r.id)).length === 0 && (
                          <Tr><Td colSpan={4}><Text p={3} color="gray.600">No unlinked repos found.</Text></Td></Tr>
                        )}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </Collapse>

        {/* Repositories List */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>Linked Repositories</Heading>
            {projectRepos.length === 0 && (
              <Box textAlign="center" py={8}>
                <Text color="gray.600" mb={3}>No repositories linked yet</Text>
                <Button colorScheme="blue" onClick={() => setShowGithubWizard(true)}>+ Connect GitHub Repo</Button>
              </Box>
            )}
            {projectRepos.length > 0 && (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Owner/Repo</Th>
                    <Th>Webhook Status</Th>
                    <Th>Tags</Th>
                    <Th>Default</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {projectRepos.map(r => (
                    <Tr key={r.id}>
                      <Td fontWeight="medium">{r.name}</Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">{r.owner}/{r.repo_name}</Text>
                      </Td>
                      <Td>
                        {r.webhook_id ? (
                          <Badge colorScheme="green" px={2} py={1}>✓ Active</Badge>
                        ) : (
                          <Badge colorScheme="gray" px={2} py={1}>No Webhook</Badge>
                        )}
                      </Td>
                      <Td>
                        <HStack>
                          {(r.tags || []).map((t, idx) => <Badge key={idx} variant="outline">{t}</Badge>)}
                        </HStack>
                      </Td>
                      <Td>
                        {project.default_repo_id === r.id ? (
                          <Badge colorScheme="purple">Default</Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setDefault(r)}>Set Default</Button>
                        )}
                      </Td>
                      <Td>
                        <HStack>
                          {(!r.owner || !r.repo_name) && (
                            <Button size="sm" variant="outline" onClick={() => setOwnerRepo(r)}>Set Owner/Repo</Button>
                          )}
                          {!r.webhook_id && (
                            <Button size="sm" colorScheme="green" variant="outline" onClick={() => createWebhook(r)}>Create Hook</Button>
                          )}
                          {r.webhook_id && (
                            <Button size="sm" colorScheme="red" variant="outline" onClick={() => deleteWebhook(r)}>Delete Hook</Button>
                          )}
                          <Button size="sm" onClick={() => navigate(`/insights?repoId=${r.id}`)}>Open Insights</Button>
                          <Button size="sm" colorScheme="red" variant="ghost" onClick={() => unlinkRepo(r)}>Unlink</Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Team Management */}
        <Card mt={6}>
          <CardBody>
            <Heading size="md" mb={4}>Team</Heading>
            <form onSubmit={addMember}>
              <HStack mb={4} align="flex-end">
                <FormControl maxW="320px">
                  <FormLabel>Select User</FormLabel>
                  <Select value={selectedUserId} onChange={(e)=>setSelectedUserId(e.target.value)} placeholder="Choose a user" required>
                    {allUsers.filter(u => !(project.members || []).some(m => String(m.user_id) === String(u.id))).map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl maxW="220px">
                  <FormLabel>Role</FormLabel>
                  <Select value={memberRole} onChange={(e)=>setMemberRole(e.target.value)}>
                    <option value="owner">Owner</option>
                    <option value="maintainer">Maintainer</option>
                    <option value="contributor">Contributor</option>
                  </Select>
                </FormControl>
                <Button type="submit" colorScheme="blue">Add Member</Button>
              </HStack>
            </form>

            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>User</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Added</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(project.members || []).map(m => {
                  const user = allUsers.find(u => String(u.id) === String(m.user_id))
                  return (
                    <Tr key={String(m.user_id)}>
                      <Td fontWeight="medium">{user?.full_name || 'Unknown User'}</Td>
                      <Td><Text fontSize="sm" color="gray.600">{user?.email || '-'}</Text></Td>
                      <Td>
                        <Select size="sm" value={m.role} onChange={(e)=>updateMemberRole(String(m.user_id), e.target.value)} maxW="200px">
                          <option value="owner">Owner</option>
                          <option value="maintainer">Maintainer</option>
                          <option value="contributor">Contributor</option>
                        </Select>
                      </Td>
                      <Td>{m.added_at ? new Date(m.added_at).toLocaleString() : '-'}</Td>
                      <Td>
                        <Button size="sm" colorScheme="red" variant="outline" onClick={()=>removeMember(String(m.user_id))}>Remove</Button>
                      </Td>
                    </Tr>
                  )
                })}
                {(project.members || []).length === 0 && (
                  <Tr><Td colSpan={5}><Text p={3} color="gray.600">No members yet. Add team members above.</Text></Td></Tr>
                )}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Project Settings */}
        <Card mt={6}>
          <CardBody>
            <Heading size="md" mb={4}>Project Settings</Heading>
            <form onSubmit={saveProjectSettings}>
              <VStack align="stretch" spacing={4}>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Short project description" />
                </FormControl>
                <FormControl>
                  <FormLabel>Tags</FormLabel>
                  <Input value={tagsStr} onChange={(e)=>setTagsStr(e.target.value)} placeholder="comma,separated,tags" />
                </FormControl>
                <HStack>
                  <FormControl maxW="240px">
                    <FormLabel>Visibility</FormLabel>
                    <Select value={visibility} onChange={(e)=>setVisibility(e.target.value)}>
                      <option value="private">Private</option>
                      <option value="internal">Internal</option>
                      <option value="public">Public</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="320px">
                    <FormLabel>Default Repository</FormLabel>
                    <Select value={defaultRepoId || ''} onChange={(e)=>setDefaultRepoId(e.target.value)} placeholder="None">
                      {(project.repo_ids || []).map(id => (
                        <option key={id} value={id}>{(allRepos.find(r => r.id === id)?.name) || id}</option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>

                <Divider />
                <Heading size="sm">Notifications</Heading>
                <Checkbox isChecked={emailEnabled} onChange={(e)=>setEmailEnabled(e.target.checked)}>Email notifications</Checkbox>
                <HStack>
                  <FormControl>
                    <FormLabel>Slack Webhook URL</FormLabel>
                    <Input value={slackUrl} onChange={(e)=>setSlackUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Discord Webhook URL</FormLabel>
                    <Input value={discordUrl} onChange={(e)=>setDiscordUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
                  </FormControl>
                </HStack>

                <HStack>
                  <Button type="submit" colorScheme="blue" isLoading={savingSettings}>Save Settings</Button>
                </HStack>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </Container>
    </Box>
  )
}
