import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Box, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay, HStack, IconButton, Select, Spinner, Text, VStack, Button } from '@chakra-ui/react'
import { BellIcon } from '@chakra-ui/icons'
import useMessagingWS from '../hooks/useMessagingWS'
import { listNotifications, markRead, markAllRead, getPreferences, updatePreferences } from '../api/notifications'
import api from '../api/client'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [prefs, setPrefs] = useState(null)
  const [filter, setFilter] = useState('all')

  const [me, setMe] = useState(null)
  useEffect(() => { (async () => { try { const res = await api.get('/auth/me'); setMe(res.data) } catch {} })() }, [])

  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const { events } = useMessagingWS(apiBase, me?.email)

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items])

  const fetchList = async () => {
    setLoading(true)
    try {
      const data = await listNotifications({})
      setItems(data)
      const p = await getPreferences()
      setPrefs(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (open) fetchList() }, [open])
  useEffect(() => {
    const hasNew = events.find(e => e.type === 'notification')
    if (hasNew) fetchList()
  }, [events])

  const onMarkRead = async (id) => {
    await markRead(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i))
  }

  const onMarkAllRead = async () => {
    await markAllRead()
    setItems(prev => prev.map(i => ({ ...i, read: true })))
  }

  const onPrefChange = async (key, value) => {
    const updated = await updatePreferences({ [key]: value })
    setPrefs(updated)
  }

  const filtered = items.filter(i => filter === 'all' ? true : (filter === 'unread' ? !i.read : i.category === filter))

  return (
    <>
      <Box position="relative">
        <IconButton aria-label="Notifications" icon={<BellIcon />} variant="ghost" onClick={() => setOpen(true)} />
        {unreadCount > 0 && (
          <Badge colorScheme="red" position="absolute" top="-2px" right="-2px" borderRadius="full">{unreadCount}</Badge>
        )}
      </Box>

      <Drawer isOpen={open} placement="right" onClose={() => setOpen(false)} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Notifications</DrawerHeader>
          <DrawerBody>
            {loading ? (
              <Spinner />
            ) : (
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Select value={filter} onChange={e => setFilter(e.target.value)} maxW="220px">
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="mention">Mentions</option>
                    <option value="announcement">Announcements</option>
                    <option value="task_assignment">Task Assignments</option>
                    <option value="leave">Leave</option>
                    <option value="review_reminder">Review Reminders</option>
                    <option value="project_update">Project Updates</option>
                  </Select>
                  <Button size="sm" onClick={onMarkAllRead} variant="outline">Mark all read</Button>
                </HStack>

                <VStack align="stretch" spacing={3}>
                  {filtered.map(n => (
                    <Box key={n.id} p={3} borderWidth="1px" rounded="md" bg={n.read ? 'gray.50' : 'white'}>
                      <HStack justify="space-between">
                        <Text fontWeight="medium">{n.category.replace('_', ' ')}</Text>
                        {!n.read && <Button size="xs" onClick={() => onMarkRead(n.id)}>Mark read</Button>}
                      </HStack>
                      <Text fontSize="sm" color="gray.700">{n.message}</Text>
                      {!!n.metadata?.link && (
                        <a href={n.metadata.link} target="_blank" rel="noreferrer"><Text color="blue.600" fontSize="sm">Open</Text></a>
                      )}
                      <Text fontSize="xs" color="gray.500">{new Date(n.created_at).toLocaleString()}</Text>
                    </Box>
                  ))}
                  {filtered.length === 0 && <Text color="gray.500">No notifications</Text>}
                </VStack>

                {prefs && (
                  <Box borderTop="1px" borderColor="gray.200" pt={3}>
                    <Text fontWeight="semibold" mb={2}>Preferences</Text>
                    {/* Simple toggles */}
                    {Object.entries(prefs).filter(([k]) => k.startsWith('inapp_') || k.startsWith('email_')).map(([k, v]) => (
                      <HStack key={k} justify="space-between">
                        <Text>{k.replace('_', ' ')}</Text>
                        <Select size="sm" value={String(v)} onChange={e => onPrefChange(k, e.target.value === 'true')} w="90px">
                          <option value="true">On</option>
                          <option value="false">Off</option>
                        </Select>
                      </HStack>
                    ))}
                  </Box>
                )}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
