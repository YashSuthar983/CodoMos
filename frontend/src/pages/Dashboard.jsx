import React, { useEffect, useState } from 'react'
import { Box, Container, Grid, GridItem, Heading, SimpleGrid, Spinner, Stat, StatLabel, StatNumber, useToast, Button, HStack } from '@chakra-ui/react'
import api from '../api/client'
import { Link } from 'react-router-dom'

function StatCard({ label, value }) {
  return (
    <Stat p={4} bg="white" border="1px" borderColor="gray.200" rounded="md">
      <StatLabel>{label}</StatLabel>
      <StatNumber>{value}</StatNumber>
    </Stat>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ candidates: 0, projects: 0, repos: 0, forms: 0, xpEvents: 0 })
  const toast = useToast()

  useEffect(() => {
    async function fetchStats() {
      try {
        const [cand, proj, repos, forms, xp] = await Promise.all([
          api.get('/candidates/'),
          api.get('/projects/'),
          api.get('/projects/repos'),
          api.get('/forms/'),
          api.get('/xp/events'),
        ])
        setStats({
          candidates: cand.data.length,
          projects: proj.data.length,
          repos: repos.data.length,
          forms: forms.data.length,
          xpEvents: xp.data.length,
        })
      } catch (err) {
        toast({ title: 'Failed to load dashboard', status: 'error' })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [toast])

  if (loading) return (
    <Container maxW="6xl" py={8}><Spinner /></Container>
  )

  return (
    <Box>
      <Container maxW="6xl" py={8}>
        <Heading size="lg" mb={4}>Dashboard</Heading>
        <SimpleGrid columns={{ base: 1, md: 3, lg: 5 }} spacing={4}>
          <StatCard label="Candidates" value={stats.candidates} />
          <StatCard label="Projects" value={stats.projects} />
          <StatCard label="Repos" value={stats.repos} />
          <StatCard label="Forms" value={stats.forms} />
          <StatCard label="Your XP Events" value={stats.xpEvents} />
        </SimpleGrid>

        <HStack spacing={4} mt={8}>
          <Button as={Link} to="/candidates" colorScheme="blue" variant="solid">Add Candidate</Button>
          <Button as={Link} to="/roles" variant="outline">Create Role</Button>
          <Button as={Link} to="/forms" variant="outline">New Form</Button>
          <Button as={Link} to="/projects" variant="outline">Link Repo</Button>
        </HStack>
      </Container>
    </Box>
  )
}
