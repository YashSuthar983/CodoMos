import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Center, Spinner } from '@chakra-ui/react'

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    // Validate token via /users/me
    api.get('/users/me')
      .then(() => setLoading(false))
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/login')
      })
  }, [navigate])

  if (loading) {
    return (
      <Center minH="50vh"><Spinner /></Center>
    )
  }

  return children
}
