import { useState, useRef, memo } from 'react'

const SwipeSessionCard = memo(function SwipeSessionCard({ s, clients, onEdit, onToggle }) {
  const c = clients.find(x => x.id === s.client_id)
  const [offset, setOffset] = useState(0)
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
    if (offset < -35) {
      setOffset(-72)
      setTimeout(() => { setOffset(0); onEdit(s) }, 200)
    } else {
      setOffset(0)
    }
    startX.current = null
  }

  return (
    <div style={{position:'relative', overflow:'hidden', borderRadius:12, marginBottom:8}}>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:80,background:'#0099FF',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:2,borderRadius:12}}>
        <span style={{fontSize:18}}>✏️</span>
        <span style={{color:'#fff',fontSize:10,fontWeight:600}}>Редагувати</span>
      </div>
      <div
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={e => onStart(e.clientX)}
        onMouseMove={e => { if (startX.current !== null) onMove(e.clientX) }}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onClick={() => { if (!isDragging.current) onToggle(s.id, s.done) }}
        style={{
          transform:`translateX(${offset}px)`,
          transition: offset === 0 ? 'transform 0.25s ease' : 'none',
          display:'flex', alignItems:'center', gap:12,
          padding:'12px 14px', borderRadius:12,
          background:'#0D0D16',
          border:`1px solid ${s.done?'#00FF8833':'#1E2A3A'}`,
          cursor:'pointer', userSelect:'none', position:'relative', zIndex:1,
        }}
      >
        <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:14,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
          <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>{s.type}</div>
        </div>
        <div style={{textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
          <div style={{fontFamily:'Oswald',fontSize:22,color:'#00F5FF'}}>{s.time}</div>
          <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,fontWeight:600,background:s.done?'rgba(22,163,74,.12)':'rgba(0,245,255,.12)',color:s.done?'#00FF88':'#00F5FF'}}>{s.done?'✓ Виконано':'Заплановано'}</span>
        </div>
      </div>
    </div>
  )
})

export default SwipeSessionCard
