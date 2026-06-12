import React from 'react'

export const LogTable = ({ logs }) => {
  return (
    <div style={{ maxHeight: '300px', overflowY: 'scroll', border: '1px solid #c5bba8', marginTop: '15px', fontFamily: 'sans-serif' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: '#ffffff' }}>
        <thead>
          <tr style={{ background: '#f5f2eb', borderBottom: '1px solid #c5bba8' }}>
            <th style={{ padding: '10px', textAlign: 'left', color: '#2d3725' }}>Время</th>
            <th style={{ padding: '10px', textAlign: 'left', color: '#2d3725' }}>Событие</th>
            <th style={{ padding: '10px', textAlign: 'left', color: '#2d3725' }}>Пользователь</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #f0eee9' }}>
              <td style={{ padding: '10px', color: '#665f58' }}>{new Date(log.timestamp).toLocaleString()}</td>
              <td style={{ padding: '10px', color: '#2d3725' }}>{log.action}</td>
              <td style={{ padding: '10px', color: '#2d3725' }}>{log.user || 'Система'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}