import React, { useEffect, useState } from 'react'
import {
  Box, Container, Heading, VStack, HStack, Tabs, TabList, Tab,
  TabPanels, TabPanel, FormControl, FormLabel, Input, Switch,
  Button, useToast, Text, Alert, AlertIcon, Card, CardHeader,
  CardBody, Divider, Badge, IconButton, InputGroup, InputRightElement,
  Select, NumberInput, NumberInputField, Code, Spinner
} from '@chakra-ui/react'
import { FaSave, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { MdSettings } from 'react-icons/md'
import api from '../api/client'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showPAT, setShowPAT] = useState(false)
  const [formData, setFormData] = useState({
    github_pat: '',
    github_app_id: '',
    github_webhook_secret: '',
    github_default_org: '',
    slack_webhook_url: '',
    discord_webhook_url: '',
    email_notifications_enabled: false,
    xp_system_enabled: true,
    xp_decay_enabled: false,
    xp_streak_enabled: true,
    github_insights_enabled: true,
    ai_features_enabled: true,
    forms_enabled: true,
    auto_sync_enabled: false,
    sync_interval_hours: 24
  })

  const toast = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/settings/')
      setSettings(response.data)
      setFormData({
        github_pat: response.data.github_pat || '',
        github_app_id: response.data.github_app_id || '',
        github_webhook_secret: response.data.github_webhook_secret || '',
        github_default_org: response.data.github_default_org || '',
        slack_webhook_url: response.data.slack_webhook_url || '',
        discord_webhook_url: response.data.discord_webhook_url || '',
        email_notifications_enabled: response.data.email_notifications_enabled,
        xp_system_enabled: response.data.xp_system_enabled,
        xp_decay_enabled: response.data.xp_decay_enabled,
        xp_streak_enabled: response.data.xp_streak_enabled,
        github_insights_enabled: response.data.github_insights_enabled,
        ai_features_enabled: response.data.ai_features_enabled,
        forms_enabled: response.data.forms_enabled,
        auto_sync_enabled: response.data.auto_sync_enabled,
        sync_interval_hours: response.data.sync_interval_hours
      })
    } catch (error) {
      toast({
        title: 'Failed to load settings',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 3000
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Only send non-masked values
      const updateData = {}
      for (const key in formData) {
        const value = formData[key]
        // Skip null/undefined values
        if (value === null || value === undefined) continue
        
        // For strings, check if they're masked
        if (typeof value === 'string') {
          if (value && !value.includes('***')) {
            updateData[key] = value
          }
        } else {
          // For booleans and numbers, always include
          updateData[key] = value
        }
      }

      console.log('Saving settings:', updateData)
      const response = await api.put('/settings/', updateData)
      setSettings(response.data)
      
      // Reload settings to get updated masked values
      await loadSettings()
      
      toast({
        title: 'Settings saved successfully',
        status: 'success',
        duration: 3000
      })
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Failed to save settings',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  const testGitHubConnection = async () => {
    setTesting(true)
    setTestResult(null)
    
    // Check if user has entered a PAT
    if (!formData.github_pat || formData.github_pat.includes('***')) {
      toast({
        title: 'No GitHub PAT to test',
        description: 'Please enter your GitHub Personal Access Token first',
        status: 'warning',
        duration: 3000
      })
      setTesting(false)
      return
    }
    
    try {
      console.log('Testing GitHub connection...')
      // Send the PAT in request body for testing
      const response = await api.post('/settings/github/test', {
        github_pat: formData.github_pat
      })
      console.log('Test response:', response.data)
      setTestResult(response.data)
      toast({
        title: response.data.status === 'success' ? 'Connection successful! ✅' : 'Connection failed',
        description: response.data.message,
        status: response.data.status === 'success' ? 'success' : 'error',
        duration: 5000
      })
    } catch (error) {
      console.error('Test error:', error.response?.data || error)
      const errorDetail = error.response?.data?.detail || 'Failed to test connection'
      setTestResult({
        status: 'error',
        message: errorDetail
      })
      toast({
        title: 'Connection test failed',
        description: errorDetail,
        status: 'error',
        duration: 5000
      })
    } finally {
      setTesting(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={4} py={10}>
          <Spinner size="xl" />
          <Text>Loading settings...</Text>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={4}>
            <MdSettings size={32} color="#0088FE" />
            <VStack align="start" spacing={0}>
              <Heading size="lg">Application Settings</Heading>
              <Text color="gray.600">Configure GitHub integration and application features</Text>
            </VStack>
          </HStack>
          <Button
            leftIcon={<FaSave />}
            colorScheme="blue"
            onClick={saveSettings}
            isLoading={saving}
          >
            Save Settings
          </Button>
        </HStack>

        <Alert status="info">
          <AlertIcon />
          These settings apply to the entire organization. Admin privileges are required to modify them.
        </Alert>

        <Tabs colorScheme="blue">
          <TabList>
            <Tab>GitHub Integration</Tab>
            <Tab>Notifications</Tab>
            <Tab>XP System</Tab>
            <Tab>Feature Flags</Tab>
          </TabList>

          <TabPanels>
            {/* GitHub Integration Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardHeader>
                    <Heading size="md">GitHub Personal Access Token</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <Box>
                          <Text fontWeight="bold">Test Your Token Before Saving</Text>
                          <Text fontSize="sm" mt={1}>
                            Paste your GitHub PAT below and click "Test Connection" to verify it works. 
                            Once verified, click "Save Settings" to apply it.
                          </Text>
                        </Box>
                      </Alert>

                      <FormControl>
                        <FormLabel>GitHub PAT</FormLabel>
                        <InputGroup>
                          <Input
                            type={showPAT ? 'text' : 'password'}
                            value={formData.github_pat}
                            onChange={(e) => handleInputChange('github_pat', e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          />
                          <InputRightElement>
                            <IconButton
                              size="sm"
                              icon={showPAT ? <FaEyeSlash /> : <FaEye />}
                              onClick={() => setShowPAT(!showPAT)}
                              aria-label="Toggle visibility"
                            />
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>

                      <HStack spacing={3}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => window.open('https://github.com/settings/tokens/new', '_blank')}
                        >
                          Create New Token
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={testGitHubConnection}
                          isLoading={testing}
                          leftIcon={<FaCheckCircle />}
                        >
                          Test Connection
                        </Button>
                        <Text fontSize="xs" color="gray.600">
                          (Test before saving)
                        </Text>
                      </HStack>

                      {testResult && (
                        <Alert 
                          status={testResult.status === 'success' ? 'success' : 'error'}
                          borderRadius="md"
                        >
                          <AlertIcon />
                          <Box flex={1}>
                            <Text fontWeight="bold">{testResult.message}</Text>
                            {testResult.user && (
                              <Text fontSize="sm" mt={1}>
                                Authenticated as: {testResult.user}
                              </Text>
                            )}
                            {testResult.scopes && (
                              <Text fontSize="sm" mt={1}>
                                Scopes: {testResult.scopes.join(', ')}
                              </Text>
                            )}
                          </Box>
                        </Alert>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="md">Additional GitHub Settings</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Default Organization</FormLabel>
                        <Input
                          value={formData.github_default_org}
                          onChange={(e) => handleInputChange('github_default_org', e.target.value)}
                          placeholder="your-organization"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Webhook Secret</FormLabel>
                        <Input
                          type="password"
                          value={formData.github_webhook_secret}
                          onChange={(e) => handleInputChange('github_webhook_secret', e.target.value)}
                          placeholder="webhook_secret_key"
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Auto Sync</FormLabel>
                        <Switch
                          isChecked={formData.auto_sync_enabled}
                          onChange={(e) => handleInputChange('auto_sync_enabled', e.target.checked)}
                        />
                      </FormControl>

                      {formData.auto_sync_enabled && (
                        <FormControl>
                          <FormLabel>Sync Interval (hours)</FormLabel>
                          <NumberInput
                            value={formData.sync_interval_hours}
                            onChange={(value) => handleInputChange('sync_interval_hours', parseInt(value))}
                            min={1}
                            max={168}
                          >
                            <NumberInputField />
                          </NumberInput>
                        </FormControl>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Notifications Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardHeader>
                    <Heading size="md">Notification Webhooks</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Slack Webhook URL</FormLabel>
                        <Input
                          type="password"
                          value={formData.slack_webhook_url}
                          onChange={(e) => handleInputChange('slack_webhook_url', e.target.value)}
                          placeholder="https://hooks.slack.com/services/..."
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Discord Webhook URL</FormLabel>
                        <Input
                          type="password"
                          value={formData.discord_webhook_url}
                          onChange={(e) => handleInputChange('discord_webhook_url', e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Email Notifications</FormLabel>
                        <Switch
                          isChecked={formData.email_notifications_enabled}
                          onChange={(e) => handleInputChange('email_notifications_enabled', e.target.checked)}
                        />
                      </FormControl>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* XP System Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardHeader>
                    <Heading size="md">XP System Configuration</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Enable XP System</FormLabel>
                        <Switch
                          isChecked={formData.xp_system_enabled}
                          onChange={(e) => handleInputChange('xp_system_enabled', e.target.checked)}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Enable XP Decay</FormLabel>
                        <Switch
                          isChecked={formData.xp_decay_enabled}
                          onChange={(e) => handleInputChange('xp_decay_enabled', e.target.checked)}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Enable Streak Bonuses</FormLabel>
                        <Switch
                          isChecked={formData.xp_streak_enabled}
                          onChange={(e) => handleInputChange('xp_streak_enabled', e.target.checked)}
                        />
                      </FormControl>

                      <Alert status="info">
                        <AlertIcon />
                        <Text fontSize="sm">
                          XP is awarded for contributions: Commits (+1), Issues (+3), PRs (+5), Reviews (+2), Milestones (+5)
                        </Text>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Feature Flags Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardHeader>
                    <Heading size="md">Feature Flags</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>GitHub Insights</FormLabel>
                        <Switch
                          isChecked={formData.github_insights_enabled}
                          onChange={(e) => handleInputChange('github_insights_enabled', e.target.checked)}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>AI Features</FormLabel>
                        <Switch
                          isChecked={formData.ai_features_enabled}
                          onChange={(e) => handleInputChange('ai_features_enabled', e.target.checked)}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Forms Module</FormLabel>
                        <Switch
                          isChecked={formData.forms_enabled}
                          onChange={(e) => handleInputChange('forms_enabled', e.target.checked)}
                        />
                      </FormControl>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  )
}
