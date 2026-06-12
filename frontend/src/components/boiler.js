import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useIncidents } from '../context/incident'
import { handleApiResponse } from '../api/client'

export const BoilerCard = ({ boiler, onOnlineChange }) => {
  const { role, logSystemEvent, loadBoilers, unblockBoiler } = useIncidents()
  const [v, setV] = useState(0)
  const [i, setI] = useState(0)
  const [pressure, setPressure] = useState(0)
  const [isOnline, setIsOnline] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [localBlock, setLocalBlock] = useState(false)
  
  const [activeMetric, setActiveMetric] = useState('pressure')
  const activeMetricRef = useRef('pressure')
  
  const canvasRef = useRef(null)
  const historyRef = useRef([])
  const isTriggeringBlock = useRef(false)
  
  const loadBoilersRef = useRef(loadBoilers)
  useEffect(() => { loadBoilersRef.current = loadBoilers }, [loadBoilers])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
    for (let x = 15; x < width; x += 30) {
      for (let y = 15; y < height; y += 30) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const points = historyRef.current
    if (points.length < 2) return

    const currentMetric = activeMetricRef.current

    const drawLine = (dataKey, maxValue, metricKey) => {
      const isActive = currentMetric === metricKey
      
      ctx.beginPath()
      ctx.strokeStyle = isActive ? '#4a5542' : 'rgba(0, 0, 0, 0.06)'
      ctx.lineWidth = isActive ? 2.5 : 1.5 
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      
      points.forEach((p, idx) => {
        const x = (idx / (Math.max(points.length - 1, 1))) * width
        const y = height - (p[dataKey] / maxValue) * height
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    const metrics = [
      { key: 'v', max: 260, name: 'voltage' },
      { key: 'i', max: 20, name: 'current' },
      { key: 'p', max: 15, name: 'pressure' }
    ]

    metrics.forEach(m => {
      if (currentMetric !== m.name) {
        drawLine(m.key, m.max, m.name)
      }
    })
    
    const activeM = metrics.find(m => m.name === currentMetric)
    if (activeM) {
      drawLine(activeM.key, activeM.max, activeM.name)
    }
  }, [])

  const handleMetricChange = (metric) => {
    setActiveMetric(metric)
    activeMetricRef.current = metric
    drawChart()
  }

  const showNotification = (msg) => {
    setStatusMessage(msg)
    setTimeout(() => { setStatusMessage('') }, 4000)
  }

  const handleSendCommand = async (commandName) => {
    if (!boiler.network_address || boiler.is_blocked || localBlock) return
    showNotification(`Отправка команды: ${commandName}...`)
    try {
      let url = boiler.network_address
      if (!url.startsWith('http')) url = 'http://' + url

      const res = await fetch(`${url}/api/boiler/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandName, boilerId: boiler.id })
      })
      handleApiResponse(res)
      await logSystemEvent('Команда оператора', { boilerId: boiler.id, command: commandName })
      showNotification(`Команда выполнена: ${commandName}`)
    } catch (err) {
      showNotification(err.message || 'Ошибка подключения')
    }
  }

  useEffect(() => {
    let isActive = true

    if (!boiler.network_address) {
      setIsOnline(false)
      setV(0)
      setI(0)
      setPressure(0)
      historyRef.current = []
      clearCanvas()
      return
    }

    const timer = setInterval(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 900)

      let url = boiler.network_address
      if (!url.startsWith('http')) url = 'http://' + url

      try {
        const res = await fetch(`${url}/api/boiler/stats`, { signal: controller.signal })
        clearTimeout(timeoutId)
        
        if (!isActive) return
        
        if (res.status === 503) {
          setIsOnline(true)
          setLocalBlock(true)
          if (!boiler.is_blocked) {
            loadBoilersRef.current()
          }
          return
        }

        if (!res.ok) {
          throw new Error('err')
        }
        
        const data = await res.json()
        
        setIsOnline(true)
        if (localBlock) {
          setLocalBlock(false)
        }
        if (boiler.is_blocked) {
          loadBoilersRef.current()
        }

        setV(data.voltage)
        setI(data.current)
        setPressure(data.pressure)

        if (data.pressure >= (boiler.max_pressure || 8.0)) {
          if (!isTriggeringBlock.current) {
            isTriggeringBlock.current = true
            
            await fetch(`${url}/api/boiler/emergency-shutdown`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).catch(() => {})
            
            loadBoilersRef.current()
          }
          setLocalBlock(true)
          setV(0)
          setI(0)
          setPressure(0)
          historyRef.current = []
          clearCanvas()
          return
        }
        
        isTriggeringBlock.current = false
    
        historyRef.current.push({ v: data.voltage, i: data.current, p: data.pressure, time: Date.now() })
        
        if (historyRef.current.length > 60) {
            historyRef.current.shift()
        }
        
        drawChart()
      } catch (err) {
        clearTimeout(timeoutId)
        if (!isActive) return
        setIsOnline(false)
        setV(0)
        setI(0)
        setPressure(0)
        historyRef.current = []
        clearCanvas()
      }
    }, 1000)
    
    return () => {
      isActive = false
      clearInterval(timer)
    }
  }, [boiler.id, boiler.network_address, boiler.max_pressure, boiler.is_blocked, localBlock, clearCanvas, drawChart]) 

  useEffect(() => {
    if (typeof onOnlineChange === 'function') {
      onOnlineChange(boiler.id, isOnline)
    }
  }, [boiler.id, isOnline, onOnlineChange])

  const isEffectivelyBlocked = boiler.is_blocked || localBlock

  return (
    <div style={{ border: `2px solid ${isEffectivelyBlocked ? '#9c5454' : '#c5bba8'}`, padding: '20px', margin: '20px 0', background: '#ffffff', fontFamily: 'sans-serif', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eae6df', paddingBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, color: '#2d3725', fontSize: '18px' }}>Котел: {boiler.name}</h4>
          <small style={{ color: '#665f58' }}>Макс. давление: <span style={{ color: '#9c5454', fontWeight: 'bold' }}>{boiler.max_pressure} МПа</span></small>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
          <span style={{ fontWeight: 'bold', color: isOnline ? '#4a5542' : '#8c7257' }}>
            {isOnline ? 'В сети' : 'Отключен'}
          </span>
          {isEffectivelyBlocked && <span style={{ fontWeight: 'bold', background: '#9c5454', color: '#fff', padding: '3px 8px', fontSize: '11px', borderRadius: '4px', letterSpacing: '0.5px' }}>ЗАБЛОКИРОВАН</span>}
        </div>
      </div>
      
      {statusMessage && (
        <div style={{ margin: '15px 0', padding: '10px', background: '#ebd6d6', color: '#9c5454', fontSize: '13px', border: '1px solid #9c5454', borderRadius: '4px' }}>
          {statusMessage}
        </div>
      )}
      
      {isOnline && !isEffectivelyBlocked ? (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', fontWeight: 'bold', fontSize: '15px' }}>
            <div style={{ color: activeMetric === 'pressure' ? '#4a5542' : '#a8a398', transition: 'color 0.3s' }}>Давление: {pressure} МПа</div>
            <div style={{ color: activeMetric === 'current' ? '#4a5542' : '#a8a398', transition: 'color 0.3s' }}>Ток: {i} А</div>
            <div style={{ color: activeMetric === 'voltage' ? '#4a5542' : '#a8a398', transition: 'color 0.3s' }}>Напряжение: {v} В</div>
          </div>
    
          <div style={{ border: '1px solid #eae6df', background: '#faf9f7', padding: '10px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
               <button 
                 onClick={() => handleMetricChange('pressure')} 
                 style={{ fontSize: '12px', padding: '5px 12px', background: activeMetric === 'pressure' ? '#4a5542' : '#eae6df', color: activeMetric === 'pressure' ? '#fff' : '#665f58', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', transition: 'all 0.2s' }}
               >
                 Давление
               </button>
               <button 
                 onClick={() => handleMetricChange('current')} 
                 style={{ fontSize: '12px', padding: '5px 12px', background: activeMetric === 'current' ? '#4a5542' : '#eae6df', color: activeMetric === 'current' ? '#fff' : '#665f58', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', transition: 'all 0.2s' }}
               >
                 Ток
               </button>
               <button 
                 onClick={() => handleMetricChange('voltage')} 
                 style={{ fontSize: '12px', padding: '5px 12px', background: activeMetric === 'voltage' ? '#4a5542' : '#eae6df', color: activeMetric === 'voltage' ? '#fff' : '#665f58', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', transition: 'all 0.2s' }}
               >
                 Напряжение
               </button>
            </div>
            <canvas ref={canvasRef} width="500" height="180" style={{ display: 'block', width: '100%', background: '#fdfdfc', borderRadius: '4px', border: '1px solid #e0dbd3' }} />
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px 20px', color: '#9c5454', fontWeight: isEffectivelyBlocked ? 'bold' : 'normal', textAlign: 'center', background: isEffectivelyBlocked ? '#ebd6d6' : 'transparent', borderRadius: '4px', marginTop: '20px' }}>
          {isEffectivelyBlocked ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontSize: '18px', color: '#9c5454' }}>КОТЕЛ ОСТАНОВЛЕН</div>
              <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#665f58' }}>Работа приостановлена. Ожидается возобновление начальником смены.</div>
              {role === 'chief' && (
                <button 
                  onClick={() => {
                    setLocalBlock(false);
                    unblockBoiler(boiler.id, boiler.network_address);
                  }} 
                  style={{ padding: '10px 20px', background: '#9c5454', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
                >
                  Разблокировать аппарат и возобновить работу
                </button>
              )}
            </div>
          ) : 'Нет связи с устройством.'}
        </div>
      )}
      
      {role === 'operator' && isOnline && !isEffectivelyBlocked && (
        <div style={{ gap: '15px', display: 'flex', marginTop: '20px' }}>
          <button onClick={() => handleSendCommand('open_valve')} style={{ flex: 1, padding: '10px 15px', background: '#4a5542', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
            Открыть задвижку
          </button>
          <button onClick={() => handleSendCommand('release_steam')} style={{ flex: 1, padding: '10px 15px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
            Пустить пар
          </button>
        </div>
      )}
    </div>
  )
}