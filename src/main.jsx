import { StrictMode, useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function Root() {
  const [showSplash, setShowSplash] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const videoRef = useRef(null)

  const handleEnd = () => {
    setFadeOut(true)
    setTimeout(() => setShowSplash(false), 600)
  }

  useEffect(() => {
    // Fallback — якщо відео не завантажилось за 4 секунди
    const timer = setTimeout(handleEnd, 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && (
        <div
          onClick={handleEnd}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#1F2937',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 0.6s ease',
            cursor: 'pointer',
          }}
        >
          <video
            ref={videoRef}
            src="/splash.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleEnd}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
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
