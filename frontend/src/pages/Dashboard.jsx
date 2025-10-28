import React, { useEffect, useState } from 'react'
import { Box, Container, Heading, SimpleGrid, Spinner, useToast, Button, HStack, Card, CardBody, Text, Badge, VStack, Flex } from '@chakra-ui/react'
import api from '../api/client'
import { Link } from 'react-router-dom'

function ProjectCard({ project, repoCount }) {
  return (
    <Card as={Link} to={`/projects/${project.id}`} _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.2s">
      <CardBody>
        <VStack align="start" spacing={3}>
          <Flex w="full" justify="space-between" align="center">
            <Heading size="md">{project.name}</Heading>
            <Badge colorScheme={project.status === 'active' ? 'green' : 'gray'}>{project.status}</Badge>
          </Flex>
          <Text fontSize="sm" color="gray.600">{repoCount} {repoCount === 1 ? 'repository' : 'repositories'} linked</Text>
          <Text fontSize="xs" color="gray.500">Click to manage repos, team & settings</Text>
        </VStack>
      </CardBody>
    </Card>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [repos, setRepos] = useState([])
  const toast = useToast()

  useEffect(() => {
    async function load() {
      try {
        const [proj, reposData] = await Promise.all([
          api.get('/projects/'),
          api.get('/projects/repos'),
        ])
        setProjects(proj.data || [])
        setRepos(reposData.data || [])
      } catch (err) {
        toast({ title: 'Failed to load dashboard', status: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const getRepoCount = (projectId) => {
    return repos.filter(r => (r.project_ids || []).includes(projectId)).length
  }

  if (loading) return (
    <Container maxW="6xl" py={8}><Spinner /></Container>
  )

  const activeProjects = projects.filter(p => p.status === 'active')

  return (
    <Box>
      <Container maxW="6xl" py={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Your Projects</Heading>
          <Button as={Link} to="/projects/new" colorScheme="blue">+ New Project</Button>
        </Flex>

        {activeProjects.length === 0 && (
          <Card bg="blue.50" border="1px" borderColor="blue.200">
            <CardBody>
              <VStack spacing={3}>
                <Text fontSize="lg" fontWeight="medium">No active projects yet</Text>
                <Text fontSize="sm" color="gray.600">Create your first project to start tracking repos, PRs, and team XP.</Text>
                <Button as={Link} to="/projects/new" colorScheme="blue" size="sm">Create Project</Button>
              </VStack>
            </CardBody>
          </Card>
        )}

        {activeProjects.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {activeProjects.map(proj => (
              <ProjectCard key={proj.id} project={proj} repoCount={getRepoCount(proj.id)} />
            ))}
          </SimpleGrid>
        )}
      </Container>
    </Box>
  )
}
