import React, { useEffect, useState, useCallback } from 'react'
import { useIncidents } from '../context/incident'
import { BoilerCard } from '../components/boiler'
import { useNavigate } from 'react-router-dom'

export const MainPage = () => {
  const { user, role, boilers, stopRequests, assignments, operators, deletedBoilers, loadBoilers, loadAssignments, loadOperators, loadStopRequests, approveStopRequest, rejectStopRequest, addBoiler, deleteBoiler, restoreBoiler, logout } = useIncidents()
  const [boilerOnline, setBoilerOnline] = useState({})
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchBoiler, setSearchBoiler] = useState('')
  const [filterType, setFilterType] = useState('all')
  const navigate = useNavigate()

  const [newBoiler, setNewBoiler] = useState({ name: '', type: 'gas', max_pressure: '', network_address: '' })

  useEffect(() => {
    if (role === null) return
    if (role !== 'admin') {
      loadBoilers()
      loadAssignments()
      if (role === 'chief') {
        loadOperators()
        loadStopRequests()
      }
    }
  }, [role, loadBoilers, loadAssignments, loadOperators, loadStopRequests])

  const handleBoilerOnlineChange = useCallback((boilerId, isOnline) => {
    setBoilerOnline(prev => prev[boilerId] === isOnline ? prev : { ...prev, [boilerId]: isOnline })
  }, [])

  const handleAddBoiler = async (e) => {
    e.preventDefault()
    if (!newBoiler.max_pressure) return alert('Укажите максимальное давление')
    
    const addr = newBoiler.network_address.trim()
    const urlPattern = /^(https:\/\/)?([\w.-]+|\[[a-fA-O0-9:]+\])(:\d+)?(\/.*)?$/i
    if (!urlPattern.test(addr)) {
      return alert('Неверный формат сетевого адреса аппарата. Допускаются только IP/хост и порт.')
    }

    try {
      await addBoiler({ ...newBoiler, network_address: addr })
      setNewBoiler({ name: '', type: 'gas', max_pressure: '', network_address: '' })
    } catch (err) {
      alert('Ошибка добавления котла: ' + err.message)
    }
  }

  const handleDeleteBoiler = async (id) => {
    if (window.confirm('Поместить данный котел в корзину?')) {
      try {
        await deleteBoiler(id)
      } catch (err) {
        alert('Ошибка удаления: ' + err.message)
      }
    }
  }

  if (role === null) return null

  if (role === 'pending') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f2eb', color: '#2d3725', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <div style={{ border: '2px dashed #9c5454', padding: '40px', maxWidth: '500px', background: '#fff', borderRadius: '4px' }}>
          <h2 style={{ color: '#9c5454', marginTop: 0 }}>Ожидание подтверждения</h2>
          <p style={{ color: '#665f58' }}>Ваша учетная запись ожидает назначения роли администратором.</p>
          <button onClick={async () => { await logout(); navigate('/') }} style={{ marginTop: '20px', padding: '10px 18px', background: '#9c5454', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
            Выйти
          </button>
        </div>
      </div>
    )
  }

  const isOperator = role === 'operator'
  
  const displayBoilers = boilers.filter(b => {
    if (b.is_deleted === true) return false
    if (isOperator) {
      return assignments.some(a => a.boiler_id === b.id && a.operator_id === user?.id)
    }
    return true
  })

  const filteredBoilers = displayBoilers.filter(b => 
    (filterType === 'all' || b.type === filterType) &&
    b.name.toLowerCase().includes(searchBoiler.toLowerCase())
  )

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', background: '#f5f2eb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #c5bba8', paddingBottom: '15px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={{ padding: '10px 15px', background: activeTab === 'dashboard' ? '#4a5542' : '#e8e5d9', color: activeTab === 'dashboard' ? '#fff' : '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}
          >
            Панель управления
          </button>
          {role === 'chief' && (
            <button 
              onClick={() => setActiveTab('cart')} 
              style={{ padding: '10px 15px', background: activeTab === 'cart' ? '#8c7257' : '#e8e5d9', color: activeTab === 'cart' ? '#fff' : '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}
            >
              Корзина ({deletedBoilers?.length || 0})
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/mail')} style={{ padding: '10px 20px', background: '#4a5542', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
            Почта
          </button>
          <button onClick={() => navigate('/profile')} style={{ padding: '10px 20px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
            Профиль
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && role !== 'admin' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Поиск по названию..." 
              value={searchBoiler} 
              onChange={e => setSearchBoiler(e.target.value)} 
              style={{ flex: 1, padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} 
            />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }}>
              <option value="all">Все типы</option>
              <option value="gas">Газовый</option>
              <option value="steam">Паровой</option>
              <option value="electric">Электрический</option>
            </select>
          </div>

          {role === 'operator' && (
            <div>
              <h3 style={{ color: '#2d3725' }}>Управляемые аппараты</h3>
              {filteredBoilers.length === 0 && <p style={{ color: '#665f58' }}>Нет доступных узлов по заданным фильтрам или вы еще не назначены на смену.</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {filteredBoilers.map(b => {
                  const online = boilerOnline[b.id] === true
                  const disabled = !b.network_address || !online || b.is_blocked
                  return (
                    <div key={b.id} style={{ border: '1px solid #c5bba8', padding: '20px', background: '#fff', borderRadius: '4px' }}>
                      <BoilerCard boiler={b} onOnlineChange={handleBoilerOnlineChange} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                        <button
                          onClick={() => !disabled && navigate(`/boiler/${b.id}/form`)}
                          disabled={disabled}
                          style={{ width: '100%', padding: '12px', background: disabled ? '#e8e5d9' : '#4a5542', color: disabled ? '#665f58' : '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
                        >
                          Настройки параметров
                        </button>
                        <button
                          onClick={() => !disabled && navigate(`/boiler/${b.id}/emergency-stop`)}
                          disabled={disabled}
                          style={{ width: '100%', padding: '12px', background: disabled ? '#e8e5d9' : '#9c5454', color: disabled ? '#665f58' : '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
                        >
                          Остановить котел
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {role === 'chief' && (
            <div>
              <div style={{ padding: '20px', background: '#ffffff', border: '1px solid #c5bba8', marginBottom: '25px', borderRadius: '4px' }}>
                <h4 style={{ marginTop: 0, color: '#2d3725' }}>Добавить новый котел</h4>
                <form onSubmit={handleAddBoiler} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Название аппарата" required value={newBoiler.name} onChange={e => setNewBoiler({...newBoiler, name: e.target.value})} style={{ flex: 1, padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} />
                  <select value={newBoiler.type} onChange={e => setNewBoiler({...newBoiler, type: e.target.value})} style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }}>
                    <option value="gas">Газовый</option>
                    <option value="steam">Паровой</option>
                    <option value="electric">Электрический</option>
                  </select>
                  <input type="text" inputMode="decimal" placeholder="Макс. давление (МПа)" required value={newBoiler.max_pressure}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                      setNewBoiler(prev => ({ ...prev, max_pressure: val }))
                    }}
                    style={{ width: '180px', padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px', outline: 'none' }}
                  />                  
                  <input type="text" placeholder="Сетевой адрес" value={newBoiler.network_address} onChange={e => setNewBoiler({...newBoiler, network_address: e.target.value})} style={{ flex: 1, padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} />
                  <button type="submit" style={{ padding: '10px 20px', background: '#4a5542', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Добавить</button>
                </form>
              </div>

              <h3 style={{ color: '#2d3725' }}>Управление аппаратами</h3>
              {filteredBoilers.length === 0 && <p style={{ color: '#665f58' }}>Аппараты не найдены.</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {filteredBoilers.map(b => {
                  const activeRequests = stopRequests.filter(r => r.boiler_id === b.id)
                  return (
                    <div key={b.id} style={{ border: '1px solid #c5bba8', padding: '20px', background: '#fff', borderRadius: '4px', position: 'relative' }}>
                      <BoilerCard boiler={b} onOnlineChange={handleBoilerOnlineChange} />

                      {activeRequests.map(req => {
                        const opUser = operators.find(o => o.id === req.operator_id)
                        return (
                          <div key={req.id} style={{ border: '1px solid #9c5454', background: '#ebd6d6', padding: '15px', marginTop: '15px', borderRadius: '4px' }}>
                            <div style={{ fontWeight: '500', color: '#9c5454', marginBottom: '10px' }}>
                              Запрос на остановку от оператора ({opUser?.email || 'ID: ' + req.operator_id})
                            </div>
                            <div style={{ marginBottom: '15px', background: '#fff', padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px', color: '#2d3725' }}>
                              <strong>Причина:</strong> {req.reason}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => approveStopRequest(req.id, b.id, req.reason, b.network_address)} style={{ flex: 1, padding: '10px', background: '#9c5454', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                                Подтвердить
                              </button>
                              <button onClick={() => rejectStopRequest(req.id)} style={{ flex: 1, padding: '10px', background: '#f5f2eb', color: '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}>
                                Отклонить
                              </button>
                            </div>
                          </div>
                        )
                      })}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => navigate(`/boiler/${b.id}`)} style={{ padding: '12px', background: '#4a5542', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                          Управление операторами
                        </button>
                        <button onClick={() => navigate(`/boiler/${b.id}/form`)} style={{ padding: '12px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                          История показаний
                        </button>
                        <button onClick={() => handleDeleteBoiler(b.id)} style={{ padding: '10px', background: '#f5f2eb', color: '#9c5454', border: '1px solid #9c5454', cursor: 'pointer', borderRadius: '4px', marginTop: '10px' }}>
                          Переместить в корзину
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'cart' && role === 'chief' && (
        <div>
          <h3 style={{ color: '#2d3725' }}>Корзина</h3>
          {deletedBoilers?.length === 0 && <p style={{ color: '#665f58' }}>Корзина пуста.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
            {deletedBoilers?.map(b => (
              <div key={b.id} style={{ border: '1px solid #c5bba8', padding: '20px', background: '#fff', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', flex: 1 }}>
                  <div><small style={{color:'#665f58'}}>Название:</small><br/><strong>{b.name}</strong></div>
                  <div><small style={{color:'#665f58'}}>Тип:</small><br/>{b.type === 'gas' ? 'Газовый' : b.type === 'steam' ? 'Паровой' : 'Электрический'}</div>
                  <div><small style={{color:'#665f58'}}>Макс. Давление:</small><br/>{b.max_pressure} МПа</div>
                  <div><small style={{color:'#665f58'}}>Адрес:</small><br/>{b.network_address || 'Нет адреса'}</div>
                </div>
                <button onClick={() => restoreBoiler(b.id)} style={{ padding: '12px 20px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', marginLeft: '20px' }}>
                  Восстановить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}