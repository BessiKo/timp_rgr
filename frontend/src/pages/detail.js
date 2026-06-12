import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIncidents } from '../context/incident'

export const DetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const { 
    user, role, boilers, assignments, operators, 
    assignOperatorToBoiler, removeAssignment, updateBoilerParams,
    loadOperators, loadAssignments, loadBoilers
  } = useIncidents()

  useEffect(() => {
    loadOperators()
    loadAssignments()
    loadBoilers()
  }, [loadOperators, loadAssignments, loadBoilers])

  const boiler = boilers.find(b => String(b.id) === String(id))
  const currentAssignments = assignments.filter(a => String(a.boiler_id) === String(id))
  
  const isAssigned = currentAssignments.some(a => a.operator_id === user?.id)
  const hasOperator = currentAssignments.length >= 1

  if (role === 'operator' && !isAssigned) {
    return <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>Доступ запрещен. Аппарат не закреплен за вами.</div>
  }

  if (!boiler) return <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>Аппарат не найден.</div>

  const checkAutoBlock = async (newPressure) => {
    if (newPressure > boiler.max_pressure && !boiler.is_blocked) {
      await updateBoilerParams(boiler.id, { current_pressure: newPressure, is_blocked: true })
      alert('КРИТИЧЕСКОЕ ДАВЛЕНИЕ! Сработала система автоматической блокировки аппарата.')
    } else {
      await updateBoilerParams(boiler.id, { current_pressure: newPressure })
    }
  }

  const handleIncreasePressure = () => {
    const newPressure = Number(boiler.current_pressure || 0) + 2.5
    checkAutoBlock(newPressure)
  }

  const handleDecreasePressure = () => {
    const newPressure = Math.max(0, Number(boiler.current_pressure || 0) - 2.0)
    updateBoilerParams(boiler.id, { current_pressure: newPressure })
  }

  const handleAssign = (e) => {
    e.preventDefault()
    const opId = e.target.operator.value
    if (opId) assignOperatorToBoiler(opId, boiler.id)
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', background: '#f5f2eb', minHeight: '100vh' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '10px 15px', background: '#e8e5d9', border: '1px solid #c5bba8', cursor: 'pointer', borderRadius: '4px', color: '#2d3725' }}>
        Назад
      </button>

      <h2 style={{ color: '#2d3725', marginTop: 0 }}>Управление аппаратом: {boiler.name}</h2>
      
      <div style={{ padding: '20px', background: '#fff', border: '1px solid #c5bba8', borderRadius: '4px', marginBottom: '20px' }}>
        <p><strong>Максимальное допустимое давление:</strong> {boiler.max_pressure} Атм</p>
        <p><strong>Текущее давление в системе:</strong> <span style={{ color: boiler.current_pressure > boiler.max_pressure ? '#9c5454' : '#4e6e4e', fontWeight: 'bold', fontSize: '18px' }}>{boiler.current_pressure || 0} Атм</span></p>
      </div>

      {role === 'operator' && (
        <div style={{ border: '1px solid #c5bba8', padding: '20px', background: '#ffffff', borderRadius: '4px', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#2d3725' }}>Пульт управления (Оператор)</h3>
          {boiler.is_blocked ? (
            <div style={{ padding: '15px', background: '#ebd6d6', color: '#9c5454', borderRadius: '4px', fontWeight: 'bold' }}>
              УПРАВЛЕНИЕ ЗАБЛОКИРОВАНО. Ожидайте решения начальника смены.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleIncreasePressure} style={{ padding: '10px', background: '#8c7257', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                Открыть задвижку (Повысить давление)
              </button>
              <button onClick={handleDecreasePressure} style={{ padding: '10px', background: '#4e6e4e', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                Сбросить давление
              </button>
            </div>
          )}
        </div>
      )}

      {(role === 'chief' || role === 'admin') && (
        <>
          <div style={{ border: '1px solid #c5bba8', padding: '20px', background: '#ffffff', borderRadius: '4px', marginTop: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#2d3725' }}>Аварийный контроль</h3>
            {boiler.is_blocked ? (
              <div style={{ padding: '15px', background: '#ebd6d6', border: '1px solid #9c5454', borderRadius: '4px' }}>
                <p style={{ color: '#9c5454', fontWeight: 'bold' }}>ВНИМАНИЕ: Аппарат заблокирован автоматикой из-за превышения давления!</p>
                <button onClick={() => updateBoilerParams(boiler.id, { is_blocked: false, current_pressure: 0 })} style={{ padding: '8px 12px', background: '#4e6e4e', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                  Сбросить давление и разблокировать
                </button>
              </div>
            ) : (
              <p style={{ color: '#4e6e4e' }}>Система работает в штатном режиме.</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div style={{ border: '1px solid #c5bba8', padding: '20px', background: '#ffffff', borderRadius: '4px' }}>
              <h3 style={{ marginTop: 0, color: '#2d3725' }}>Текущий оператор</h3>
              {currentAssignments.length === 0 && <p style={{ color: '#665f58' }}>Операторы не назначены.</p>}
              {currentAssignments.map(a => {
                const op = operators.find(o => o.id === a.operator_id)
                return (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0eee9', alignItems: 'center' }}>
                    <span style={{ color: '#2d3725', fontWeight: '500' }}>{op?.email || 'Оператор'}</span>
                    <button onClick={() => removeAssignment(a.id)} style={{ background: '#9c5454', color: '#fff', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px' }}>
                      Снять
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ border: '1px solid #c5bba8', padding: '20px', background: '#ffffff', borderRadius: '4px', opacity: hasOperator ? 0.6 : 1 }}>
              <h3 style={{ marginTop: 0, color: '#2d3725' }}>Назначить оператора</h3>
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <select name="operator" style={{ padding: '10px', border: '1px solid #c5bba8', borderRadius: '4px' }} disabled={hasOperator} required>
                  <option value="">Выберите сотрудника</option>
                  {operators.map(o => <option key={o.id} value={o.id}>{o.email}</option>)}
                </select>
                <button type="submit" style={{ padding: '10px', background: hasOperator ? '#c5bba8' : '#4e6e4e', color: '#fff', border: 'none', cursor: hasOperator ? 'not-allowed' : 'pointer', borderRadius: '4px' }} disabled={hasOperator}>
                  Привязать
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}