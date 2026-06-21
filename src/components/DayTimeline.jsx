export default function DayTimeline({ sessions, clients, onClientClick }) {
  const SLOT_H = 48
  const START_H = 6
  const END_H = 23
  const HOURS = Array.from({length: END_H - START_H}, (_, i) => i + START_H)
  const now = new Date()
  const currentMin = now.getHours() * 60 + now.getMinutes()
  const nowOffset = ((currentMin - START_H * 60) / 60) * SLOT_H
  const showNow = currentMin >= START_H * 60 && currentMin <= END_H * 60

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number)
    return (h - START_H) * 60 + m
  }

  const sessionBlocks = sessions.map(s => ({
    ...s,
    startMin: toMin(s.time),
    dur: s.duration || 60,
  }))

  return (
    <div className="pg-glass" style={{borderRadius:16, padding:16, marginTop:12, flex:1, display:'flex', flexDirection:'column', boxSizing:'border-box'}}>
      <div style={{fontSize:11,color:'#878F9B',fontWeight:600,textTransform:'uppercase',letterSpacing:.5,marginBottom:12}}>Денний графік</div>
      <div style={{display:'flex', gap:8, flex:1}}>
        <div style={{display:'flex', flexDirection:'column', flexShrink:0}}>
          {HOURS.map(h => (
            <div key={h} style={{height: SLOT_H, display:'flex', alignItems:'flex-start', paddingTop:4, color: h === now.getHours() ? '#5EE0CE' : '#5A616B', fontSize:10, width:36, fontFamily:'DM Sans'}}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>
        <div style={{flex:1, position:'relative', minHeight: HOURS.length * SLOT_H, backgroundImage:`repeating-linear-gradient(transparent, transparent ${SLOT_H-1}px, rgba(255,255,255,.06) ${SLOT_H-1}px, rgba(255,255,255,.06) ${SLOT_H}px)`}}>
          {HOURS.map((h, i) => (
            <div key={h} style={{position:'absolute', left:0, right:0, top: i * SLOT_H, height:1, background: h === now.getHours() ? 'rgba(94,224,206,.25)' : 'transparent'}}/>
          ))}
          {showNow && (
            <div style={{position:'absolute', left:0, right:0, top: nowOffset, zIndex:10, display:'flex', alignItems:'center', gap:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#5EE0CE',flexShrink:0,marginLeft:-4,boxShadow:'0 0 8px rgba(94,224,206,.7)'}}/>
              <div style={{flex:1,height:2,background:'linear-gradient(90deg,#5EE0CE,#3FA9F0)',borderRadius:1}}/>
            </div>
          )}
          {sessionBlocks.map(s => {
            const c = clients.find(x => x.id === s.client_id)
            const top = (s.startMin / 60) * SLOT_H
            const height = Math.max((s.dur / 60) * SLOT_H - 4, 24)
            const sameTime = sessionBlocks.filter(x => x.time === s.time)
            const idx = sameTime.findIndex(x => x.id === s.id)
            const isplit = sameTime.length > 1
            const w = isplit ? 'calc(50% - 3px)' : '100%'
            const left = isplit && idx > 0 ? 'calc(50% + 3px)' : '0'
            return (
              <div key={s.id} onClick={()=>onClientClick&&c&&onClientClick(c.id)} style={{position:'absolute', top, left, width:w, height, borderRadius:10, background: (c?.color||'#888')+'18', border:`1.5px solid ${(c?.color||'#888')}50`, display:'flex', flexDirection:'column', justifyContent:'center', padding:'4px 8px', overflow:'hidden', zIndex:2, cursor: onClientClick ? 'pointer' : 'default'}}>
                <div style={{display:'flex', alignItems:'center', gap:5}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:10,color:'#111',flexShrink:0}}>{c?.ava}</div>
                  <span style={{fontSize:11,fontWeight:600,color:'#E8EAF0',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',flex:1}}>{isplit ? c?.name?.split(' ')[0] : c?.name}</span>
                  {s.done && <span style={{color:'#00FF88',fontSize:10,flexShrink:0}}>✓</span>}
                </div>
                {s.dur >= 45 && <div style={{fontSize:10,color:'#4A90B8',marginTop:2,marginLeft:25}}>{s.time} · {s.dur}хв</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
