import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import api from '../api/client'
import {
  Box, Button, Container, Flex, Heading, HStack, IconButton, Input, Select, Stack, Switch, Table,
  Tbody, Td, Th, Thead, Tr, useToast, Textarea, Text, Link
} from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons'
import FormAIAssistant from '../components/FormAIAssistant'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File' },
]

export default function FormBuilder() {
  const { id } = useParams()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [newField, setNewField] = useState({ type: 'text', label: '', name: '', required: false, options: '' })
  const [published, setPublished] = useState(false)
  const [triggersText, setTriggersText] = useState('')

  const publicUrl = useMemo(() => `${window.location.origin}/public/forms/${id}`, [id])

  const load = async () => {
    try {
      const { data } = await api.get(`/forms/${id}`)
      setForm(data)
      const schemaFields = (data.schema?.fields || [])
      setFields(schemaFields)
      setPublished(!!data.published)
      setTriggersText(data.triggers ? JSON.stringify(data.triggers, null, 2) : '')
    } catch (e) {
      toast({ title: 'Failed to load form', status: 'error' })
    }
  }

  useEffect(() => { load() }, [id])

  const addField = (e) => {
    e.preventDefault()
    if (!newField.label || !newField.name) {
      toast({ title: 'Label and name are required', status: 'warning' })
      return
    }
    const field = {
      type: newField.type,
      label: newField.label,
      name: newField.name,
      required: !!newField.required,
    }
    if (newField.type === 'select') {
      field.options = newField.options.split(',').map(s => s.trim()).filter(Boolean)
    }
    setFields([...fields, field])
    setNewField({ type: 'text', label: '', name: '', required: false, options: '' })
  }

  const removeField = (idx) => {
    const next = [...fields]
    next.splice(idx, 1)
    setFields(next)
  }

  const save = async () => {
    try {
      let triggers
      if (triggersText.trim()) {
        try { triggers = JSON.parse(triggersText) } catch {
          toast({ title: 'Triggers must be valid JSON', status: 'warning' }); return
        }
      }
      const payload = { schema: { fields }, published, triggers }
      await api.patch(`/forms/${id}`, payload)
      toast({ title: 'Form saved', status: 'success' })
      load()
    } catch {
      toast({ title: 'Save failed', status: 'error' })
    }
  }

  if (!form) return (
    <Container maxW="5xl" py={8}><Heading size="md">Loading...</Heading></Container>
  )

  return (
    <Container maxW="6xl" py={8}>
      <Flex align="center" mb={4} gap={4} wrap="wrap">
        <Heading size="lg">Edit Form: {form.name}</Heading>
        <HStack>
          <Switch isChecked={published} onChange={(e)=>setPublished(e.target.checked)} />
          <Text color="gray.600">Published</Text>
        </HStack>
        <Link as={RouterLink} to={`/forms/${id}/responses`} color="blue.600">View Responses</Link>
        <Button onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: 'Public link copied', status: 'success' }) }}>Copy Public Link</Button>
      </Flex>

      {/* AI Assistant Panel */}
      <FormAIAssistant
        fields={fields}
        currentSchema={{ fields }}
        triggersText={triggersText}
        onApplyFields={(aiFields) => setFields([...fields, ...aiFields])}
        onApplyTriggers={(txt) => setTriggersText(txt)}
      />

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" p={4} mb={6}>
        <Heading size="sm" mb={3}>Add Field</Heading>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
          <Select value={newField.type} onChange={(e)=>setNewField({ ...newField, type: e.target.value })} maxW="200px">
            {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
          </Select>
          <Input placeholder="Label" value={newField.label} onChange={(e)=>setNewField({ ...newField, label: e.target.value })} />
          <Input placeholder="Name (key)" value={newField.name} onChange={(e)=>setNewField({ ...newField, name: e.target.value })} />
          {newField.type === 'select' && (
            <Input placeholder="Options (comma-separated)" value={newField.options} onChange={(e)=>setNewField({ ...newField, options: e.target.value })} />
          )}
          <HStack>
            <Text>Required</Text>
            <Switch isChecked={newField.required} onChange={(e)=>setNewField({ ...newField, required: e.target.checked })} />
          </HStack>
          <Button onClick={addField} colorScheme="blue">Add</Button>
        </Stack>
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" overflowX="auto" mb={6}>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>#</Th>
              <Th>Type</Th>
              <Th>Label</Th>
              <Th>Name</Th>
              <Th>Options</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {fields.map((f, idx) => (
              <Tr key={idx}>
                <Td>{idx + 1}</Td>
                <Td>{f.type}</Td>
                <Td>{f.label}</Td>
                <Td>{f.name}</Td>
                <Td>{(f.options || []).join?.(', ') || '-'}</Td>
                <Td>
                  <IconButton aria-label="Remove" icon={<DeleteIcon />} size="sm" onClick={() => removeField(idx)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" p={4} mb={6}>
        <Heading size="sm" mb={2}>Automation Triggers (JSON)</Heading>
        <Text fontSize="sm" color="gray.600" mb={2}>
          Supported types: <b>create_task</b>, <b>update_candidate_stage</b>, <b>send_webhook</b>
        </Text>
        <Textarea
          placeholder='[
  {"type":"create_task","params":{"title":"Review submission"}},
  {"type":"send_webhook","params":{"url":"https://webhook.site/your-id","payload":{"event":"form_submitted","form_id":"{{form_id}}","response_id":"{{response_id}}"}}},
  {"type":"update_candidate_stage","params":{"stage":"screening"}}
]'
          value={triggersText}
          onChange={(e)=>setTriggersText(e.target.value)}
          rows={6}
        />
      </Box>

      <HStack>
        <Button onClick={save} colorScheme="blue">Save Form</Button>
        <Button as={RouterLink} to="/forms" variant="outline">Back to Forms</Button>
      </HStack>
    </Container>
  )
}
