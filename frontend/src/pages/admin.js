import React, { useEffect, useState } from 'react'
import { useIncidents } from '../context/incident'
import { useNavigate } from 'react-router-dom'

export const AdminPage = () => {
  const { user, users, deletedUsers, systemLogs, loadProfiles, loadDeletedUsers, loadSystemLogs, changeUserFields, deleteUser, restoreUser } = useIncidents()
  const navigate = useNavigate()
  
  const [editingUserId, setEditingUserId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [logInterval, setLogInterval] = useState('5m')
  const [searchUser, setSearchUser] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [userTab, setUserTab] = useState('active')

  useEffect(() => {
    loadProfiles()
    loadDeletedUsers()
    loadSystemLogs()
  }, [loadProfiles, loadDeletedUsers, loadSystemLogs, user])

  const handleEditClick = (u) => {
    setEditingUserId(u.id)
    setEditRole(u.role)
    setEditEmail(u.email)
  }

  const handleSave = async (userId) => {
    try {
      await changeUserFields(userId, editRole, editEmail)
      setEditingUserId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (userId) => {
    if (window.confirm('Поместить пользователя в корзину?')) {
      try {
        await deleteUser(userId)
      } catch (err) {
        alert(err.message)
      }
    }
  }

  const handleRestore = async (userId) => {
    try {
      await restoreUser(userId)
    } catch (err) {
      alert(err.message)
    }
  }

  const parseDate = (ts) => {
    if (!ts) return null
    const d = new Date(ts)
    if (!isNaN(d.getTime())) return d
    const n = Number(ts)
    return !isNaN(n) ? new Date(n > 1e12 ? n : n * 1000) : null
  }

  const downloadSystemLogs = () => {
    const limits = { '5m': 5, '1h': 60, '1d': 1440, '1m': 43200 }
    const mins = limits[logInterval] || 5
    const now = Date.now()
    const filtered = systemLogs.filter(log => {
      const t = parseDate(log.timestamp)
      return t && (now - t.getTime()) / 60000 <= mins
    })
    if (filtered.length === 0) return alert('Нет данных за выбранный период')
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filtered, null, 2))
    const a = document.createElement('a')
    a.href = dataStr
    a.download = `system_logs_${logInterval}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const filteredUsers = users.filter(u => 
    (roleFilter === 'all' || u.role === roleFilter) &&
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  )

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', background: '#f5f2eb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #c5bba8', paddingBottom: '15px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ padding: '10px 15px', background: '#4e6e4e', color: '#fff', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}>
            Панель управления
          </button>
          <button onClick={() => navigate('/mail')} style={{ padding: '10px 15px', background: '#e8e5d9', color: '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}>
            Почта
          </button>
          <button onClick={() => navigate('/profile')} style={{ padding: '10px 15px', background: '#e8e5d9', color: '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}>
            Профиль
          </button>
        </div>
        <div>
          <span style={{ marginRight: '15px', color: '#665f58' }}>Пользователь: {user?.email}</span>
          <button onClick={() => { loadProfiles(); loadDeletedUsers(); loadSystemLogs() }} style={{ padding: '8px 15px', background: '#f5f2eb', border: '1px solid #c5bba8', cursor: 'pointer', marginRight: '10px', borderRadius: '4px', color: '#2d3725' }}>Обновить</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ border: '1px solid #c5bba8', padding: '20px', background: '#ffffff', borderRadius: '4px' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => setUserTab('active')} style={{ flex: 1, padding: '10px', background: userTab === 'active' ? '#e8e5d9' : 'transparent', border: 'none', borderBottom: userTab === 'active' ? '2px solid #2d3725' : '2px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}>Активные пользователи</button>
            <button onClick={() => setUserTab('deleted')} style={{ flex: 1, padding: '10px', background: userTab === 'deleted' ? '#ebd6d6' : 'transparent', border: 'none', borderBottom: userTab === 'deleted' ? '2px solid #9c5454' : '2px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}>Корзина ({deletedUsers.length})</button>
          </div>
          
          {userTab === 'active' && (
            <>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input type="text" placeholder="Поиск по email..." value={searchUser} onChange={e => setSearchUser(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #c5bba8', borderRadius: '4px' }} />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '8px', border: '1px solid #c5bba8', borderRadius: '4px' }}>
                  <option value="all">Все роли</option>
                  <option value="admin">Администратор</option>
                  <option value="chief">Начальник</option>
                  <option value="operator">Оператор</option>
                  <option value="pending">В ожидании</option>
                </select>
              </div>

              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #c5bba8', textAlign: 'left', background: '#f5f2eb' }}>
                      <th style={{ padding: '10px', color: '#2d3725' }}>Email</th>
                      <th style={{ padding: '10px', color: '#2d3725' }}>Роль</th>
                      <th style={{ padding: '10px', color: '#2d3725' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f0eee9' }}>
                        <td style={{ padding: '10px', color: '#2d3725' }}>
                          {editingUserId === u.id ? (
                            <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ padding: '6px', border: '1px solid #c5bba8', width: '100%', borderRadius: '4px' }} />
                          ) : (
                            u.email
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          {editingUserId === u.id ? (
                            <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ padding: '6px', border: '1px solid #c5bba8', borderRadius: '4px' }}>
                              <option value="pending">В ожидании</option>
                              <option value="operator">Оператор</option>
                              <option value="chief">Начальник</option>
                              <option value="admin">Администратор</option>
                            </select>
                          ) : (
                            <span style={{ color: u.role === 'admin' ? '#9c5454' : u.role === 'chief' ? '#8c7257' : u.role === 'operator' ? '#4e6e4e' : '#665f58', fontWeight: '500' }}>{u.role}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                          {editingUserId === u.id ? (
                            <>
                              <button onClick={() => handleSave(u.id)} style={{ padding: '6px 10px', background: '#4e6e4e', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Сохранить</button>
                              <button onClick={() => setEditingUserId(null)} style={{ padding: '6px 10px', background: '#f5f2eb', color: '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}>Отмена</button>
                            </>
                          ) : (
                            u.id === user?.id ? (
                              <span style={{ color: '#9c5454', fontSize: '12px' }}>Текущий профиль</span>
                            ) : (
                              <>
                                <button onClick={() => handleEditClick(u)} style={{ padding: '6px 10px', background: '#f5f2eb', color: '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}>Изменить</button>
                                <button onClick={() => handleDelete(u.id)} style={{ padding: '6px 10px', background: '#9c5454', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Удалить</button>
                              </>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan="3" style={{ padding: '15px', textAlign: 'center', color: '#665f58' }}>Пользователи не найдены</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {userTab === 'deleted' && (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #c5bba8', textAlign: 'left', background: '#f5f2eb' }}>
                    <th style={{ padding: '10px', color: '#2d3725' }}>Email</th>
                    <th style={{ padding: '10px', color: '#2d3725' }}>Роль</th>
                    <th style={{ padding: '10px', color: '#2d3725' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f0eee9' }}>
                      <td style={{ padding: '10px', color: '#2d3725' }}>{u.email}</td>
                      <td style={{ padding: '10px' }}><span style={{ color: '#665f58', fontWeight: '500' }}>{u.role}</span></td>
                      <td style={{ padding: '10px' }}>
                        <button onClick={() => handleRestore(u.id)} style={{ padding: '6px 10px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Восстановить</button>
                      </td>
                    </tr>
                  ))}
                  {deletedUsers.length === 0 && (
                    <tr><td colSpan="3" style={{ padding: '15px', textAlign: 'center', color: '#665f58' }}>Корзина пуста</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #c5bba8', padding: '20px', background: '#ffffff', borderRadius: '4px' }}>
          <h3 style={{ marginTop: 0, color: '#2d3725' }}>Журнал событий</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, color: '#2d3725' }}>
              Период:
              <select value={logInterval} onChange={e => setLogInterval(e.target.value)} style={{ padding: '8px', border: '1px solid #c5bba8', borderRadius: '4px' }}>
                <option value="5m">Последние 5 минут</option>
                <option value="1h">Последний час</option>
                <option value="1d">Последний день</option>
                <option value="1m">Последний месяц</option>
              </select>
            </label>
            <button onClick={downloadSystemLogs} style={{ padding: '8px 15px', background: '#4e6e4e', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              Скачать отчет
            </button>
          </div>
          <div style={{ height: '500px', overflowY: 'auto', border: '1px solid #c5bba8', padding: '15px', background: '#f5f2eb', fontSize: '13px', borderRadius: '4px' }}>
            {systemLogs.length === 0 ? (
              <div style={{ color: '#665f58', textAlign: 'center', marginTop: '20px' }}>Журнал событий пуст</div>
            ) : (
              systemLogs.map((log, index) => (
                <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #e8e5d9' }}>
                  <span style={{ color: '#8c7257' }}>[{new Date(log.timestamp).toLocaleString()}]</span>{' '}
                  <span style={{ color: '#4e6e4e', fontWeight: '500' }}>{log.user}:</span>{' '}
                  <span style={{ color: '#2d3725' }}>{log.action}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}