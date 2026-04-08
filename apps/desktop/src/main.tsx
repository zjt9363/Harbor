import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logRenderer } from './logger'

logRenderer('INFO', 'bootstrap', 'renderer entry loaded')

window.addEventListener('error', (event) => {
  logRenderer('ERROR', 'window', 'renderer window error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error
    ? {
        message: event.reason.message,
        stack: event.reason.stack,
      }
    : String(event.reason)

  logRenderer('ERROR', 'window', 'renderer unhandled rejection', { reason })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

logRenderer('INFO', 'bootstrap', 'react root rendered')
