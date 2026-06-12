import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { request } from '../api/client'

const IncidentContext = createContext(null)

export const IncidentProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [boilers, setBoilers] = useState([])
  const [deletedBoilers, setDeletedBoilers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [operators, setOperators] = useState([])
  const [users, setUsers] = useState([])
  const [deletedUsers, setDeletedUsers] = useState([])
  const [systemLogs, setSystemLogs] = useState([])
  const [stopRequests, setStopRequests] = useState([])
  const [contacts, setContacts] = useState([])
  const [authPending, setAuthPending] = useState(null)

  useEffect(() => {
    const loadUser = async () => {
      let retries = 0
      const maxRetries = 5
      const attemptLoad = async () => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000)
          
          const res = await fetch('/api/auth/me', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (res.status === 401) {
            setUser(null)
            setRole(null)
            setAuthLoading(false)
            return
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`)
          }
          const data = await res.json()
          setUser({ id: data.user.id, email: data.user.email })
          setRole(data.user.role)
          setAuthLoading(false)
        } catch (err) {
          retries++
          if (retries < maxRetries) {
            const delay = Math.min(500 * Math.pow(2, retries - 1), 4000)
            setTimeout(attemptLoad, delay)
          } else {
            setAuthLoading(false)
          }
        }
      }
      attemptLoad()
    }
    loadUser()
  }, [])

  const login = async (email, password, isAdminGate) => {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    const data = await res.json()
    
    const currentRole = data.user ? data.user.role : data.role

    if (isAdminGate !== undefined) {
      if (isAdminGate && currentRole !== 'admin') {
        if (!data.status) await request('/auth/logout', { method: 'POST' }).catch(() => {})
        throw new Error('Доступ запрещен. Требуются права администратора.')
      }
      if (!isAdminGate && currentRole === 'admin') {
        if (!data.status) await request('/auth/logout', { method: 'POST' }).catch(() => {})
        throw new Error('Администраторы должны использовать специализированный портал входа.')
      }
    }

    if (data.status === 'mfa_pending') {
      setAuthPending({ userId: data.factorId, email: data.email })
      return { status: 'mfa_pending' }
    }

    setUser(data.user)
    setRole(data.user.role)
    setAuthPending(null)
    return { status: 'ok', role: data.user.role }
  }

  const verifyMfa = async (userId, code, isAdminGate) => {
    const res = await request('/auth/verify-mfa', { method: 'POST', body: JSON.stringify({ userId, code }) })
    const data = await res.json()

    if (isAdminGate !== undefined) {
      if (isAdminGate && data.user.role !== 'admin') {
        setAuthPending(null)
        await request('/auth/logout', { method: 'POST' }).catch(() => {})
        throw new Error('Доступ запрещен. Требуются права администратора.')
      }
      if (!isAdminGate && data.user.role === 'admin') {
        setAuthPending(null)
        await request('/auth/logout', { method: 'POST' }).catch(() => {})
        throw new Error('Администраторы должны использовать специализированный портал входа.')
      }
    }

    setUser(data.user)
    setRole(data.user.role)
    setAuthPending(null)
    return data.user.role
  }

  const register = async (email, password, confirmPassword) => {
    if (password !== confirmPassword) throw new Error('Пароли не совпадают')
    await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
    return 'pending'
  }

  const logout = async () => {
    try {
      await request('/auth/logout', { method: 'POST' })
    } catch (e) {}
    setUser(null)
    setRole(null)
    setSystemLogs([])
  }

  const changePassword = async (oldPassword, newPassword) => {
    await request('/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) })
  }

  const setupMfa = async () => {
    const res = await request('/auth/mfa/setup', { method: 'POST' })
    return res.json()
  }

  const enableMfa = async (code) => {
    return request('/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ code }) })
  }

  const disableMfa = async () => {
    const res = await request('/auth/mfa/disable', { method: 'POST' })
    return await res.json()
  }

  const loadContacts = useCallback(async () => {
    try {
      const res = await request('/contacts')
      setContacts(await res.json())
    } catch (e) {
      setContacts([])
    }
  }, [])

  const sendMessage = async (recipientId, subject, body) => {
    await request('/messages', { method: 'POST', body: JSON.stringify({ recipientId, subject, body }) })
  }

  const logSystemEvent = async (action, metadata = {}, account = null) => {
    const record = { timestamp: new Date().toISOString(), user: account || user?.email, action, metadata }
    setSystemLogs(prev => [record, ...prev])
  }

  const loadBoilers = useCallback(async () => {
    try {
      const res = await request('/boilers')
      setBoilers(await res.json())
    } catch (e) {}
  }, [])

  const loadDeletedBoilers = useCallback(async () => {
    try {
      if (role === 'chief' || role === 'admin') {
        const res = await request('/boilers/deleted')
        setDeletedBoilers(await res.json())
      }
    } catch (e) {}
  }, [role])

  const loadAssignments = useCallback(async () => {
    try {
      const res = await request('/assignments')
      setAssignments(await res.json())
    } catch (e) {}
  }, [])

  const loadOperators = useCallback(async () => {
    try {
      const res = await request('/admin/users')
      const allUsers = await res.json()
      setOperators(allUsers.filter(u => u.role === 'operator'))
    } catch (e) {}
  }, [])

  const loadProfiles = useCallback(async () => {
    try {
      const res = await request('/admin/users')
      setUsers(await res.json())
    } catch (e) {}
  }, [])

  const loadDeletedUsers = useCallback(async () => {
    try {
      const res = await request('/admin/users/deleted')
      setDeletedUsers(await res.json())
    } catch (e) {}
  }, [])

  const loadSystemLogs = useCallback(async () => {
    try {
      const res = await request('/admin/logs?limit=100')
      const data = await res.json()
      setSystemLogs(data.map(l => ({ timestamp: l.created_at, user: l.user_email || 'Система', action: l.action })))
    } catch (e) {}
  }, [])

  const loadStopRequests = useCallback(async () => {
    try {
      const res = await request('/stop-requests')
      setStopRequests(await res.json())
    } catch (e) {}
  }, [])

  const addBoiler = async (boilerData) => {
    await request('/boilers', { method: 'POST', body: JSON.stringify(boilerData) })
    await loadBoilers()
  }

  const deleteBoiler = async (id) => {
    await request(`/boilers/${id}`, { method: 'DELETE' })
    await loadBoilers()
    await loadDeletedBoilers()
  }

  const restoreBoiler = async (id) => {
    await request(`/boilers/${id}/restore`, { method: 'PUT' })
    await loadBoilers()
    await loadDeletedBoilers()
  }

  const updateBoilerParams = async (id, params) => {
    await request(`/boilers/${id}`, { method: 'PUT', body: JSON.stringify(params) })
    await loadBoilers()
  }

  const fetchGoRuntimeLogs = async (networkAddress, boilerId) => {
    try {
      let url = networkAddress
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url
      }
      const res = await fetch(`${url}/api/boiler/logs?boilerId=${boilerId}`)
      if (!res.ok) throw new Error('Не удалось получить логи')
      return (await res.json()).history || []
    } catch (e) {
      throw new Error('Ошибка подключения к аппарату')
    }
  }

  const assignOperatorToBoiler = async (operatorId, boilerId) => {
    await request('/assignments', { method: 'POST', body: JSON.stringify({ operator_id: operatorId, boiler_id: boilerId }) })
    await loadAssignments()
  }

  const removeAssignment = async (assignmentId) => {
    await request(`/assignments/${assignmentId}`, { method: 'DELETE' })
    await loadAssignments()
  }

  const changeUserFields = async (userId, newRole, newEmail) => {
    await request(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify({ role: newRole, email: newEmail }) })
    await loadProfiles()
  }

  const deleteUser = async (userId) => {
    await request(`/admin/users/${userId}`, { method: 'DELETE' })
    await loadProfiles()
    await loadDeletedUsers()
  }

  const restoreUser = async (userId) => {
    await request(`/admin/users/${userId}/restore`, { method: 'PUT' })
    await loadProfiles()
    await loadDeletedUsers()
  }

  const createStopRequest = async (boilerId, reason) => {
    await request('/stop-requests', { method: 'POST', body: JSON.stringify({ boilerId, reason }) })
    await loadStopRequests()
  }

  const approveStopRequest = async (requestId, boilerId, reason, networkAddress) => {
    if (networkAddress) {
      try {
        let url = networkAddress
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'http://' + url
        }
        await fetch(`${url}/api/boiler/emergency-shutdown`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      } catch (e) {}
    }
    await request(`/boilers/${boilerId}/status`, { method: 'PUT', body: JSON.stringify({ is_blocked: true }) })
    await request(`/stop-requests/${requestId}`, { method: 'DELETE' })
    await loadStopRequests()
    await loadBoilers()
  }

  const rejectStopRequest = async (requestId) => {
    await request(`/stop-requests/${requestId}`, { method: 'DELETE' })
    await loadStopRequests()
  }

  const unblockBoiler = async (boilerId, networkAddress) => {
    if (networkAddress) {
      try {
        let url = networkAddress
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'http://' + url
        }
        await fetch(`${url}/api/boiler/resume`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      } catch (e) {}
    }
    await request(`/boilers/${boilerId}/status`, { method: 'PUT', body: JSON.stringify({ is_blocked: false }) })
    await loadBoilers()
  }

  return (
    <IncidentContext.Provider value={{
      user, role, authLoading, boilers, deletedBoilers, assignments, operators, users, deletedUsers, systemLogs, stopRequests,
      contacts, authPending,
      login, verifyMfa, logout, register, setupMfa, enableMfa, disableMfa, changePassword, logSystemEvent, logEvent: logSystemEvent,
      loadBoilers, loadDeletedBoilers, loadProfiles, loadDeletedUsers, loadSystemLogs, loadStopRequests, loadAssignments, loadOperators,
      loadContacts, addBoiler, deleteBoiler, restoreBoiler, updateBoilerParams, createStopRequest, changeUserFields, deleteUser, restoreUser,
      approveStopRequest, rejectStopRequest, assignOperatorToBoiler, removeAssignment, unblockBoiler, sendMessage,
      fetchGoRuntimeLogs
    }}>
      {authLoading ? <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Загрузка системы...</div> : children}
    </IncidentContext.Provider>
  )
}

export const useIncidents = () => useContext(IncidentContext)
