import React, { useState, useEffect, useRef } from 'react'
import { useIncidents } from '../context/incident'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'

export const ProfilePage = () => {
  const { user, role, changePassword, logout, setupMfa, enableMfa, disableMfa } = useIncidents()
  const [activeTab, setActiveTab] = useState('password')
  const [mfaStep, setMfaStep] = useState('setup')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const [msgTab, setMsgTab] = useState('')
  const [isErrorTab, setIsErrorTab] = useState(false)
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (mfaStep === 'setup' && mfaSecret && canvasRef.current && mfaSecret.otpauth_url) {
      QRCode.toCanvas(canvasRef.current, mfaSecret.otpauth_url, { width: 200 }, (err) => {
        if (err) {
          console.error(err)
          setMsgTab('Ошибка при генерации QR-кода')
          setIsErrorTab(true)
        }
      })
    }
  }, [mfaSecret, mfaStep])

  useEffect(() => {
    if (activeTab === '2fa') {
      const loadMfa = async () => {
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
          const res = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' })
          const data = await res.json()
          setMfaEnabled(data.user.mfa_enabled)
          setMfaStep('setup')
          
          if (!data.user.mfa_enabled) {
            const setupRes = await setupMfa()
            setMfaSecret(setupRes)
            setMsgTab('')
            setIsErrorTab(false)
          } else {
            setIsErrorTab(false)
          }
        } catch (err) {
          setMsgTab(err.message || 'Ошибка при загрузке настроек 2FA')
          setIsErrorTab(true)
        }
      }
      loadMfa()
    }
  }, [activeTab, setupMfa])

  const getPwdStrength = (pwd) => {
    let score = 0
    let hints = []
    if (pwd.length >= 8) score += 33
    else hints.push('не менее 8 символов')
    if (/[A-Z]/.test(pwd)) score += 33
    else hints.push('заглавная буква')
    if (/[0-9]/.test(pwd)) score += 34
    else hints.push('цифра')
    return { score, hints }
  }

  const { score: pwdScore, hints: pwdHints } = getPwdStrength(newPassword)

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setMsg('')
    setIsError(false)
    
    if (newPassword !== confirmNewPassword) {
      setIsError(true)
      setMsg('Пароли не совпадают')
      return
    }

    if (pwdScore < 100) {
      setIsError(true)
      setMsg('Новый пароль недостаточно сложный')
      return
    }

    try {
      await changePassword(oldPassword, newPassword)
      setMsg('Пароль успешно обновлен')
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      setIsError(true)
      setMsg(err.message || 'Ошибка при смене пароля')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleBack = () => {
    if (role === 'admin') {
      navigate('/isolated-admin-gate/dashboard')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', background: '#f5f2eb', minHeight: '100vh' }}>
      <button onClick={handleBack} style={{ marginBottom: '20px', padding: '10px 20px', background: '#e8e5d9', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px', color: '#2d3725' }}>
        Назад
      </button>
      
      <div style={{ border: '1px solid #c5bba8', padding: '30px', background: '#ffffff', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0, color: '#2d3725', borderBottom: '1px solid #f0eee9', paddingBottom: '15px' }}>Профиль</h3>
        
        <div style={{ marginBottom: '25px', lineHeight: '1.8', color: '#2d3725' }}>
          <div><strong>Учетная запись:</strong> {user?.email}</div>
          <div><strong>Роль:</strong> <span style={{ color: '#4e6e4e' }}>{role === 'admin' ? 'Администратор' : role === 'chief' ? 'Начальник' : role === 'operator' ? 'Оператор' : role}</span></div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e8e5d9' }}>
          <button 
            onClick={() => { setActiveTab('password'); setMsg(''); setIsError(false) }}
            style={{ padding: '12px 20px', background: activeTab === 'password' ? '#8c7257' : '#e8e5d9', color: activeTab === 'password' ? '#fff' : '#2d3725', border: 'none', cursor: 'pointer', borderRadius: '4px 4px 0 0', fontWeight: activeTab === 'password' ? 'bold' : 'normal' }}
          >
          Смена пароля
          </button>
          <button 
            onClick={() => { setActiveTab('2fa'); setMsg(''); setIsError(false) }}
            style={{ padding: '12px 20px', background: activeTab === '2fa' ? '#8c7257' : '#e8e5d9', color: activeTab === '2fa' ? '#fff' : '#2d3725', border: 'none', cursor: 'pointer', borderRadius: '4px 4px 0 0', fontWeight: activeTab === '2fa' ? 'bold' : 'normal' }}
          >
            Google Authenticator
          </button>
        </div>

        {msg && (
          <div style={{ padding: '12px', background: isError ? '#ebd6d6' : '#d3dfd3', color: isError ? '#9c5454' : '#4e6e4e', border: `1px solid ${isError ? '#9c5454' : '#4e6e4e'}`, marginBottom: '20px', borderRadius: '4px' }}>
            {msg}
          </div>
        )}

        {msgTab && (
          <div style={{ padding: '12px', background: isErrorTab ? '#ebd6d6' : '#d3dfd3', color: isErrorTab ? '#9c5454' : '#4e6e4e', border: `1px solid ${isErrorTab ? '#9c5454' : '#4e6e4e'}`, marginBottom: '20px', borderRadius: '4px' }}>
            {msgTab}
          </div>
        )}
        
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>Старый пароль:
              <input 
                type="password" 
                value={oldPassword} 
                onChange={e => setOldPassword(e.target.value)} 
                style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} 
                required 
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>Новый пароль:
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} 
                required 
              />
            </label>

            {newPassword && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', height: '6px', background: '#e8e5d9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pwdScore}%`, background: pwdScore === 100 ? '#4e6e4e' : pwdScore > 33 ? '#8c7257' : '#9c5454', transition: 'width 0.3s' }}></div>
                </div>
                {pwdHints.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#9c5454', marginTop: '5px' }}>
                    Не хватает: {pwdHints.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>Повторите новый пароль:
                <input 
                  type="password" 
                  value={confirmNewPassword} 
                  onChange={e => setConfirmNewPassword(e.target.value)} 
                  style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} 
                  required 
                />
              </label>
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <div style={{ fontSize: '12px', color: '#9c5454' }}>
                  Пароли не совпадают
                </div>
              )}
            </div>
            
            <button type="submit" style={{ padding: '10px 20px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', borderRadius: '4px' }}>
              Сохранить пароль
            </button>
          </form>
        )}

        {activeTab === '2fa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {mfaEnabled ? (
              <div style={{ padding: '20px', background: '#e8f5e9', border: '1px solid #81c784', borderRadius: '4px', color: '#2e7d32' }}>
                <strong style={{ display: 'block', marginBottom: '12px' }}>2FA включена</strong>
                <p style={{ margin: 0, marginBottom: '15px', fontSize: '14px' }}>Google Authenticator включён для этой учетной записи. Вы будете вводить код 2FA при каждом входе.</p>
                <button 
                  onClick={async () => {
                    try {
                      await disableMfa()
                      setIsErrorTab(false)
                      setMfaEnabled(false)
                      setMfaCode('')
                      const setupRes = await setupMfa()
                      setMfaSecret(setupRes)
                      setMfaStep('setup')
                    } catch (err) {
                      setMsgTab(err.message || 'Ошибка при отключении 2FA')
                      setIsErrorTab(true)
                    }
                  }}
                  style={{ padding: '12px 20px', background: '#9c5454', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginRight: '10px' }}
                >
                  Отключить 2FA
                </button>
              </div>
            ) : (
              mfaSecret && (
                <>
                  {mfaStep === 'setup' && (
                    <div style={{ padding: '20px', background: '#f5f2eb', border: '1px solid #c5bba8', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#2d3725' }}>Шаг 1: Сканирование QR-кода</h4>
                      
                      <div style={{ marginBottom: '20px', color: '#2d3725' }}>
                        <strong style={{ display: 'block', marginBottom: '12px' }}>QR-код для Google Authenticator:</strong>
                        <div style={{ background: '#fff', padding: '15px', borderRadius: '4px', display: 'inline-block' }}>
                          <canvas ref={canvasRef}></canvas>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '4px', border: '1px solid #e8e5d9' }}>
                        <strong style={{ display: 'block', marginBottom: '8px', color: '#2d3725' }}>Или введите вручную:</strong>
                        <code style={{ background: '#f5f2eb', padding: '8px 12px', display: 'block', marginTop: '8px', borderRadius: '4px', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '14px', color: '#2d3725' }}>
                          {mfaSecret.secret}
                        </code>
                      </div>

                      <p style={{ color: '#665f58', fontSize: '13px', margin: 0, marginBottom: '15px' }}>Отсканируйте QR-код или введите секрет вручную в приложение Google Authenticator.</p>
                      
                      <button 
                        onClick={() => setMfaStep('verify')}
                        style={{ padding: '10px 20px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        Готово, перейти к вводу кода
                      </button>
                    </div>
                  )}

                  {mfaStep === 'verify' && (
                    <div style={{ padding: '20px', background: '#f5f2eb', border: '1px solid #c5bba8', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#2d3725' }}>Шаг 2: Подтверждение кодом</h4>
                      <p style={{ color: '#665f58', fontSize: '13px', margin: '0 0 15px 0' }}>Введите 6-значный код из приложения Google Authenticator:</p>
                      
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725', marginBottom: '15px' }}>
                        <input 
                          type="text" 
                          value={mfaCode} 
                          onChange={e => setMfaCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))} 
                          style={{ padding: '12px', border: '1px solid #c5bba8', borderRadius: '4px', fontSize: '18px', letterSpacing: '4px', textAlign: 'center' }} 
                          placeholder="000000" 
                          maxLength="6"
                          autoFocus
                        />
                      </label>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => { setMfaStep('setup'); setMfaCode('') }}
                          style={{ padding: '10px 20px', background: '#e8e5d9', color: '#2d3725', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px' }}
                        >
                          Назад
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await enableMfa(mfaCode)
                              setIsErrorTab(false)
                              setMfaCode('')
                              setMfaSecret(null)
                              setMfaEnabled(true)
                            } catch (err) {
                              setMsgTab(err.message || 'Ошибка проверки кода 2FA')
                              setIsErrorTab(true)
                            }
                          }} 
                          style={{ padding: '10px 20px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        >
                          Подтвердить 2FA
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        )}

        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f0eee9' }}>
          <button onClick={handleLogout} style={{ padding: '12px 20px', background: '#9c5454', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginRight: '10px' }}>
            Завершить сеанс
          </button>
        </div>
      </div>
    </div>
  )
}
