import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function Root() {
  const [ready, setReady] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Мінімум 1.2с показуємо splash, потім плавно зникає
    const t1 = setTimeout(() => setFadeOut(true), 1200)
    const t2 = setTimeout(() => setReady(true), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <>
      {!ready && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#1F2937',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.6s ease',
        }}>
          <img src="/icon.png" style={{
            width: 100, height: 100, borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }} />
          <div style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 32, letterSpacing: 2,
            color: '#C4ED00',
          }}>
            COACH<span style={{ color: '#F3F4F6' }}>PRO</span>
          </div>
        </div>
      )}
      <App />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

