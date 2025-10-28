import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, Tabs, TabList, Tab, TabPanels, TabPanel,
  VStack, HStack, Spinner, useToast, Select, Button, IconButton,
  Alert, AlertIcon, Text, Card, CardBody
} from '@chakra-ui/react'
import { FaSync, FaGithub } from 'react-icons/fa'
import { MdInsights } from 'react-icons/md'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'

// Import sub-components
import OverviewPanel from '../components/insights/OverviewPanel'
import BranchesPanel from '../components/insights/BranchesPanel'
import IssuesAndPRsPanel from '../components/insights/IssuesAndPRsPanel'
import ContributorsPanel from '../components/insights/ContributorsPanel'
import MilestonesPanel from '../components/insights/MilestonesPanel'
import XPLeaderboardPanel from '../components/insights/XPLeaderboardPanel'

export default function RepositoryInsights() {
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [repos, setRepos] = useState([])
  const [data, setData] = useState({
    metadata: null,
    branches: [],
    commits: [],
    issues: [],
    pullRequests: [],
    contributors: [],
    releases: [],
    milestones: [],
    activities: [],
    leaderboard: null,
    commitVelocity: null,
    prStats: null,
    contributorAnalytics: null
  })
  
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  
  const toast = useToast()
  
  const location = useLocation()
  const navigate = useNavigate()

  // Load repos on component mount
  useEffect(() => {
    loadRepos()
  }, [])

  // Load data when repo is selected
  useEffect(() => {
    if (selectedRepo) {
      loadRepositoryData()
    }
  }, [selectedRepo])

  const loadRepos = async () => {
    try {
      const response = await api.get('/projects/repos')
      setRepos(response.data)
      const params = new URLSearchParams(location.search)
      const repoIdParam = params.get('repoId')
      if (repoIdParam && response.data.some(r => String(r.id) === String(repoIdParam))) {
        setSelectedRepo(repoIdParam)
      } else if (response.data.length > 0 && !selectedRepo) {
        setSelectedRepo(response.data[0].id)
      }
    } catch (error) {
      toast({
        title: 'Failed to load repositories',
        status: 'error',
        duration: 3000
      })
    }
  }

  const loadRepositoryData = async () => {
    if (!selectedRepo) return
    
    setLoading(true)
    try {
      // Load all data in parallel
      const [
        metadataRes,
        branchesRes,
        commitsRes,
        issuesRes,
        prsRes,
        contributorsRes,
        releasesRes,
        milestonesRes,
        activitiesRes,
        velocityRes,
        prStatsRes,
        contributorAnalyticsRes
      ] = await Promise.all([
        api.get(`/github-insights/repos/${selectedRepo}/metadata`),
        api.get(`/github-insights/repos/${selectedRepo}/branches`),
        api.get(`/github-insights/repos/${selectedRepo}/commits?limit=50`),
        api.get(`/github-insights/repos/${selectedRepo}/issues`),
        api.get(`/github-insights/repos/${selectedRepo}/pull-requests`),
        api.get(`/github-insights/repos/${selectedRepo}/contributors`),
        api.get(`/github-insights/repos/${selectedRepo}/releases`),
        api.get(`/github-insights/repos/${selectedRepo}/milestones`),
        api.get(`/github-insights/repos/${selectedRepo}/activity-feed?limit=20`),
        api.get(`/github-insights/repos/${selectedRepo}/commit-velocity`),
        api.get(`/github-insights/repos/${selectedRepo}/pr-review-stats`),
        api.get(`/github-insights/repos/${selectedRepo}/contributor-analytics`)
      ])
      
      setData({
        metadata: metadataRes.data,
        branches: branchesRes.data,
        commits: commitsRes.data,
        issues: issuesRes.data,
        pullRequests: prsRes.data,
        contributors: contributorsRes.data,
        releases: releasesRes.data,
        milestones: milestonesRes.data,
        activities: activitiesRes.data,
        commitVelocity: velocityRes.data,
        prStats: prStatsRes.data,
        contributorAnalytics: contributorAnalyticsRes.data,
        leaderboard: null
      })
      
      // Load XP leaderboard
      const leaderboardRes = await api.get('/github-insights/xp/leaderboard?period=monthly')
      setData(prev => ({ ...prev, leaderboard: leaderboardRes.data }))
    } catch (error) {
      console.error('Failed to load repository data:', error)
      
      // Check if it's a PAT-related error
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('GitHub Personal Access Token')) {
        toast({
          title: 'GitHub PAT Required',
          description: 'Please ask your administrator to configure the GitHub Personal Access Token in Settings.',
          status: 'error',
          duration: 7000,
          isClosable: true
        })
      } else if (error.response?.status === 404) {
        toast({
          title: 'Repository Not Found',
          description: 'The selected repository could not be found. Please ensure it is properly linked in the Projects page.',
          status: 'error',
          duration: 5000,
          isClosable: true
        })
      } else {
        toast({
          title: 'Failed to load repository data',
          description: error.response?.data?.detail || 'Some data may be unavailable. Please try again later.',
          status: 'warning',
          duration: 5000,
          isClosable: true
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const syncRepository = async () => {
    setRefreshing(true)
    try {
      await api.post(`/github-insights/repos/${selectedRepo}/sync-all`)
      toast({
        title: 'Sync started',
        description: 'Repository data is being updated in the background',
        status: 'info',
        duration: 5000
      })
      // Reload data after a delay
      setTimeout(() => loadRepositoryData(), 3000)
    } catch (error) {
      toast({
        title: 'Sync failed',
        status: 'error',
        duration: 3000
      })
    } finally {
      setRefreshing(false)
    }
  }

  if (!selectedRepo) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="info">
          <AlertIcon />
          Please select or create a repository to view insights
        </Alert>
      </Container>
    )
  }

  // Show setup guide if no data is available
  const showSetupGuide = !loading && (!data.metadata && repos.length > 0)

  const SetupGuideCard = () => (
    <Card>
      <CardBody>
        <VStack spacing={6} align="stretch">
          <HStack>
            <MdInsights size={40} color="#0088FE" />
            <VStack align="start" spacing={0}>
              <Heading size="md">Welcome to GitHub Insights!</Heading>
              <Text color="gray.600">Follow these steps to get started</Text>
            </VStack>
          </HStack>

          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">GitHub Personal Access Token Required</Text>
              <Text fontSize="sm" mt={1}>
                Your administrator needs to configure the GitHub PAT in Settings.
              </Text>
            </Box>
          </Alert>

          <VStack align="stretch" spacing={4}>
            <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.500">
              <Text fontWeight="bold" mb={2}>Step 1: Create GitHub Personal Access Token</Text>
              <Text fontSize="sm" mb={2}>Visit GitHub Settings → Developer settings → Personal access tokens</Text>
              <Text fontSize="sm" mb={2}>Required scopes:</Text>
              <VStack align="start" spacing={1} ml={4}>
                <Text fontSize="sm">• <code>repo</code> - Full repository access</Text>
                <Text fontSize="sm">• <code>read:org</code> - Read organization data</Text>
                <Text fontSize="sm">• <code>read:user</code> - Read user profile</Text>
              </VStack>
              <Button
                size="sm"
                mt={3}
                colorScheme="blue"
                variant="outline"
                onClick={() => window.open('https://github.com/settings/tokens/new', '_blank')}
              >
                Create Token on GitHub
              </Button>
            </Box>

            <Box p={4} bg="green.50" borderRadius="md" borderLeft="4px" borderColor="green.500">
              <Text fontWeight="bold" mb={2}>Step 2: Save Token in CogniWork</Text>
              <Text fontSize="sm" mb={2}>Go to Settings and save the GitHub PAT</Text>
              <Button
                size="sm"
                mt={2}
                colorScheme="green"
                variant="outline"
                onClick={() => window.location.href = '/settings'}
              >
                Go to Settings
              </Button>
            </Box>

            <Box p={4} bg="purple.50" borderRadius="md" borderLeft="4px" borderColor="purple.500">
              <Text fontWeight="bold" mb={2}>Step 3: Link Your Repository</Text>
              <Text fontSize="sm" mb={2}>Make sure your repository is linked in the Projects page</Text>
              <Button
                size="sm"
                mt={2}
                colorScheme="purple"
                variant="outline"
                onClick={() => window.location.href = '/projects'}
              >
                Go to Projects
              </Button>
            </Box>

            <Box p={4} bg="orange.50" borderRadius="md" borderLeft="4px" borderColor="orange.500">
              <Text fontWeight="bold" mb={2}>Step 4: Sync Repository Data</Text>
              <Text fontSize="sm" mb={2}>Once configured, click the "Sync Data" button to fetch your repository insights</Text>
            </Box>
          </VStack>

          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              Your GitHub token is stored securely and only used to fetch read-only repository data.
            </Text>
          </Alert>
        </VStack>
      </CardBody>
    </Card>
  )

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={4}>
            <MdInsights size={32} color="#0088FE" />
            <VStack align="start" spacing={0}>
              <Heading size="lg">Repository Insights</Heading>
              <Text color="gray.600">Comprehensive GitHub analytics and tracking</Text>
            </VStack>
          </HStack>
          
          <HStack>
            <Select
              value={selectedRepo}
              onChange={(e) => { const id = e.target.value; setSelectedRepo(id); navigate(`/insights?repoId=${id}`, { replace: true }); }}
              maxW="300px"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.owner ? `${repo.owner}/${repo.name}` : repo.name}
                </option>
              ))}
            </Select>
            <Button
              leftIcon={<FaSync />}
              onClick={syncRepository}
              isLoading={refreshing}
              colorScheme="blue"
            >
              Sync Data
            </Button>
            <IconButton
              icon={<FaGithub />}
              onClick={() => data.metadata?.full_name && window.open(`https://github.com/${data.metadata.full_name}`, '_blank')}
              aria-label="View on GitHub"
            />
          </HStack>
        </HStack>

        {/* Main Content */}
        {loading ? (
          <VStack spacing={4} py={10}>
            <Spinner size="xl" />
            <Text>Loading repository data...</Text>
          </VStack>
        ) : showSetupGuide ? (
          <SetupGuideCard />
        ) : (
          <Tabs onChange={setActiveTab} colorScheme="blue">
            <TabList>
              <Tab>Overview</Tab>
              <Tab>Branches</Tab>
              <Tab>Issues & PRs</Tab>
              <Tab>Contributors</Tab>
              <Tab>Milestones</Tab>
              <Tab>XP & Gamification</Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel>
                <OverviewPanel data={data} />
              </TabPanel>
              <TabPanel>
                <BranchesPanel branches={data.branches} />
              </TabPanel>
              <TabPanel>
                <IssuesAndPRsPanel 
                  issues={data.issues} 
                  pullRequests={data.pullRequests}
                  prStats={data.prStats}
                />
              </TabPanel>
              <TabPanel>
                <ContributorsPanel 
                  contributors={data.contributors}
                  contributorAnalytics={data.contributorAnalytics}
                />
              </TabPanel>
              <TabPanel>
                <MilestonesPanel milestones={data.milestones} />
              </TabPanel>
              <TabPanel>
                <XPLeaderboardPanel leaderboard={data.leaderboard} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </VStack>
    </Container>
  )
}
