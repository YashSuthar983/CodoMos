import React, { useEffect, useRef, useState } from 'react'
import { Box, Button, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { ChatIcon, CloseIcon } from '@chakra-ui/icons'
import api from '../api/client'

export default function CogniBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hi! I'm CogniBot, how can i help you today?" }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const boxRef = useRef()

  useEffect(() => {
    if (open && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight
    }
  }, [open, messages])

  const send = async () => {
    const prompt = input.trim()
    if (!prompt) return
    setInput('')
    const history = messages.map(m => ({ role: m.role === 'model' ? 'model' : 'user', content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: prompt }])
    setSending(true)
    try {
      const res = await api.post('/ai/chat', { prompt, history })
      setMessages(prev => [...prev, { role: 'model', content: res.data.text || '(no response)' }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I had trouble responding.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <Box position="fixed" right="20px" bottom="20px" zIndex={2000}>
        <IconButton
          colorScheme="blue"
          rounded="full"
          aria-label="Open CogniBot"
          icon={<ChatIcon />}
          onClick={() => setOpen(true)}
          display={open ? 'none' : 'inline-flex'}
        />
      </Box>

      {/* Chat widget */}
      {open && (
        <Box position="fixed" right="20px" bottom="20px" zIndex={2000} w={{ base: '90vw', md: '360px' }}>
          <Box bg="white" borderWidth="1px" rounded="lg" shadow="lg" overflow="hidden">
            <HStack px={3} py={2} bg="blue.600" color="white" justify="space-between">
              <Text fontWeight="semibold">CogniBot</Text>
              <IconButton size="sm" variant="ghost" color="white" aria-label="Close" icon={<CloseIcon />} onClick={() => setOpen(false)} />
            </HStack>
            <Box ref={boxRef} p={3} maxH="300px" overflowY="auto" bg="gray.50">
              <VStack align="stretch" spacing={2}>
                {messages.map((m, i) => (
                  <Box key={i} alignSelf={m.role === 'user' ? 'flex-end' : 'flex-start'} bg={m.role === 'user' ? 'blue.50' : 'white'} borderWidth="1px" rounded="md" p={2} maxW="80%">
                    <Text fontSize="sm">{m.content}</Text>
                  </Box>
                ))}
              </VStack>
            </Box>
            <HStack p={2} borderTop="1px" borderColor="gray.200">
              <Input placeholder="Ask CogniBot..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }} />
              <Button colorScheme="blue" onClick={send} isLoading={sending}>Send</Button>
            </HStack>
          </Box>
        </Box>
      )}
    </>
  )
}
