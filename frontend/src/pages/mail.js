import React, { useEffect, useState, useCallback } from 'react'
import { useIncidents } from '../context/incident'
import { useNavigate } from 'react-router-dom'
import { request } from '../api/client'

export const MailPage = () => {
  const { user, contacts, loadContacts, sendMessage, logout } = useIncidents()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('inbox')
  const [inbox, setInbox] = useState([])
  const [sent, setSent] = useState([])
  const [selectedMail, setSelectedMail] = useState(null)
  const [loading, setLoading] = useState(false)

  const [recipientId, setRecipientId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')

  const fetchInbox = useCallback(async () => {
    setLoading(true)
    try {
      const res = await request('/messages/inbox')
      setInbox(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await request('/messages/sent')
      setSent(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContacts()
    fetchInbox()
    fetchSent()
  }, [loadContacts, fetchInbox, fetchSent])

  const openMail = async (id) => {
    setLoading(true)
    try {
      const res = await request(`/messages/${id}`)
      setSelectedMail(await res.json())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const reply = () => {
    const contact = contacts.find(c => c.email === selectedMail.from)
    if (contact) setRecipientId(contact.id)
    setSubject(selectedMail.subject.startsWith('Re:') ? selectedMail.subject : `Re: ${selectedMail.subject}`)
    setActiveTab('compose')
    setSelectedMail(null)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    setStatus('')
    try {
      await sendMessage(recipientId, subject, body)
      setStatus('Письмо успешно отправлено')
      setSubject('')
      setBody('')
      setRecipientId('')
      fetchInbox()
      fetchSent()
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', background: '#f5f2eb', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2d3725' }}>Внутренняя почта</h2>
          <div style={{ color: '#665f58' }}>{user?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 18px', background: '#e8e5d9', border: '1px solid #c5bba8', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Назад</button>
          <button onClick={async () => { await logout(); navigate('/') }} style={{ padding: '10px 18px', background: '#9c5454', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Выйти</button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #c5bba8', borderRadius: '4px', overflow: 'hidden' }}>
        
        {selectedMail ? (
          <div style={{ padding: '30px' }}>
            <button onClick={() => setSelectedMail(null)} style={{ padding: '8px 15px', background: '#e8e5d9', border: '1px solid #c5bba8', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>Назад к списку</button>
            <h3 style={{ marginTop: 0, color: '#2d3725' }}>{selectedMail.subject}</h3>
            <div style={{ color: '#665f58', marginBottom: '20px', borderBottom: '1px solid #f0eee9', paddingBottom: '15px' }}>
              <div><strong>От:</strong> {selectedMail.from}</div>
              {selectedMail.to && <div><strong>Кому:</strong> {selectedMail.to}</div>}
              <div><strong>Дата:</strong> {new Date(selectedMail.date).toLocaleString('ru-RU')}</div>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', color: '#2d3725', lineHeight: '1.6' }}>{selectedMail.body}</pre>
            <button onClick={reply} style={{ padding: '10px 20px', background: '#4e6e4e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}>Ответить</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', background: '#e8e5d9', borderBottom: '1px solid #c5bba8' }}>
              <button 
                onClick={() => { setActiveTab('inbox'); fetchInbox(); setStatus(''); }}
                style={{ flex: 1, padding: '15px', border: 'none', cursor: 'pointer', background: activeTab === 'inbox' ? '#fff' : 'transparent', fontWeight: activeTab === 'inbox' ? 'bold' : 'normal', color: '#2d3725', fontFamily: 'inherit' }}
              >
                Входящие ({inbox.length})
              </button>
              <button 
                onClick={() => { setActiveTab('sent'); fetchSent(); setStatus(''); }}
                style={{ flex: 1, padding: '15px', border: 'none', cursor: 'pointer', background: activeTab === 'sent' ? '#fff' : 'transparent', fontWeight: activeTab === 'sent' ? 'bold' : 'normal', color: '#2d3725', fontFamily: 'inherit' }}
              >
                Отправленные ({sent.length})
              </button>
              <button 
                onClick={() => { setActiveTab('compose'); setStatus(''); }}
                style={{ flex: 1, padding: '15px', border: 'none', cursor: 'pointer', background: activeTab === 'compose' ? '#fff' : 'transparent', fontWeight: activeTab === 'compose' ? 'bold' : 'normal', color: '#2d3725', fontFamily: 'inherit' }}
              >
                Написать письмо
              </button>
            </div>

            <div style={{ padding: '30px' }}>
              
              {activeTab === 'inbox' && (
                <div>
                  {loading ? (
                    <div style={{ textAlign: 'center', color: '#665f58', padding: '20px' }}>Обновление...</div>
                  ) : inbox.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#665f58', padding: '40px', background: '#f9f8f6', borderRadius: '4px' }}>
                      Папка входящих пуста
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {inbox.map(msg => (
                        <div key={msg.id} onClick={() => openMail(msg.id)} style={{ padding: '15px', border: '1px solid #e8e5d9', borderRadius: '4px', background: '#f9f8f6', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong style={{ color: '#2d3725' }}>От: {msg.from}</strong>
                            <span style={{ fontSize: '12px', color: '#8c7257' }}>{new Date(msg.date).toLocaleString('ru-RU')}</span>
                          </div>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#4a5542' }}>{msg.subject}</div>
                          <div style={{ color: '#665f58', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.snippet}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'sent' && (
                <div>
                  {loading ? (
                    <div style={{ textAlign: 'center', color: '#665f58', padding: '20px' }}>Обновление...</div>
                  ) : sent.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#665f58', padding: '40px', background: '#f9f8f6', borderRadius: '4px' }}>
                      Папка отправленных пуста
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {sent.map(msg => (
                        <div key={msg.id} onClick={() => openMail(msg.id)} style={{ padding: '15px', border: '1px solid #e8e5d9', borderRadius: '4px', background: '#f9f8f6', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong style={{ color: '#2d3725' }}>Кому: {msg.to}</strong>
                            <span style={{ fontSize: '12px', color: '#8c7257' }}>{new Date(msg.date).toLocaleString('ru-RU')}</span>
                          </div>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#4a5542' }}>{msg.subject}</div>
                          <div style={{ color: '#665f58', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.snippet}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'compose' && (
                <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <select value={recipientId} onChange={e => setRecipientId(e.target.value)} required style={{ padding: '12px', border: '1px solid #c5bba8', borderRadius: '4px', outline: 'none', fontFamily: 'inherit', fontSize: '14px', background: '#fff' }}>
                    <option value="">Выберите получателя...</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>{contact.email} ({contact.role})</option>
                    ))}
                  </select>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Тема письма" required style={{ padding: '12px', border: '1px solid #c5bba8', borderRadius: '4px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }} />
                  <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Текст сообщения" required rows={8} style={{ padding: '12px', border: '1px solid #c5bba8', borderRadius: '4px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }} />
                  
                  <button type="submit" style={{ padding: '14px 20px', background: '#4e6e4e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', fontFamily: 'inherit' }}>
                    Отправить
                  </button>

                  {status && (
                    <div style={{ marginTop: '15px', padding: '12px', background: status.includes('Ошибка') ? '#ebd6d6' : '#d3dfd3', color: status.includes('Ошибка') ? '#9c5454' : '#4e6e4e', borderRadius: '4px', textAlign: 'center', fontFamily: 'inherit' }}>
                      {status}
                    </div>
                  )}
                </form>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  )
}