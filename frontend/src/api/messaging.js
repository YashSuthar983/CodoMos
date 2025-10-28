import api from './client'

export async function sendDM({ content, recipient_user_id, mentions = [] }) {
  const res = await api.post('/messaging/dm', { content, recipient_user_id, mentions })
  return res.data
}

export async function uploadFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/messaging/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data // { filename, url }
}

export async function getMe() {
  const res = await api.get('/users/me')
  return res.data
}
