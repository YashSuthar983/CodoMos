import React, { useState } from 'react'
import { Box, Button, Heading, Input, Textarea, Stack, HStack, Text, Table, Thead, Tr, Th, Tbody, Td, useToast, Badge } from '@chakra-ui/react'
import api from '../api/client'

export default function FormAIAssistant({ fields, onApplyFields, triggersText, onApplyTriggers, currentSchema }) {
  const toast = useToast()

  // Field generation
  const [desc, setDesc] = useState('Collect candidate application details for a frontend engineer role (junior-mid).')
  const [industry, setIndustry] = useState('Software')
  const [audience, setAudience] = useState('Job Applicants')
  const [includeFields, setIncludeFields] = useState('portfolio_url, linkedin')
  const [excludeFields, setExcludeFields] = useState('fax')
  const [aiFields, setAiFields] = useState([])
  const [loadingFields, setLoadingFields] = useState(false)

  // Trigger generation
  const [useCase, setUseCase] = useState('On submission, create a review task, send a webhook, and if candidate exists move to screening.')
  const [aiTriggers, setAiTriggers] = useState('')
  const [loadingTriggers, setLoadingTriggers] = useState(false)

  const csv = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean)

  const generateFields = async () => {
    setLoadingFields(true)
    try {
      const { data } = await api.post('/forms/ai/suggest-schema', {
        description: desc,
        industry: industry || undefined,
        audience: audience || undefined,
        include_fields: csv(includeFields),
        exclude_fields: csv(excludeFields),
      })
      const f = data?.schema?.fields || []
      setAiFields(f)
      toast({ title: `AI suggested ${f.length} fields`, status: 'success' })
    } catch (e) {
      toast({ title: 'AI field suggestion failed', status: 'error' })
    } finally {
      setLoadingFields(false)
    }
  }

  const applyFields = () => {
    if (!aiFields.length) { toast({ title: 'Nothing to apply', status: 'info' }); return }
    onApplyFields?.(aiFields)
  }

  const generateTriggers = async () => {
    setLoadingTriggers(true)
    try {
      const { data } = await api.post('/forms/ai/suggest-triggers', {
        use_case: useCase,
        form_schema: currentSchema || undefined,
      })
      const t = data?.triggers || []
      setAiTriggers(JSON.stringify(t, null, 2))
      toast({ title: `AI suggested ${t.length} triggers`, status: 'success' })
    } catch (e) {
      toast({ title: 'AI trigger suggestion failed', status: 'error' })
    } finally {
      setLoadingTriggers(false)
    }
  }

  const applyTriggers = () => {
    if (!aiTriggers.trim()) { toast({ title: 'Nothing to apply', status: 'info' }); return }
    onApplyTriggers?.(aiTriggers)
  }

  return (
    <Box bg="white" border="1px" borderColor="gray.200" rounded="md" p={4} mb={6}>
      <HStack justify="space-between" mb={2}>
        <Heading size="md">AI Assistant</Heading>
        <Badge colorScheme="purple">Gemini</Badge>
      </HStack>
      <Text fontSize="sm" color="gray.600" mb={4}>Draft fields and automation with AI. Edit before applying.</Text>

      <Heading size="sm" mb={2}>Generate Fields</Heading>
      <Stack spacing={3} mb={3}>
        <Textarea value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Describe the form purpose and audience" />
        <HStack>
          <Input placeholder="Industry (optional)" value={industry} onChange={(e)=>setIndustry(e.target.value)} />
          <Input placeholder="Audience (optional)" value={audience} onChange={(e)=>setAudience(e.target.value)} />
        </HStack>
        <HStack>
          <Input placeholder="Include fields (csv)" value={includeFields} onChange={(e)=>setIncludeFields(e.target.value)} />
          <Input placeholder="Exclude fields (csv)" value={excludeFields} onChange={(e)=>setExcludeFields(e.target.value)} />
        </HStack>
        <HStack>
          <Button onClick={generateFields} isLoading={loadingFields} colorScheme="blue">Generate Fields</Button>
          <Button onClick={applyFields} variant="outline">Apply to Form</Button>
        </HStack>
      </Stack>

      {!!aiFields.length && (
        <Box border="1px" borderColor="gray.200" rounded="md" overflowX="auto" mb={4}>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>#</Th>
                <Th>Type</Th>
                <Th>Label</Th>
                <Th>Name</Th>
                <Th>Required</Th>
                <Th>Options</Th>
              </Tr>
            </Thead>
            <Tbody>
              {aiFields.map((f, idx) => (
                <Tr key={idx}>
                  <Td>{idx + 1}</Td>
                  <Td>{f.type}</Td>
                  <Td>{f.label}</Td>
                  <Td>{f.name}</Td>
                  <Td>{f.required ? 'Yes' : 'No'}</Td>
                  <Td>{(f.options || []).join?.(', ') || '-'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Heading size="sm" mt={2} mb={2}>Generate Automation</Heading>
      <Stack spacing={3}>
        <Textarea value={useCase} onChange={(e)=>setUseCase(e.target.value)} placeholder="Describe what should happen after submission" rows={3} />
        <HStack>
          <Button onClick={generateTriggers} isLoading={loadingTriggers} colorScheme="blue">Generate Triggers</Button>
          <Button onClick={applyTriggers} variant="outline">Apply to Form</Button>
        </HStack>
        <Textarea value={aiTriggers} onChange={(e)=>setAiTriggers(e.target.value)} placeholder='[{"type":"create_task","params":{"title":"Review submission"}}]' rows={6} />
      </Stack>
    </Box>
  )
}
