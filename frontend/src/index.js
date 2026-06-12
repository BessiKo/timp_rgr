import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { IncidentProvider } from './context/incident'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <IncidentProvider>
      <App />
    </IncidentProvider>
  </React.StrictMode>
)