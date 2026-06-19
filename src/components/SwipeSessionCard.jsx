import { useState, useRef, memo } from 'react'

// Час завантаження сторінки. fadeUp-stagger грає лише при першому показі списку
// (одразу після відкриття застосунку), а не при кожному перемиканні вкладок —
// інакше горизонтальний слайд вкладки + вертикальний fadeUp дають "діагональ".
const PAGE_LOAD_TS = Date.now()
const ENTRANCE_WINDOW_MS = 1200

const SwipeSessionCard = memo(function SwipeSessionCard({ s, clients, onEdit, onToggle, index = 0 }) {
  const c = clients.find(x => x.id === s.client_id)
  const [offset, setOffset] = useState(0)
  const [pressed, setPressed] = useState(false)
  const startX = useRef(null)
  const isDragging = useRef(false)

  const onStart = (clientX) => { startX.current = clientX; isDragging.current = false }
  const onMove = (clientX) => {
    if (startX.current === null) return
    const dx = clientX - startX.current
    if (Math.abs(dx) > 5) isDragging.current = true
    if (dx < 0) setOffset(Math.max(dx, -80))
    else setOffset(0)
  }
  const onEnd = () => {
    setPressed(false)
    if (offset < -35) {
      setOffset(-72)
      setTimeout(() => { setOffset(0); onEdit(s) }, 200)
    } else {
      setOffset(0)
    }
    startX.current = null
  }

  const staggerDelay = `${index * 75}ms`
  const badgeDelay   = `${index * 75 + 140}ms`
  // Чи це початковий показ застосунку — лише тоді робимо вхідні анімації
  const isEntrance = (Date.now() - PAGE_LOAD_TS) < ENTRANCE_WINDOW_MS

  return (
    <div style={{position:'relative', overflow:'hidden', borderRadius:16, marginBottom:8,
      /* stagger fadeUp — лише при першому завантаженні, не при перемиканні вкладок */
      animation: isEntrance ? `fadeUp .32s ease-out ${staggerDelay} both` : 'none',
    }}>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:80,background:'#2E7BD6',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:2,borderRadius:16,opacity: offset < 0 ? 1 : 0, transition:'opacity .15s ease', pointerEvents:'none'}}>
        <span style={{fontSize:18}}>✏️</span>
        <span style={{color:'#fff',fontSize:10,fontWeight:600}}>Редагувати</span>
      </div>
      <div
        onTouchStart={e => { onStart(e.touches[0].clientX); setPressed(true) }}
        onTouchMove={e => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={e => { onStart(e.clientX); setPressed(true) }}
        onMouseMove={e => { if (startX.current !== null) onMove(e.clientX) }}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onClick={() => { if (!isDragging.current) onToggle(s.id, s.done) }}
        className="pg-glass"
        style={{
          transform:`translateX(${offset}px) scale(${pressed && !isDragging.current ? 0.968 : 1})`,
          transition: offset === 0 ? 'transform 0.18s ease, box-shadow 0.18s ease' : 'none',
          display:'flex', alignItems:'center', gap:12,
          padding:'14px 16px', borderRadius:16,
          cursor:'pointer', userSelect:'none', position:'relative', zIndex:1,
          boxShadow: pressed && !isDragging.current ? '0 1px 6px rgba(0,0,0,.6)' : undefined,
        }}
      >
        <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:14,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
          <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>{s.type}</div>
        </div>
        <div style={{textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
          <div className="pg-time" style={{fontFamily:'Oswald',fontSize:22}}>{s.time}</div>
          {/* badge pop-in */}
          <span style={{
            fontSize:11, padding:'3px 11px', borderRadius:20, fontWeight:500,
            background:s.done?'rgba(70,220,168,.10)':'rgba(127,212,232,.08)',
            color:s.done?'#46DCA8':'#7FD4E8',
            border:`1px solid ${s.done?'rgba(70,220,168,.22)':'rgba(127,212,232,.2)'}`,
            animation: isEntrance ? `popIn .38s cubic-bezier(.36,.07,.19,.97) ${badgeDelay} both` : 'none',
          }}>{s.done?'✓ Виконано':'Заплановано'}</span>
        </div>
      </div>
    </div>
  )
})

export default SwipeSessionCard
