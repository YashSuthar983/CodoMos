import api from './client'

export async function listNotifications({ read = null, category = null, limit = 20, offset = 0 } = {}) {
  const params = {}
  if (read !== null) params.read = read
  if (category) params.category = category
  params.limit = limit
  params.offset = offset
  const res = await api.get('/notifications/', { params })
  return res.data
}

export async function markRead(id) {
  const res = await api.post(`/notifications/${id}/read`)
  return res.data
}

export async function markUnread(id) {
  const res = await api.post(`/notifications/${id}/unread`)
  return res.data
}

export async function markAllRead() {
  const res = await api.post('/notifications/mark_all_read')
  return res.data
}

export async function getPreferences() {
  const res = await api.get('/notifications/preferences')
  return res.data
}

export async function updatePreferences(prefs) {
  const res = await api.patch('/notifications/preferences', prefs)
  return res.data
}
