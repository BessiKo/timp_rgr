import React, { useState } from 'react'
import { useIncidents } from '../context/incident'
import { useLocation } from 'react-router-dom'

export const LoginPage = () => {
  const { login, register, verifyMfa, authPending } = useIncidents()
  const location = useLocation()

  const isAdminGate = location.pathname.includes('isolated-admin-gate')

  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const getPwdStrength = (pwd) => {
    let score = 0
    let hints = []
    if (!pwd) return { score: 0, hints: [] }
    if (pwd.length >= 8) score += 33
    else hints.push('не менее 8 символов')
    if (/[A-Z]/.test(pwd)) score += 33
    else hints.push('заглавная буква')
    if (/[0-9]/.test(pwd)) score += 34
    else hints.push('цифра')
    return { score, hints }
  }

  const { score: pwdScore, hints: pwdHints } = getPwdStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      if (isRegister) {
        if (pwdScore < 100) {
          throw new Error('Пароль недостаточно сложный')
        }
        if (password !== confirmPassword) {
          throw new Error('Пароли не совпадают')
        }
        await register(email, password, confirmPassword)
        setErrorMsg('Регистрация успешна! Ожидайте подтверждения модератором.')
        setIsRegister(false)
        setPassword('')
        setConfirmPassword('')
        setLoading(false)
        return
      }

      if (authPending) {
        if (!/^\d{6}$/.test(code)) {
          throw new Error('Код должен состоять ровно из 6 цифр')
        }
        await verifyMfa(authPending.userId, code, isAdminGate)
        return
      }

      const result = await login(email, password, isAdminGate)
      
      if (result && result.status === 'mfa_pending') {
        setLoading(false)
        return
      }

    } catch (err) {
      setErrorMsg(err.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f2eb', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#ffffff', padding: '40px', borderRadius: '4px', border: '1px solid #c5bba8', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        <h2 style={{ margin: '0 0 20px 0', color: '#2d3725', textAlign: 'center' }}>
          {authPending ? 'Двухфакторная защита' : isAdminGate ? 'Панель администратора' : isRegister ? 'Регистрация' : 'Вход в систему'}
        </h2>

        {errorMsg && (
          <div style={{ padding: '12px', marginBottom: '20px', background: errorMsg.includes('успешна') ? '#d3dfd3' : '#ebd6d6', color: errorMsg.includes('успешна') ? '#4e6e4e' : '#9c5454', borderRadius: '4px', textAlign: 'center', border: `1px solid ${errorMsg.includes('успешна') ? '#4e6e4e' : '#9c5454'}` }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {authPending ? (
            <>
              <p style={{ color: '#665f58', fontSize: '14px', textAlign: 'center', margin: '0 0 20px 0' }}>
                Введите 6-значный код из приложения
              </p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2d3725' }}>
                Код подтверждения:
                <input
                  type="text"
                  value={code}
                  autoComplete="one-time-code"
                  onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  required
                  autoFocus
                  placeholder="000000"
                  maxLength="6"
                  style={{ padding: '12px', border: '1px solid #c5bba8', borderRadius: '4px', textAlign: 'center', fontSize: '20px', letterSpacing: '4px', caretColor: 'transparent' }}
                />
              </label>
            </>
          ) : (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: '#2d3725' }}>
                Email:
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: '#2d3725' }}>
                Пароль:
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }}
                />
              </label>

              {isRegister && password && (
                <div style={{ marginBottom: '5px' }}>
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

              {isRegister && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: '#2d3725' }}>
                    Подтвердите пароль:
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }}
                    />
                  </label>
                  {confirmPassword && password !== confirmPassword && (
                    <div style={{ fontSize: '12px', color: '#9c5454' }}>
                      Пароли не совпадают
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                background: loading ? '#8c7257' : '#4e6e4e',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'wait' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Подождите...' : authPending ? 'Подтвердить вход' : isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>

            {authPending && (
              <button
                type="button"
                disabled={loading}
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px',
                  background: 'transparent',
                  color: '#4e6e4e',
                  border: '1px solid #4e6e4e',
                  borderRadius: '4px',
                  cursor: loading ? 'wait' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Вернуться назад
              </button>
            )}
          </div>
        </form>

        {!isAdminGate && !authPending && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); }}
              style={{ background: 'none', border: 'none', color: '#8c7257', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
