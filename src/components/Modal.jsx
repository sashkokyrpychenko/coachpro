import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Універсальна bottom-sheet модалка через Portal
// Рендериться прямо в document.body — не залежить від overflow батьків
export default function Modal({ open, onClose, children, zIndex=300 }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position:'fixed', inset:0,
        background:'rgba(0,0,0,.72)',
        backdropFilter:'blur(4px)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        zIndex,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:'#111118',
          border:'1px solid rgba(255,255,255,.08)',
          borderRadius:'20px 20px 0 0',
          width:'100%', maxWidth:480,
          maxHeight:'90dvh',
          overflowY:'auto',
          padding:'20px 20px calc(env(safe-area-inset-bottom,0px) + 24px)',
          boxSizing:'border-box',
          boxShadow:'0 -8px 40px rgba(0,0,0,.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2,margin:'0 auto 18px'}}/>
        {children}
      </div>
    </div>,
    document.body
  )
}
