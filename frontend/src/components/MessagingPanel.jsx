import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Divider, Flex, HStack, IconButton, Input, Text, VStack, useToast, Avatar, Badge } from '@chakra-ui/react'
import { AttachmentIcon } from '@chakra-ui/icons'
import useMessagingWS from '../hooks/useMessagingWS'
import { sendDM, uploadFile, getMe } from '../api/messaging'

export default function MessagingPanel({ targetUserId, targetUserEmail }) {
  const toast = useToast()
  const [me, setMe] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef()

  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

  useEffect(() => {
    (async () => {
      try {
        const u = await getMe()
        setMe(u)
      } catch (e) {
        toast({ title: 'Not authenticated', status: 'error' })
      }
    })()
  }, [])

  const { events } = useMessagingWS(apiBase, me?.email)

  const dmEvents = useMemo(() =>
    events.filter(e => e.type === 'dm' && (e.senderId === targetUserId || e.senderId === (me && me.id))),
  [events, targetUserId, me])

  const onSend = async () => {
    if (!text.trim()) return
    try {
      setSending(true)
      const mentions = []
      if (/@/.test(text) && targetUserEmail) mentions.push(targetUserEmail)
      await sendDM({ content: text, recipient_user_id: targetUserId, mentions })
      setText('')
    } catch (e) {
      toast({ title: 'Failed to send', description: e.response?.data?.detail || 'Error', status: 'error' })
    } finally {
      setSending(false)
    }
  }

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadFile(file)
      setText(prev => `${prev} ${url}`)
    } catch (err) {
      toast({ title: 'Upload failed', status: 'error' })
    } finally {
      e.target.value = ''
    }
  }

  return (
    <Box borderWidth="1px" rounded="lg" p={3} bg="white">
      <HStack justify="space-between" mb={2}>
        <HStack>
          <Avatar size="sm" name={targetUserEmail} />
          <VStack spacing={0} align="start">
            <Text fontWeight="medium">Direct Messages</Text>
            <Badge colorScheme="blue">{targetUserEmail}</Badge>
          </VStack>
        </HStack>
      </HStack>
      <Divider mb={3} />

      <VStack align="stretch" spacing={2} maxH="280px" overflowY="auto" mb={3}>
        {dmEvents.map((e, idx) => (
          <Flex key={idx} justify={e.senderId === (me && me.id) ? 'flex-end' : 'flex-start'}>
            <Box bg={e.senderId === (me && me.id) ? 'blue.50' : 'gray.50'} p={2} rounded="md">
              <Text fontSize="sm">{e.content}</Text>
              <Text fontSize="xs" color="gray.500">{new Date(e.createdAt).toLocaleTimeString()}</Text>
            </Box>
          </Flex>
        ))}
      </VStack>

      <HStack>
        <Input
          placeholder="Type a message... use @email for mentions"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
        />
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={onUpload} />
        <IconButton icon={<AttachmentIcon />} onClick={() => fileInputRef.current?.click()} aria-label="attach" />
        <Button colorScheme="blue" onClick={onSend} isLoading={sending}>Send</Button>
      </HStack>
    </Box>
  )
}
