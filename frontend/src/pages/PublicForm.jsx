import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import { Box, Button, Container, FormControl, FormLabel, Heading, Input, Select, Stack, Switch, Textarea, useToast } from '@chakra-ui/react'

export default function PublicForm() {
  const { id } = useParams()
  const [form, setForm] = useState(null)
  const [values, setValues] = useState({})
  const toast = useToast()

  const load = async () => {
    try {
      const { data } = await api.get(`/public/forms/${id}`)
      setForm(data)
    } catch {
      toast({ title: 'Form not available', status: 'error' })
    }
  }

  useEffect(() => { load() }, [id])

  const setVal = (k, v) => setValues(prev => ({ ...prev, [k]: v }))

  const onFileChange = async (name, file) => {
    if (!file) { setVal(name, null); return }
    try {
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(f)
      })
      const dataUrl = await toBase64(file)
      // dataUrl format: data:<mime>;base64,<data>
      const [meta, b64] = String(dataUrl).split(',')
      const typeMatch = /data:(.*?);base64/.exec(meta)
      setVal(name, { filename: file.name, type: typeMatch?.[1] || file.type, size: file.size, data: b64 })
    } catch (e) {
      toast({ title: 'Failed to read file', status: 'error' })
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/public/forms/${id}/responses`, { payload: values })
      toast({ title: 'Response submitted', status: 'success' })
      setValues({})
    } catch {
      toast({ title: 'Submit failed', status: 'error' })
    }
  }

  if (!form) return (
    <Container maxW="lg" py={10}><Heading size="md">Loading...</Heading></Container>
  )

  const fields = form.schema?.fields || []

  return (
    <Container maxW="lg" py={10}>
      <Heading size="lg" mb={6}>{form.name}</Heading>
      <Box as="form" onSubmit={submit} bg="white" p={6} border="1px" borderColor="gray.200" rounded="md">
        <Stack spacing={4}>
          {fields.map((f, idx) => (
            <FormControl key={idx} isRequired={f.required}>
              <FormLabel>{f.label}</FormLabel>
              {f.type === 'text' && (
                <Input value={values[f.name] || ''} onChange={(e)=>setVal(f.name, e.target.value)} />
              )}
              {f.type === 'textarea' && (
                <Textarea value={values[f.name] || ''} onChange={(e)=>setVal(f.name, e.target.value)} />
              )}
              {f.type === 'select' && (
                <Select value={values[f.name] || ''} onChange={(e)=>setVal(f.name, e.target.value)}>
                  <option value="">Select...</option>
                  {(f.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
                </Select>
              )}
              {f.type === 'checkbox' && (
                <Switch isChecked={!!values[f.name]} onChange={(e)=>setVal(f.name, e.target.checked)} />
              )}
              {f.type === 'date' && (
                <Input type="date" value={values[f.name] || ''} onChange={(e)=>setVal(f.name, e.target.value)} />
              )}
              {f.type === 'rating' && (
                <Select value={values[f.name] || ''} onChange={(e)=>setVal(f.name, e.target.value)}>
                  <option value="">Select rating</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
              )}
              {f.type === 'file' && (
                <Input type="file" onChange={(e)=>onFileChange(f.name, e.target.files?.[0])} />
              )}
            </FormControl>
          ))}
          <Button type="submit" colorScheme="blue">Submit</Button>
        </Stack>
      </Box>
    </Container>
  )
}
