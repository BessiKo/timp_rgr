import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIncidents } from '../context/incident'

export const FormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { boilers, role, updateBoilerParams, fetchGoRuntimeLogs, loadBoilers } = useIncidents()
  const [selectedId, setSelectedId] = useState(id || '')
  const [voltage, setVoltage] = useState('')
  const [current, setCurrent] = useState('')
  const [pressure, setPressure] = useState('')
  const [interval, setInterval] = useState('5m')
  const [goLogs, setGoLogs] = useState([])
  const [msg, setMsg] = useState('')
  
  useEffect(() => {
    if (role && role !== 'admin' && boilers.length === 0) {
      loadBoilers()
    }
  }, [role, boilers.length, loadBoilers])

  const currentBoiler = boilers.find(b => String(b.id) === String(selectedId))
  
  useEffect(() => {
    if (currentBoiler && role === 'operator') {
      setVoltage(currentBoiler.voltage || '220')
      setCurrent(currentBoiler.current || '10')
      setPressure(currentBoiler.pressure || '4.0')
    }
  }, [currentBoiler, role])

  const handleOperatorSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await updateBoilerParams(selectedId, {
        max_pressure: Number(pressure)
      })
      setMsg('Параметры успешно обновлены')
    } catch (err) {
      alert('Ошибка обновления параметров')
    }
  }

  const handleFetchGoLogs = async (e) => {
    e.preventDefault()
    if (!currentBoiler) return alert('Выберите аппарат')
    try {
      const addr = currentBoiler.network_address || process.env.REACT_APP_API_URL
      const data = await fetchGoRuntimeLogs(addr, currentBoiler.id)
      const now = Date.now()
      const limits = { '5m': 5, '1h': 60, '1d': 1440, '1m': 43200 }
      const mins = limits[interval]
      const filtered = data.filter(r => {
        if (!r.timestamp) return false
        const t = new Date(r.timestamp).getTime()
        if (isNaN(t)) return true
        return (now - t) / 60000 <= mins
      })
      setGoLogs(filtered.length > 0 ? filtered : data)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDownloadJSON = () => {
    if (goLogs.length === 0) return alert('Нет данных')
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(goLogs, null, 2))
    const a = document.createElement('a')
    a.href = dataStr
    a.download = `boiler_${selectedId}_report_${interval}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (!role) return <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>Загрузка...</div>

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', background: '#f5f2eb', minHeight: '100vh' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '10px 15px', background: '#e8e5d9', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px', color: '#2d3725' }}>
        Назад
      </button>
      
      {msg && <div style={{ background: '#d3dfd3', color: '#4a5542', padding: '12px', marginBottom: '15px', border: '1px solid #4a5542', borderRadius: '4px' }}>{msg}</div>}
      
      {role === 'operator' ? (
        <div style={{ border: '1px solid #c5bba8', padding: '25px', background: '#ffffff', borderRadius: '4px' }}>
          <h2 style={{ marginTop: 0, color: '#2d3725' }}>Настройки параметров аппарата</h2>
          <form onSubmit={handleOperatorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>
              Выбранный аппарат:
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} required>
                <option value="">-- Выберите котел --</option>
                {boilers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>
              Рабочее напряжение (В):
              <input type="number" value={voltage} onChange={e => setVoltage(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>
              Рабочий ток (А):
              <input type="number" step="0.1" value={current} onChange={e => setCurrent(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>
              Максимальное давление (МПа):
              <input type="number" step="0.1" value={pressure} onChange={e => setPressure(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} required />
            </label>
            <button type="submit" style={{ padding: '12px', background: '#4a5542', color: '#fff', border: 'none', cursor: 'pointer', marginTop: '10px', borderRadius: '4px' }}>
              Сохранить параметры
            </button>
          </form>
        </div>
      ) : (
        <div style={{ border: '1px solid #c5bba8', padding: '25px', background: '#ffffff', borderRadius: '4px' }}>
          <h2 style={{ marginTop: 0, color: '#2d3725' }}>История показаний</h2>
          <form onSubmit={handleFetchGoLogs} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '25px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, color: '#2d3725' }}>
              Аппарат:
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} required>
                <option value="">-- Выберите котел --</option>
                {boilers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, color: '#2d3725' }}>
              Период:
              <select value={interval} onChange={e => setInterval(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }}>
                <option value="5m">Последние 5 минут</option>
                <option value="1h">Последний час</option>
                <option value="1d">Последний день</option>
                <option value="1m">Последний месяц</option>
              </select>
            </label>
            <button type="submit" style={{ padding: '10px 20px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              Запросить
            </button>
          </form>
          
          {goLogs.length > 0 && (
            <button onClick={handleDownloadJSON} style={{ marginBottom: '15px', padding: '10px 20px', background: '#4a5542', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              Скачать отчет
            </button>
          )}
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #c5bba8', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f2eb', borderBottom: '1px solid #c5bba8' }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#2d3725' }}>Время</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#2d3725' }}>Напряжение</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#2d3725' }}>Ток</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#2d3725' }}>Давление</th>
                </tr>
              </thead>
              <tbody>
                {goLogs.map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0eee9' }}>
                    <td style={{ padding: '10px', color: '#665f58' }}>{g.timestamp}</td>
                    <td style={{ padding: '10px', color: '#2d3725' }}>{g.voltage} В</td>
                    <td style={{ padding: '10px', color: '#2d3725' }}>{g.current} А</td>
                    <td style={{ padding: '10px', color: '#2d3725' }}>{g.pressure} бар</td>
                  </tr>
                ))}
                {goLogs.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center', color: '#665f58' }}>Нет данных</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}