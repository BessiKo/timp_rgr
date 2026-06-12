import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useIncidents } from './context/incident'
import { LoginPage } from './pages/login'
import { MainPage } from './pages/main'
import { ProfilePage } from './pages/profile'
import { FormPage } from './pages/form'
import { DetailPage } from './pages/detail'
import { AdminPage } from './pages/admin'
import { EmergencyPage } from './pages/emergency'
import { MailPage } from './pages/mail'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { role, authLoading } = useIncidents()
  if (authLoading) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#2d3725', background: '#f5f2eb', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Загрузка...</div>
  }
  if (!role) {
    const currentPath = window.location.pathname
    if (currentPath.startsWith('/isolated-admin-gate')) {
      return <Navigate to="/isolated-admin-gate" replace />
    }
    return <Navigate to="/" replace />
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'admin' ? '/isolated-admin-gate/dashboard' : '/dashboard'} replace />
  }
  return children
}

const LoginRoute = ({ children }) => {
  const { role, authLoading, user } = useIncidents()
  const currentPath = window.location.pathname
  const isAdminGate = currentPath.startsWith('/isolated-admin-gate')
  
  if (authLoading) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#2d3725', background: '#f5f2eb', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Загрузка...</div>
  }
  
  if (!role || !user) {
    return children
  }
  
  if (isAdminGate && role === 'admin') {
    return <Navigate to="/isolated-admin-gate/dashboard" replace />
  }
  if (isAdminGate && role !== 'admin') {
    return <Navigate to="/" replace />
  }
  if (!isAdminGate && role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

export const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRoute><LoginPage /></LoginRoute>} />
        <Route path="/isolated-admin-gate" element={<LoginRoute><LoginPage /></LoginRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['operator', 'chief', 'pending']}><MainPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['operator', 'chief', 'admin']}><ProfilePage /></ProtectedRoute>} />
        <Route path="/boiler/:id/form" element={<ProtectedRoute allowedRoles={['operator', 'chief']}><FormPage /></ProtectedRoute>} />
        <Route path="/boiler/all/form" element={<ProtectedRoute allowedRoles={['operator', 'chief']}><FormPage /></ProtectedRoute>} />
        <Route path="/boiler/:id" element={<ProtectedRoute allowedRoles={['operator', 'chief']}><DetailPage /></ProtectedRoute>} />
        <Route path="/boiler/:id/emergency-stop" element={<ProtectedRoute allowedRoles={['operator', 'chief']}><EmergencyPage /></ProtectedRoute>} />
        <Route path="/mail" element={<ProtectedRoute allowedRoles={['operator', 'chief', 'admin']}><MailPage /></ProtectedRoute>} />

        <Route path="/isolated-admin-gate/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}