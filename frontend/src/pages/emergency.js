import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIncidents } from '../context/incident'

export const EmergencyPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { boilers, createStopRequest } = useIncidents()
  const [selectedBoilerId, setSelectedBoilerId] = useState(id || '')
  const [reason, setReason] = useState('Утечка пара')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (id) setSelectedBoilerId(id)
  }, [id])

  const handleEmergencyTrigger = async (e) => {
    e.preventDefault()
    if (!selectedBoilerId) return alert('Укажите аппарат')
    try {
      await createStopRequest(selectedBoilerId, reason)
      setMsg('Запрос на остановку отправлен начальнику смены.')
    } catch (err) {
      alert('Ошибка при отправке запроса')
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', background: '#f5f2eb', minHeight: '100vh' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '10px 15px', background: '#e8e5d9', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px', color: '#2d3725' }}>
        Назад
      </button>
      <div style={{ border: '2px solid #9c5454', padding: '25px', background: '#ffffff', borderRadius: '4px' }}>
        <h2 style={{ color: '#9c5454', marginTop: 0 }}>Запрос на отключение</h2>
        {msg && <div style={{ background: '#d3dfd3', color: '#4e6e4e', padding: '12px', marginBottom: '15px', border: '1px solid #4e6e4e', borderRadius: '4px' }}>{msg}</div>}
        <form onSubmit={handleEmergencyTrigger} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>
            Аппарат:
            <select value={selectedBoilerId} onChange={e => setSelectedBoilerId(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} disabled={!!msg} required>
              <option value="">-- Выберите котел --</option>
              {boilers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>
            Причина остановки:
            <select value={reason} onChange={e => setReason(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} disabled={!!msg}>
              <option value="Утечка пара">Утечка пара</option>
              <option value="Критическое давление">Аномальное давление</option>
              <option value="Сбой КИПиА">Отказ датчиков</option>
            </select>
          </label>
          
          <button type="submit" style={{ padding: '12px', background: msg ? '#c5bba8' : '#9c5454', color: '#fff', border: 'none', cursor: msg ? 'not-allowed' : 'pointer', marginTop: '10px', borderRadius: '4px' }} disabled={!!msg}>
            Отправить запрос
          </button>
        </form>
      </div>
    </div>
  )
}