import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

// Dark theme global override

const _fontLink = document.createElement('link')
_fontLink.rel = 'stylesheet'
_fontLink.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap'
document.head.appendChild(_fontLink)

const _darkStyle = document.createElement('style')
_darkStyle.textContent = `
  body { background: #0A0A12 !important; color: #E8EAF0 !important; font-variant-emoji: text; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(0.6) sepia(1) hue-rotate(150deg); }
  select option { background: #0D0D16; color: #E8EAF0; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #08080F; }
  ::-webkit-scrollbar-thumb { background: #1A2E4A; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #00F5FF44; }
`
document.head.appendChild(_darkStyle)


const COLORS = ['#00F5FF','#47d4ff','#ff6b9d','#ffa347','#00FF88','#c47aff','#FF4466']
const MONTHS_UK = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']
const MONTHS_UK2 = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']
const DAYS_SHORT = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД']
const DAYS_FULL = ['Неділя','Понеділок','Вівторок','Середа','Четвер','Пятниця','Субота']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getMondayFirst(date) {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}
function getWeekDates(refDate) {
  const monday = new Date(refDate)
  monday.setDate(refDate.getDate() - getMondayFirst(refDate))
  return Array.from({length:7}, (_,i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}
function getMonthDates(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month+1, 0)
  const startOffset = getMondayFirst(first)
  const days = []
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, -startOffset+1+i)
    days.push({date:d, current:false})
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push({date:new Date(year, month, i), current:true})
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({date:new Date(year, month+1, i), current:false})
  }
  return days
}
function dateToStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

// ─── Swipeable single session card ───────────────────────────────────────────
function SwipeSessionCard({ s, clients, onEdit, onToggle }) {
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
      {/* Behind: edit hint */}
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:80,background:'#0099FF',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:2,borderRadius:12}}>
        <span style={{fontSize:18}}>✏️</span>
        <span style={{color:'#fff',fontSize:10,fontWeight:600}}>Редагувати</span>
      </div>
      {/* Card */}
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
        <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:15,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
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
}

// ─── Split card (whole card swipes → pick modal) ──────────────────────────────
function SplitCard({ sessions, clients, onEdit, onToggle }) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(null)
  const dragging = useRef(false)

  const onStart = x => { startX.current = x; dragging.current = false }
  const onMove  = x => {
    if (startX.current === null) return
    const dx = x - startX.current
    if (Math.abs(dx) > 5) dragging.current = true
    if (dx < 0) setOffset(Math.max(dx, -80)); else setOffset(0)
  }
  const onEnd = () => {
    if (offset < -35) { setOffset(-72); setTimeout(() => { setOffset(0); onEdit(sessions) }, 200) }
    else setOffset(0)
    startX.current = null
  }

  return (
    <div style={{position:'relative', overflow:'hidden', borderRadius:12, marginBottom:8}}>
      {/* bg */}
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:80,background:'#0099FF',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:2,borderRadius:12}}>
        <span style={{fontSize:18}}>✏️</span>
        <span style={{color:'#fff',fontSize:10,fontWeight:600}}>Редагувати</span>
      </div>
      {/* card */}
      <div
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e  => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={e  => onStart(e.clientX)}
        onMouseMove={e  => { if (startX.current !== null) onMove(e.clientX) }}
        onMouseUp={onEnd} onMouseLeave={onEnd}
        style={{transform:`translateX(${offset}px)`, transition: offset===0 ? 'transform 0.25s ease' : 'none', background:'#0D0D16', borderRadius:12, border:'1px solid #1A2E4A', overflow:'hidden', position:'relative', zIndex:1, userSelect:'none'}}
      >
        <div style={{background:'#08080F', padding:'8px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #162038'}}>
          <span style={{color:'#00F5FF', fontFamily:'Oswald', fontSize:22, letterSpacing:1}}>{sessions[0].time}</span>
          <span style={{background:'rgba(0,245,255,.15)', color:'#00F5FF', fontSize:10, fontWeight:700, borderRadius:6, padding:'2px 8px', letterSpacing:.5}}>СПЛІТ</span>
        </div>
        {sessions.map((s, i) => {
          const c = clients.find(x => x.id === s.client_id)
          return (
            <div key={s.id}
              onClick={() => { if (!dragging.current) onToggle(s.id, s.done) }}
              style={{display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderBottom: i < sessions.length-1 ? '1px solid #1A2E4A' : 'none', cursor:'pointer'}}
            >
              <div style={{width:36,height:36,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:14,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{c?.name||'Гість'}</div>
                <div style={{fontSize:11,color:'#4A90B8',marginTop:1}}>{s.type}</div>
              </div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600,background:s.done?'rgba(22,163,74,.12)':'rgba(0,245,255,.12)',color:s.done?'#00FF88':'#00F5FF'}}>{s.done?'✓ Виконано':'Заплановано'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day Timeline (duration-aware) ───────────────────────────────────────────
function DayTimeline({ sessions, clients, onClientClick }) {
  const SLOT_H = 48       // px per 60 min
  const START_H = 6       // 06:00
  const END_H = 23        // 23:00
  const TOTAL_MIN = (END_H - START_H) * 60
  const HOURS = Array.from({length: END_H - START_H}, (_, i) => i + START_H)
  const now = new Date()
  const currentMin = now.getHours() * 60 + now.getMinutes()
  const nowOffset = ((currentMin - START_H * 60) / 60) * SLOT_H
  const showNow = currentMin >= START_H * 60 && currentMin <= END_H * 60

  // Convert "HH:MM" to minutes from START_H
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number)
    return (h - START_H) * 60 + m
  }

  // Group overlapping sessions for split columns
  const sessionBlocks = sessions.map(s => ({
    ...s,
    startMin: toMin(s.time),
    dur: s.duration || 60,
  }))

  return (
    <div style={{background:'#111118', border:'1px solid #1A2E4A', borderRadius:14, padding:16, marginTop:12}}>
      <div style={{fontSize:11,color:'#4A90B8',fontWeight:600,textTransform:'uppercase',letterSpacing:.5,marginBottom:12}}>Денний графік</div>
      <div style={{display:'flex', gap:8}}>
        {/* Hour labels */}
        <div style={{display:'flex', flexDirection:'column', flexShrink:0}}>
          {HOURS.map(h => (
            <div key={h} style={{
              height: SLOT_H, display:'flex', alignItems:'flex-start', paddingTop:4,
              color: h === now.getHours() ? '#00F5FF' : '#3A4A5A',
              fontSize:10, width:36, fontFamily:'DM Sans',
            }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>

        {/* Grid + blocks */}
        <div style={{flex:1, position:'relative', height: HOURS.length * SLOT_H}}>
          {/* Hour grid lines */}
          {HOURS.map((h, i) => (
            <div key={h} style={{
              position:'absolute', left:0, right:0,
              top: i * SLOT_H, height:1,
              background: h === now.getHours() ? 'rgba(0,245,255,.25)' : '#1E2A3A',
            }}/>
          ))}

          {/* Current time line */}
          {showNow && (
            <div style={{position:'absolute', left:0, right:0, top: nowOffset, zIndex:10, display:'flex', alignItems:'center', gap:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#00F5FF',flexShrink:0,marginLeft:-4}}/>
              <div style={{flex:1,height:2,background:'#00F5FF',borderRadius:1}}/>
            </div>
          )}

          {/* Session blocks */}
          {sessionBlocks.map(s => {
            const c = clients.find(x => x.id === s.client_id)
            const top = (s.startMin / 60) * SLOT_H
            const height = Math.max((s.dur / 60) * SLOT_H - 4, 24)

            // Check for splits (same time)
            const sameTime = sessionBlocks.filter(x => x.time === s.time)
            const idx = sameTime.findIndex(x => x.id === s.id)
            const isplit = sameTime.length > 1
            const w = isplit ? 'calc(50% - 3px)' : '100%'
            const left = isplit && idx > 0 ? 'calc(50% + 3px)' : '0'

            return (
              <div key={s.id} onClick={()=>onClientClick&&c&&onClientClick(c.id)} style={{
                position:'absolute', top, left, width:w, height,
                borderRadius:10,
                background: (c?.color||'#888')+'18',
                border:`1.5px solid ${(c?.color||'#888')}50`,
                display:'flex', flexDirection:'column', justifyContent:'center',
                padding:'4px 8px', overflow:'hidden', zIndex:2,
                cursor: onClientClick ? 'pointer' : 'default',
              }}>
                <div style={{display:'flex', alignItems:'center', gap:5}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:c?.color||'#888',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontWeight:700,fontSize:9,color:'#111',flexShrink:0}}>
                    {c?.ava}
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:'#E8EAF0',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',flex:1}}>
                    {isplit ? c?.name?.split(' ')[0] : c?.name}
                  </span>
                  {s.done && <span style={{color:'#00FF88',fontSize:9,flexShrink:0}}>✓</span>}
                </div>
                {s.dur >= 45 && (
                  <div style={{fontSize:9,color:'#4A90B8',marginTop:2,marginLeft:25}}>
                    {s.time} · {s.dur}хв
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Duration Drum Picker ─────────────────────────────────────────────────────
function DurationPicker({ value, onChange }) {
  const OPTIONS = [15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180]
  const ITEM_H = 40
  const VISIBLE = 3
  const containerH = ITEM_H * VISIBLE

  const scrollRef = useRef(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startScroll = useRef(0)

  useEffect(() => {
    const idx = OPTIONS.indexOf(value)
    if (scrollRef.current && idx >= 0) {
      scrollRef.current.scrollTop = idx * ITEM_H
    }
  }, [])

  const onScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(scrollRef.current.scrollTop / ITEM_H)
    const snapped = Math.max(0, Math.min(idx, OPTIONS.length - 1))
    onChange(OPTIONS[snapped])
  }

  return (
    <div style={{position:'relative', height:containerH, overflow:'hidden', borderRadius:12, background:'#0D0D16', border:'1px solid #1A2E4A'}}>
      {/* Selection highlight */}
      <div style={{position:'absolute', left:0, right:0, top: ITEM_H, height: ITEM_H,
        background:'rgba(0,245,255,.08)', borderTop:'1px solid rgba(0,245,255,.2)',
        borderBottom:'1px solid rgba(0,245,255,.2)', pointerEvents:'none', zIndex:2}}/>
      {/* Top/bottom fade */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:ITEM_H,
        background:'linear-gradient(to bottom, #0D0D16, transparent)',pointerEvents:'none',zIndex:3}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:ITEM_H,
        background:'linear-gradient(to top, #0D0D16, transparent)',pointerEvents:'none',zIndex:3}}/>
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          height:'100%', overflowY:'scroll', scrollSnapType:'y mandatory',
          scrollbarWidth:'none', msOverflowStyle:'none',
          paddingTop: ITEM_H, paddingBottom: ITEM_H,
        }}
      >
        <style>{`.dp-hide::-webkit-scrollbar{display:none}`}</style>
        {OPTIONS.map(opt => (
          <div key={opt}
            onClick={() => { onChange(opt); if(scrollRef.current) scrollRef.current.scrollTop = OPTIONS.indexOf(opt)*ITEM_H }}
            style={{
              height: ITEM_H, display:'flex', alignItems:'center', justifyContent:'center',
              scrollSnapAlign:'start', cursor:'pointer',
              fontSize: value===opt ? 18 : 14,
              fontWeight: value===opt ? 700 : 400,
              color: value===opt ? '#00F5FF' : '#3A4A5A',
              transition:'all 0.15s',
            }}>
            {opt} хв
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Clip Tab Component ───────────────────────────────────────────────────────
function ClipTab({ c, clients, setClients, sessions, pricePlans, setFinance }) {
  const [showAllPlans, setShowAllPlans] = useState(false)
  const [editDateIdx, setEditDateIdx] = useState(null) // індекс кружечка для редагування дати
  const [editDateVal, setEditDateVal] = useState('')

  const activePlan = pricePlans.find(p => p.id === c.active_plan_id)
  const clipDates = Array.isArray(c.clip_dates) ? [...c.clip_dates].sort() : []
  const isExhausted = c.clip_used >= c.clip_total
  const progress = c.clip_total ? Math.round((c.clip_used/c.clip_total)*100) : 0

  const addFinanceRecord = async (planName, amount) => {
    const lastName = c.name ? c.name.split(' ')[1] || c.name.split(' ')[0] : c.name
    const finName = `${lastName} - ${planName} - ${Number(amount).toLocaleString('uk')} грн`
    const {data} = await supabase.from('finance').insert({name:finName, amount:Number(amount), type:'in', date:todayStr()}).select().single()
    if (data && setFinance) setFinance(prev => [data, ...prev])
  }

  const useClip = async () => {
    if (c.clip_used >= c.clip_total) return
    const newUsed = c.clip_used + 1
    const newDates = [...(c.clip_dates||[]), todayStr()]
    await supabase.from('clients').update({clip_used:newUsed, clip_dates:newDates}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x,clip_used:newUsed,clip_dates:newDates} : x))
    // Разове тренування — оплата після кожного відвідування
    if (activePlan && activePlan.sessions === 1) {
      await addFinanceRecord(activePlan.name, activePlan.price)
    }
  }

  const renewClip = async () => {
    const renewDate = todayStr()
    await supabase.from('clients').update({clip_used:0,clip_renewed_at:renewDate,clip_dates:[]}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x,clip_used:0,clip_renewed_at:renewDate,clip_dates:[]} : x))
    // Пакет — оплата при поновленні
    if (activePlan && activePlan.sessions > 1) {
      await addFinanceRecord(activePlan.name, activePlan.price)
    }
  }

  const selectPlan = async (p) => {
    const renewDate = todayStr()
    const isFirstTime = !c.active_plan_id
    await supabase.from('clients').update({active_plan_id:p.id,clip_total:p.sessions,clip_used:0,clip_renewed_at:renewDate,clip_dates:[]}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x,active_plan_id:p.id,clip_total:p.sessions,clip_used:0,clip_renewed_at:renewDate,clip_dates:[]} : x))
    setShowAllPlans(false)
    // Пакет — оплата при першому виборі або зміні тарифу
    if (p.sessions > 1) {
      await addFinanceRecord(p.name, p.price)
    }
  }

  const openEditDate = (i) => {
    setEditDateIdx(i)
    setEditDateVal(clipDates[i] || todayStr())
  }

  const saveEditDate = async () => {
    const newDates = [...clipDates]
    newDates[editDateIdx] = editDateVal
    await supabase.from('clients').update({clip_dates:newDates}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x,clip_dates:newDates} : x))
    setEditDateIdx(null)
  }

  return (
    <div style={{background:'#0D0D16',borderRadius:12,padding:14}}>

      {/* Модал редагування дати */}
      {editDateIdx !== null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}} onClick={()=>setEditDateIdx(null)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:16,padding:24,width:280}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:'Oswald',fontSize:20,marginBottom:16,color:'#E8EAF0'}}>Змінити дату #{editDateIdx+1}</div>
            <input type="date" value={editDateVal} onChange={e=>setEditDateVal(e.target.value)}
              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:14,marginBottom:16,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditDateIdx(null)}
                style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
                Скасувати
              </button>
              <button onClick={saveEditDate}
                style={{flex:1,padding:'9px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active plan or full list */}
      {!showAllPlans ? (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Поточний тариф</div>
          {activePlan ? (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#111118',border:'1.5px solid rgba(0,245,255,.3)',borderRadius:10,padding:'11px 14px',marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#E8EAF0'}}>{activePlan.name}</div>
                  <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{activePlan.sessions} тренувань</div>
                </div>
                <div style={{fontFamily:'Oswald',fontSize:18,color:'#00F5FF'}}>{Number(activePlan.price).toLocaleString('uk')} ₴</div>
              </div>
              <button onClick={()=>setShowAllPlans(true)}
                style={{width:'100%',padding:'8px',borderRadius:9,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:12,cursor:'pointer'}}>
                🔄 Змінити тариф
              </button>
            </>
          ) : (
            <button onClick={()=>setShowAllPlans(true)}
              style={{width:'100%',padding:'10px',borderRadius:9,border:'1px dashed #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
              + Обрати тариф
            </button>
          )}
        </div>
      ) : (
        <div style={{marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:14,fontWeight:700}}>{activePlan?'Змінити тариф':'Обрати тариф'}</div>
            {activePlan && <button onClick={()=>setShowAllPlans(false)} style={{background:'none',border:'none',color:'#4A90B8',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {pricePlans.map(p=>(
              <div key={p.id} onClick={()=>selectPlan(p)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:11,cursor:'pointer',
                  border:`1.5px solid ${c.active_plan_id===p.id?'#00F5FF':'#1E2A3A'}`,
                  background:c.active_plan_id===p.id?'rgba(0,245,255,.15)':'#111118'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{p.name}</div>
                  <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{p.sessions} тренувань</div>
                </div>
                <div style={{fontFamily:'Oswald',fontSize:16,color:'#00F5FF'}}>{Number(p.price).toLocaleString('uk')} ₴</div>
                {c.active_plan_id===p.id && <span style={{color:'#00F5FF',fontSize:16}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clip card */}
      {activePlan && !showAllPlans && (
        <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:14,fontWeight:700}}>Кліп-карта</div>
            <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,
              background:isExhausted?'rgba(220,38,38,.1)':'rgba(22,163,74,.12)',
              color:isExhausted?'#FF4466':'#00FF88'}}>
              {isExhausted?'Вичерпано':`Залишилось: ${c.clip_total-c.clip_used}`}
            </span>
          </div>

          <div style={{height:5,background:'#08080F',borderRadius:3,marginBottom:12,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:3,width:`${progress}%`,background:isExhausted?'#FF4466':'#00F5FF',transition:'width 0.3s'}}/>
          </div>

          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
            {Array.from({length:c.clip_total},(_,i)=>{
              const isDone = i < c.clip_used
              const dateStr = clipDates[i] || null
              return (
                <div key={i} onClick={()=>isDone && openEditDate(i)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,width:'calc(16.66% - 5px)',cursor:isDone?'pointer':'default'}}>
                  <div style={{width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,
                    background:isDone?'#00F5FF':i===c.clip_used?'rgba(71,212,255,.1)':'#08080F',
                    border:isDone?'2px solid #00F5FF':i===c.clip_used?'2px solid #47d4ff':'2px solid #1A2E4A',
                    color:isDone?'#111':'#3A4A5A'}}>
                    {isDone?'✓':i+1}
                  </div>
                  <div style={{fontSize:8,color:isDone?'#00F5FF':'#3A4A5A',textAlign:'center',opacity:isDone?1:0.4}}>
                    {isDone && dateStr ? dateStr.slice(5).replace('-','/') : '—'}
                  </div>
                </div>
              )
            })}
          </div>

          {clipDates.length > 0 && (
            <div style={{borderTop:'1px solid #162038',paddingTop:12,marginBottom:12}}>
              <div style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Відвідування</div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {[...clipDates].reverse().map((date,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'#111118',borderRadius:9,padding:'8px 12px'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:'#00F5FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#111',flexShrink:0}}>{clipDates.length-i}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#E8EAF0'}}>{date.slice(8,10)}/{date.slice(5,7)}/{date.slice(0,4)}</div>
                    </div>
                    <span style={{color:'#00FF88',fontSize:11}}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:8}}>
            <button onClick={useClip} style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Відмітити</button>
            <button onClick={renewClip} style={{flex:1,padding:'9px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Поновити</button>
          </div>
        </>
      )}
    </div>
  )
}
function PickClientModal({ sessions, clients, onPick, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}} onClick={onClose}>
      <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
        <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Кого редагувати?</div>
        {sessions.map(s => {
          const c = clients.find(x => x.id === s.client_id)
          return (
            <div key={s.id} onClick={() => onPick(s)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',background:'#0D0D16',borderRadius:12,marginBottom:8,cursor:'pointer',border:'1px solid #1A2E4A'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:15,color:'#111'}}>{c?.ava||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
                <div style={{fontSize:12,color:'#4A90B8'}}>{s.time} · {s.type}</div>
              </div>
              <span style={{color:'#111118',fontSize:20}}>›</span>
            </div>
          )
        })}
        <button onClick={onClose} style={{width:'100%',marginTop:4,padding:11,borderRadius:12,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>Скасувати</button>
      </div>
    </div>
  )
}

// ─── Edit/Delete Modal ────────────────────────────────────────────────────────
function EditSessionModal({ session, clients, onClose, onSave, onDelete }) {
  const [clientId, setClientId] = useState(session.client_id)
  const [time, setTime] = useState(session.time)
  const [date, setDate] = useState(session.date)
  const [type, setType] = useState(session.type)
  const [duration, setDuration] = useState(session.duration || 60)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const scrollRef = useRef(null)
  const selectedRef = useRef(null)

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = selectedRef.current
      const elLeft = el.offsetLeft
      const elWidth = el.offsetWidth
      const containerWidth = container.offsetWidth
      container.scrollLeft = elLeft - containerWidth / 2 + elWidth / 2
    }
  }, [])

  const inp = {width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300,padding:'0'}} onClick={onClose}>
      <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
        {/* Handle */}
        <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>

        <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:18}}>Редагувати сесію</div>

        {/* Client */}
        <label style={lbl}>Клієнт</label>
        <div ref={scrollRef} style={{display:'flex',gap:6,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
          {clients.map(c => (
            <div
              key={c.id}
              ref={c.id === clientId ? selectedRef : null}
              onClick={() => setClientId(c.id)}
              style={{
                flexShrink:0, padding:'8px 12px', borderRadius:10,
                border:`2px solid ${clientId===c.id ? c.color : '#1E2A3A'}`,
                background: clientId===c.id ? c.color+'18' : '#0D0D16',
                display:'flex', alignItems:'center', gap:7, cursor:'pointer',
              }}
            >
              <div style={{width:28,height:28,borderRadius:'50%',background:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:12,color:'#111'}}>{c.ava}</div>
              <span style={{fontSize:12,fontWeight:600,color:clientId===c.id?'#E8EAF0':'#4A5A6A',whiteSpace:'nowrap'}}>{c.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Date + Time + Type */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          <div>
            <label style={lbl}>Дата</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Час</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inp}/>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>Тип</label>
          <input value={type} onChange={e=>setType(e.target.value)} placeholder="Тренування…" style={inp}/>
        </div>
        <label style={lbl}>Тривалість</label>
        <DurationPicker value={duration} onChange={setDuration}/>
        <div style={{marginBottom:16}}/>

        {/* Save */}
        <button
          onClick={() => onSave({...session, client_id:clientId, date, time, type, duration})}
          style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:8}}
        >Зберегти зміни</button>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{width:'100%',padding:11,borderRadius:12,border:'1px solid rgba(255,79,79,.3)',background:'transparent',color:'#FF4466',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}
          >🗑 Видалити сесію</button>
        ) : (
          <div style={{background:'rgba(255,79,79,.08)',border:'1px solid rgba(255,79,79,.25)',borderRadius:12,padding:14}}>
            <div style={{color:'#E8EAF0',fontSize:13,textAlign:'center',marginBottom:12}}>Видалити цю сесію?</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setConfirmDelete(false)} style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>Скасувати</button>
              <button onClick={() => onDelete(session.id)} style={{flex:1,padding:'9px',borderRadius:10,border:'none',background:'#FF4466',color:'#fff',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>Видалити</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ clients, sessions, setSessions, onClientClick }) {
  const today = new Date()
  const todayDs = todayStr()
  const [viewMode, setViewMode] = useState('week')
  const [refDate, setRefDate] = useState(new Date(today))
  const [selDs, setSelDs] = useState(todayDs)
  const [showModal, setShowModal] = useState(false)
  const [fClient, setFClient] = useState('')
  const [fTime, setFTime] = useState('10:00')
  const [fType, setFType] = useState('')
  const [fClient2, setFClient2] = useState('')
  const [splitMode, setSplitMode] = useState(false)
  const [fDuration, setFDuration] = useState(60)
  const [editSession, setEditSession] = useState(null)
  const [pickList, setPickList] = useState(null)

  const handleEdit = (group) => {
    if (Array.isArray(group) && group.length > 1) setPickList(group)
    else setEditSession(Array.isArray(group) ? group[0] : group)
  }

  const weekDates = getWeekDates(refDate)
  const monthDates = getMonthDates(refDate.getFullYear(), refDate.getMonth())
  const selDate = new Date(selDs + 'T12:00:00')
  const daySessions = sessions.filter(s=>s.date===selDs).sort((a,b)=>a.time.localeCompare(b.time))

  // Group by time for splits
  const groupedSessions = () => {
    const map = {}
    daySessions.forEach(s => {
      if (!map[s.time]) map[s.time] = []
      map[s.time].push(s)
    })
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]))
  }

  const toggleDone = async (id, done) => {
    const session = sessions.find(s => s.id === id)
    if (!session) return
    const partners = sessions.filter(s =>
      s.date === session.date && s.time === session.time && s.id !== id
    )
    const allIds = [id, ...partners.map(s => s.id)]
    await supabase.from('sessions').update({done:!done}).in('id', allIds)
    setSessions(sessions.map(s => allIds.includes(s.id) ? {...s, done:!done} : s))

    // Auto clip: якщо відмічаємо як виконано (не скасовуємо)
    if (!done) {
      const client = clients.find(c => c.id === session.client_id)
      if (client && client.active_plan_id && client.clip_used < client.clip_total) {
        const newUsed = client.clip_used + 1
        const isRazove = client.clip_total === 1
        if (isRazove) {
          // Разове — поновлюємо автоматично
          const renewDate = todayStr()
          await supabase.from('clients').update({clip_used:0, clip_renewed_at:renewDate}).eq('id', client.id)
          setClients(prev => prev.map(c => c.id===client.id ? {...c, clip_used:0, clip_renewed_at:renewDate} : c))
        } else {
          await supabase.from('clients').update({clip_used:newUsed}).eq('id', client.id)
          setClients(prev => prev.map(c => c.id===client.id ? {...c, clip_used:newUsed} : c))
        }
      }
      // Для спліту — знімаємо у партнера теж
      if (partners.length > 0) {
        const partnerClient = clients.find(c => c.id === partners[0].client_id)
        if (partnerClient && partnerClient.active_plan_id && partnerClient.clip_used < partnerClient.clip_total) {
          const newUsed = partnerClient.clip_used + 1
          const isRazove = partnerClient.clip_total === 1
          if (isRazove) {
            const renewDate = todayStr()
            await supabase.from('clients').update({clip_used:0, clip_renewed_at:renewDate}).eq('id', partnerClient.id)
            setClients(prev => prev.map(c => c.id===partnerClient.id ? {...c, clip_used:0, clip_renewed_at:renewDate} : c))
          } else {
            await supabase.from('clients').update({clip_used:newUsed}).eq('id', partnerClient.id)
            setClients(prev => prev.map(c => c.id===partnerClient.id ? {...c, clip_used:newUsed} : c))
          }
        }
      }
    }
  }

  const saveSession = async () => {
    if (!fClient) return
    const inserts = [{client_id:fClient, time:fTime, type:fType||'Тренування', date:selDs, done:false, duration:fDuration}]
    if (splitMode && fClient2 && fClient2!==fClient) {
      inserts.push({client_id:fClient2, time:fTime, type:fType||'Тренування', date:selDs, done:false, duration:fDuration})
    }
    const {data,error} = await supabase.from('sessions').insert(inserts).select()
    if (!error&&data) setSessions([...sessions,...data])
    setShowModal(false); setFType(''); setSplitMode(false); setFClient2(''); setFDuration(60)
  }

  const saveEdit = async (updated) => {
    const {error} = await supabase.from('sessions').update({
      client_id: updated.client_id,
      date: updated.date,
      time: updated.time,
      type: updated.type,
      duration: updated.duration,
    }).eq('id', updated.id)
    if (!error) setSessions(sessions.map(s => s.id===updated.id ? {...s, ...updated} : s))
    setEditSession(null)
  }

  const deleteSession = async (id) => {
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(sessions.filter(s => s.id !== id))
    setEditSession(null)
  }

  const prevPeriod = () => {
    const d = new Date(refDate)
    if (viewMode==='week') d.setDate(d.getDate()-7)
    else d.setMonth(d.getMonth()-1)
    setRefDate(d)
  }
  const nextPeriod = () => {
    const d = new Date(refDate)
    if (viewMode==='week') d.setDate(d.getDate()+7)
    else d.setMonth(d.getMonth()+1)
    setRefDate(d)
  }
  const goToday = () => { setRefDate(new Date(today)); setSelDs(todayDs) }

  const card = {background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,marginBottom:14}

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <button onClick={prevPeriod} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',cursor:'pointer',fontSize:14}}>‹</button>
        <button onClick={nextPeriod} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',cursor:'pointer',fontSize:14}}>›</button>
        <div style={{fontFamily:'Oswald',fontSize:20,flex:1}}>
          {viewMode==='week'
            ? `${weekDates[0].getDate()} — ${weekDates[6].getDate()} ${MONTHS_UK[weekDates[6].getMonth()]}`
            : `${MONTHS_UK[refDate.getMonth()]} ${refDate.getFullYear()}`}
        </div>
        <button onClick={goToday} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#4A90B8',cursor:'pointer',fontSize:12,fontWeight:600}}>Сьогодні</button>
        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid #1A2E4A'}}>
          <button onClick={()=>setViewMode('week')} style={{width:80,padding:'6px 0',border:'none',background:viewMode==='week'?'#00F5FF':'#0D0D16',color:viewMode==='week'?'#111':'#4A5A6A',cursor:'pointer',fontSize:12,fontWeight:600}}>Тиждень</button>
          <button onClick={()=>setViewMode('month')} style={{width:80,padding:'6px 0',border:'none',background:viewMode==='month'?'#00F5FF':'#0D0D16',color:viewMode==='month'?'#111':'#4A5A6A',cursor:'pointer',fontSize:12,fontWeight:600}}>Місяць</button>
        </div>
      </div>

      {viewMode==='week' && (
        <div style={card}>
          {/* Week days */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:12}}>
            {weekDates.map((d,i)=>{
              const ds = dateToStr(d)
              const has = sessions.some(s=>s.date===ds)
              const isToday = ds===todayDs
              const isSel = ds===selDs
              return (
                <div key={i} onClick={()=>setSelDs(ds)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 2px',borderRadius:10,cursor:'pointer',border:`1px solid ${isSel?'#00F5FF':isToday?'#00F5FF44':'#1E2A3A'}`,background:isSel?'#00F5FF':isToday?'rgba(0,245,255,.08)':'#0D0D16',color:isSel?'#111':'#E8EAF0',transition:'all .18s'}}>
                  <span style={{fontSize:10,fontWeight:600,color:isSel?'#111':'#4A5A6A'}}>{DAYS_SHORT[i]}</span>
                  <span style={{fontSize:19,fontWeight:800,lineHeight:1,fontFamily:'Arial,Helvetica,sans-serif',display:'block',textAlign:'center',WebkitFontSmoothing:'antialiased'}}>{d.getDate()}</span>
                  {has && <span style={{width:4,height:4,borderRadius:'50%',background:isSel?'#111':'#47d4ff',display:'block'}}/>}
                </div>
              )
            })}
          </div>

          {/* Day label */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontFamily:'Oswald',fontSize:16,color:'#4A90B8'}}>{DAYS_FULL[selDate.getDay()]}, {selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</span>
            <small style={{color:'#4A90B8',fontSize:12}}>{daySessions.length} сесій</small>
          </div>

          {/* Sessions */}
          {daySessions.length===0 && <div style={{color:'#4A90B8',textAlign:'center',padding:'16px 0',fontSize:14}}>Немає сесій</div>}

          {groupedSessions().map(([time, group]) =>
            group.length > 1
              ? <SplitCard key={time} sessions={group} clients={clients} onEdit={handleEdit} onToggle={toggleDone}/>
              : <SwipeSessionCard key={group[0].id} s={group[0]} clients={clients} onEdit={s => handleEdit([s])} onToggle={toggleDone}/>
          )}

          <div onClick={()=>{setFClient(clients[0]?.id||'');setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,border:'1px dashed #1A2E4A',cursor:'pointer',color:'#4A90B8',fontSize:13,marginTop:4}}>＋ Додати сесію</div>

          {/* Timeline */}
          <DayTimeline sessions={daySessions} clients={clients} onClientClick={onClientClick}/>
        </div>
      )}

      {viewMode==='month' && (
        <div style={card}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
            {DAYS_SHORT.map(d=><div key={d} style={{textAlign:'center',fontSize:11,color:'#4A90B8',fontWeight:600,padding:'4px 0'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:12}}>
            {monthDates.map(({date,current},i)=>{
              const ds = dateToStr(date)
              const count = sessions.filter(s=>s.date===ds).length
              const isToday = ds===todayDs
              const isSel = ds===selDs
              return (
                <div key={i} onClick={()=>setSelDs(ds)} style={{minHeight:40,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'6px 4px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:isSel||isToday?700:400,background:isSel?'#00F5FF':isToday?'rgba(0,245,255,.15)':'none',color:isSel?'#111':current?'#E8EAF0':'#1A2A3A',border:isSel?'1px solid #00F5FF':isToday?'1px solid #00F5FF44':'1px solid transparent',transition:'all .15s',gap:2}}>
                  <span>{date.getDate()}</span>
                  {count>0 && <span style={{width:5,height:5,borderRadius:'50%',background:isSel?'#111':'#00F5FF',display:'block'}}/>}
                </div>
              )
            })}
          </div>
          <div style={{borderTop:'1px solid #162038',paddingTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontFamily:'Oswald',fontSize:16,color:'#4A90B8'}}>{selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</span>
              <small style={{color:'#4A90B8',fontSize:12}}>{daySessions.length} сесій</small>
            </div>
            {daySessions.length===0 && <div style={{color:'#4A90B8',textAlign:'center',padding:'12px 0',fontSize:13}}>Немає сесій</div>}

            {groupedSessions().map(([time, group]) =>
              group.length > 1
                ? <SplitCard key={time} sessions={group} clients={clients} onEdit={handleEdit} onToggle={toggleDone}/>
                : <SwipeSessionCard key={group[0].id} s={group[0]} clients={clients} onEdit={s => handleEdit([s])} onToggle={toggleDone}/>
            )}

            <div onClick={()=>{setFClient(clients[0]?.id||'');setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,border:'1px dashed #1A2E4A',cursor:'pointer',color:'#4A90B8',fontSize:12,marginTop:4}}>＋ Додати сесію</div>

            <DayTimeline sessions={daySessions} clients={clients} onClientClick={onClientClick}/>
          </div>
        </div>
      )}

      {/* Add session modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:20,width:'100%',maxWidth:480,padding:24}}>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Нова сесія — {selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button onClick={()=>setSplitMode(false)} style={{flex:1,padding:'8px',borderRadius:10,border:`1px solid ${!splitMode?'#00F5FF':'#1E2A3A'}`,background:!splitMode?'rgba(0,245,255,.1)':'none',color:!splitMode?'#00F5FF':'#4A5A6A',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>👤 Один клієнт</button>
              <button onClick={()=>setSplitMode(true)} style={{flex:1,padding:'8px',borderRadius:10,border:`1px solid ${splitMode?'#00F5FF':'#1E2A3A'}`,background:splitMode?'rgba(0,245,255,.1)':'none',color:splitMode?'#00F5FF':'#4A5A6A',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>👥 Спліт (двоє)</button>
            </div>
            <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>{splitMode?'Перший клієнт':'Клієнт'}</label>
            <select value={fClient} onChange={e=>setFClient(e.target.value)} style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,marginBottom:12,outline:'none'}}>
              <option value="">— Оберіть —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {splitMode && (
              <>
                <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Другий клієнт</label>
                <select value={fClient2} onChange={e=>setFClient2(e.target.value)} style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,marginBottom:12,outline:'none'}}>
                  <option value="">— Оберіть —</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Час</label>
                <input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тип</label>
                <input value={fType} onChange={e=>setFType(e.target.value)} placeholder="Силові…" style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
            </div>
            <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тривалість</label>
            <DurationPicker value={fDuration} onChange={setFDuration}/>
            <div style={{marginBottom:16}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowModal(false);setSplitMode(false)}} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={saveSession} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Додати</button>
            </div>
          </div>
        </div>
      )}

      {pickList && (
        <PickClientModal
          sessions={pickList}
          clients={clients}
          onPick={s => { setPickList(null); setEditSession(s) }}
          onClose={() => setPickList(null)}
        />
      )}

      {/* Edit modal */}
      {editSession && (
        <EditSessionModal
          session={editSession}
          clients={clients}
          onClose={() => setEditSession(null)}
          onSave={saveEdit}
          onDelete={deleteSession}
        />
      )}
    </div>
  )
}

// ─── Clients Tab (unchanged) ──────────────────────────────────────────────────
function ClientsTab({ clients, setClients, sessions, setSessions, records, setRecords, pricePlans, setFinance, openClientId, clearOpenClientId }) {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  useEffect(() => {
    if (openClientId) {
      setOpenId(openClientId)
      clearOpenClientId&&clearOpenClientId()
    }
  }, [openClientId])
  const [tabMap, setTabMap] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [showAddRecord, setShowAddRecord] = useState(null)
  const [editClient, setEditClient] = useState(null)
  const [ec, setEc] = useState({name:'',goal:'',w:'',h:'',started:'',phone:'',telegram:''})
  const [nc, setNc] = useState({name:'',last:'',goal:'',w:'',h:'',clip:10})
  const [nr, setNr] = useState({exercise:'',value:'',unit:'кг'})
  const [saving, setSaving] = useState(false)
  const [metrics, setMetrics] = useState([])
  const [measurements, setMeasurements] = useState([])
  const [showAddMetric, setShowAddMetric] = useState(null)       // clientId
  const [showAddMeasure, setShowAddMeasure] = useState(null)     // metricId
  const [openMetricChart, setOpenMetricChart] = useState(null)   // metric object
  const [nm, setNm] = useState({name:'', unit:'кг'})
  const [nv, setNv] = useState({value:'', date: todayStr()})

  useEffect(() => {
    const load = async () => {
      const [met, meas] = await Promise.all([
        supabase.from('metrics').select('*').order('name'),
        supabase.from('measurements').select('*').order('date'),
      ])
      if (met.data) setMetrics(met.data)
      if (meas.data) setMeasurements(meas.data)
    }
    load()
  }, [])

  const saveMetric = async (clientId) => {
    if (!nm.name) return
    const {data,error} = await supabase.from('metrics').insert({
      client_id: clientId, name: nm.name, unit: nm.unit
    }).select().single()
    if (!error) setMetrics(prev => [...prev, data])
    setShowAddMetric(null); setNm({name:'', unit:'кг'})
  }

  const deleteMetric = async (id) => {
    await supabase.from('metrics').delete().eq('id', id)
    setMetrics(prev => prev.filter(m => m.id !== id))
    setMeasurements(prev => prev.filter(m => m.metric_id !== id))
  }

  const saveMeasurement = async (metricId, clientId) => {
    if (!nv.value) return
    const {data,error} = await supabase.from('measurements').insert({
      metric_id: metricId, client_id: clientId,
      value: Number(nv.value), date: nv.date
    }).select().single()
    if (!error) {
      setMeasurements(prev => [...prev, data])
      // reopen chart with updated measurements
      if (openMetricChart) {
        setOpenMetricChart(prev => ({
          ...prev,
          meas: [...prev.meas, data].sort((a,b) => a.date.localeCompare(b.date))
        }))
      }
    }
    setShowAddMeasure(null); setNv({value:'', date: todayStr()})
  }

  const deleteMeasurement = async (id) => {
    await supabase.from('measurements').delete().eq('id', id)
    setMeasurements(prev => prev.filter(m => m.id !== id))
  }

  const SCHEDULE_DAYS = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД']
  const UNITS = ['кг', 'см', '%', 'сек', 'хв', 'повт', 'ккал']
  const filtered = clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))
  const setTab = (id,t) => setTabMap(p=>({...p,[id]:t}))
  const getTab = (id) => tabMap[id]||'profile'

  const updateNote = async (id, note) => {
    await supabase.from('clients').update({note}).eq('id',id)
    setClients(clients.map(c=>c.id===id?{...c,note}:c))
  }
  const updateStrengths = async (id, val) => {
    const arr = val.split('\n').map(s=>s.trim()).filter(Boolean)
    await supabase.from('clients').update({strengths:arr}).eq('id',id)
    setClients(clients.map(c=>c.id===id?{...c,strengths:arr}:c))
  }
  const updateWeaknesses = async (id, val) => {
    const arr = val.split('\n').map(s=>s.trim()).filter(Boolean)
    await supabase.from('clients').update({weaknesses:arr}).eq('id',id)
    setClients(clients.map(c=>c.id===id?{...c,weaknesses:arr}:c))
  }
  const toggleScheduleDay = async (client, dayIdx) => {
    const current = client.schedule_days || []
    const updated = current.includes(dayIdx) ? current.filter(d=>d!==dayIdx) : [...current, dayIdx].sort()
    await supabase.from('clients').update({schedule_days:updated}).eq('id',client.id)
    setClients(clients.map(c=>c.id===client.id?{...c,schedule_days:updated}:c))
  }
  const updateScheduleTime = async (client, dayIdx, time) => {
    const times = {...(client.schedule_times||{}), [dayIdx]: time}
    await supabase.from('clients').update({schedule_times:times}).eq('id',client.id)
    setClients(clients.map(c=>c.id===client.id?{...c,schedule_times:times}:c))
  }
  const fillRange = async (client) => {
    if (!client.schedule_days?.length) { alert('Оберіть дні тренувань'); return }
    const fromEl = document.getElementById(`fill-from-${client.id}`)
    const toEl = document.getElementById(`fill-to-${client.id}`)
    if (!fromEl||!toEl) return
    const from = new Date(fromEl.value+'T12:00:00')
    const to = new Date(toEl.value+'T12:00:00')
    if (from>to) { alert('Дата "З" має бути раніше ніж "До"'); return }
    const inserts = []
    const cur = new Date(from)
    while (cur<=to) {
      const dow = getMondayFirst(cur)
      if (client.schedule_days.includes(dow)) {
        const ds = dateToStr(cur)
        const time = (client.schedule_times||{})[dow] || '10:00'
        const exists = sessions.some(s=>s.client_id===client.id&&s.date===ds)
        if (!exists) inserts.push({client_id:client.id, time, type:'Тренування', date:ds, done:false})
      }
      cur.setDate(cur.getDate()+1)
    }
    if (!inserts.length) { alert('Всі сесії вже існують'); return }
    const {data,error} = await supabase.from('sessions').insert(inserts).select()
    if (!error&&data) { setSessions(prev=>[...prev,...data]); alert(`✅ Додано ${data.length} сесій!`) }
  }
  const useClip = async (id) => {
    const c = clients.find(x=>x.id===id)
    if (!c||c.clip_used>=c.clip_total) return
    await supabase.from('clients').update({clip_used:c.clip_used+1}).eq('id',id)
    setClients(clients.map(x=>x.id===id?{...x,clip_used:x.clip_used+1}:x))
  }
  const renewClip = async (id) => {
    await supabase.from('clients').update({clip_used:0}).eq('id',id)
    setClients(clients.map(x=>x.id===id?{...x,clip_used:0}:x))
  }
  const saveEditClient = async () => {
    if (!ec.name || !editClient) return
    const initials = ec.name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase()
    const {error} = await supabase.from('clients').update({
      name: ec.name, goal: ec.goal,
      weight: Number(ec.w)||editClient.weight,
      height: Number(ec.h)||editClient.height,
      ava: initials || editClient.ava,
      started_at: ec.started || null,
      phone: ec.phone || null,
      telegram: ec.telegram || null,
    }).eq('id', editClient.id)
    if (!error) setClients(prev => prev.map(c => c.id===editClient.id
      ? {...c, name:ec.name, goal:ec.goal, weight:Number(ec.w)||c.weight, height:Number(ec.h)||c.height, ava:initials||c.ava, started_at:ec.started||null, phone:ec.phone||null, telegram:ec.telegram||null}
      : c).sort((a,b) => a.name.localeCompare(b.name,'uk')))
    setEditClient(null)
  }

  const deleteClient = async (id) => {
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
    setSessions(prev => prev.filter(s => s.client_id !== id))
  }

  const saveClient = async () => {
    if (!nc.name||saving) return
    setSaving(true)
    const fullName = nc.last?nc.name+' '+nc.last:nc.name
    const initials = (nc.name[0]||'')+(nc.last[0]||'')
    const selectedPlan = pricePlans.find(p=>p.id===nc.planId)
    const {data,error} = await supabase.from('clients').insert({
      name:fullName, goal:nc.goal||'Загальна форма',
      weight:Number(nc.w)||70, height:Number(nc.h)||170,
      color:COLORS[clients.length%COLORS.length], ava:initials||'??',
      note:'', strengths:[], weaknesses:[],
      clip_total: selectedPlan ? selectedPlan.sessions : Number(nc.clip)||1,
      clip_used:0,
      active_plan_id: nc.planId||null,
      clip_renewed_at: nc.planId ? todayStr() : null,
      schedule_days:[], schedule_times:{},
      started_at: todayStr()
    }).select().single()
    if (!error) setClients(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name, 'uk')))
    setSaving(false); setShowAdd(false)
    setNc({name:'',last:'',goal:'',w:'',h:'',clip:10,planId:null})
  }
  const saveRecord = async (clientId) => {
    if (!nr.exercise||!nr.value) return
    const now = new Date()
    const dateStr = `${now.getDate()} ${MONTHS_UK2[now.getMonth()]}`
    const {data,error} = await supabase.from('records').insert({
      client_id:clientId, exercise:nr.exercise, value:nr.value, unit:nr.unit, date:dateStr
    }).select().single()
    if (!error) setRecords([...records,data])
    setShowAddRecord(null); setNr({exercise:'',value:'',unit:'кг'})
  }
  const deleteRecord = async (id) => {
    await supabase.from('records').delete().eq('id',id)
    setRecords(records.filter(r=>r.id!==id))
  }

  const DTABS = [{id:'profile',label:'Профіль'},{id:'metrics',label:'Показники'},{id:'schedule',label:'Графік'},{id:'records',label:'Рекорди'},{id:'clip',label:'Кліп-карта'},{id:'history',label:'Історія'}]
  const inp = {width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Пошук клієнта…" style={{...inp,flex:1}}/>
        <button onClick={()=>setShowAdd(true)} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontWeight:700,fontSize:14,cursor:'pointer'}}>＋</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:12}}>
        {filtered.length===0 && <div style={{color:'#4A90B8',textAlign:'center',padding:'40px 0',gridColumn:'1/-1'}}>Клієнтів ще немає</div>}
        {filtered.map(c=>{
          const isOpen = openId===c.id
          const progress = c.clip_total?Math.round((c.clip_used/c.clip_total)*100):0
          const activeTab = getTab(c.id)
          const cSessions = sessions.filter(s=>s.client_id===c.id)
          const cRecords = records.filter(r=>r.client_id===c.id)
          return (
            <div key={c.id} style={{background:'#111118',border:`1px solid ${isOpen?'#00F5FF':'#1E2A3A'}`,borderRadius:14,overflow:'hidden',alignSelf:'start'}}>
              <div onClick={()=>setOpenId(isOpen?null:c.id)} style={{display:'flex',alignItems:'center',gap:12,padding:14,cursor:'pointer'}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:18,color:'#111',flexShrink:0}}>{c.ava}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:600}}>{c.name}</div>
                  <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>{c.goal}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button onClick={e=>{e.stopPropagation();setEc({name:c.name,goal:c.goal,w:c.weight,h:c.height,started:c.started_at||'',phone:c.phone||'',telegram:c.telegram||''});setEditClient(c)}}
                      style={{background:'none',border:`1px solid #1A2E4A`,borderRadius:7,color:'#4A90B8',fontSize:12,padding:'3px 7px',cursor:'pointer'}}>✏️</button>
                    <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,background:'rgba(0,245,255,.12)',color:'#00F5FF'}}>{c.clip_used}/{c.clip_total}</span>
                  </div>
                  <span style={{color:'#4A90B8',fontSize:14,transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 14px 14px'}}>
                <div style={{flex:1,height:4,background:'#08080F',borderRadius:2}}>
                  <div style={{height:'100%',borderRadius:2,width:`${progress}%`,background:c.color}}/>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:c.color,minWidth:30,textAlign:'right'}}>{progress}%</span>
              </div>
              {isOpen && (
                <div style={{borderTop:'1px solid #162038',padding:14}}>
                  <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
                    {DTABS.map(t=>(
                      <button key={t.id} onClick={()=>setTab(c.id,t.id)} style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${activeTab===t.id?'#00F5FF':'#1E2A3A'}`,background:activeTab===t.id?'#00F5FF':'none',color:activeTab===t.id?'#111':'#4A5A6A'}}>{t.label}</button>
                    ))}
                  </div>
                  {activeTab==='profile' && (
                    <div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                        {[['Вага',`${c.weight} кг`],['Зріст',`${c.height} см`],['З нами',c.started_at ? c.started_at.slice(0,10).split('-').reverse().join('.') : '—']].map(([l,v])=>(
                          <div key={l} style={{background:'#0D0D16',borderRadius:10,padding:10,textAlign:'center'}}>
                            <div style={{fontFamily:'Oswald',fontSize:22}}>{v}</div>
                            <div style={{fontSize:10,color:'#4A90B8',marginTop:2}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                        <div style={{background:'#0D0D16',borderRadius:10,padding:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#00FF88',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>💪 Сильні</div>
                          <textarea defaultValue={(c.strengths||[]).join('\n')} onBlur={e=>updateStrengths(c.id,e.target.value)} placeholder="По одному на рядок" style={{width:'100%',background:'#08080F',border:'1px solid #1A2E4A',borderRadius:8,padding:'8px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,resize:'none',outline:'none',minHeight:70,lineHeight:1.5}}/>
                        </div>
                        <div style={{background:'#0D0D16',borderRadius:10,padding:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#FF4466',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>⚠️ Слабкі</div>
                          <textarea defaultValue={(c.weaknesses||[]).join('\n')} onBlur={e=>updateWeaknesses(c.id,e.target.value)} placeholder="По одному на рядок" style={{width:'100%',background:'#08080F',border:'1px solid #1A2E4A',borderRadius:8,padding:'8px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,resize:'none',outline:'none',minHeight:70,lineHeight:1.5}}/>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>📝 Нотатка</div>
                      <textarea defaultValue={c.note} onBlur={e=>updateNote(c.id,e.target.value)} style={{width:'100%',background:'#08080F',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 12px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,resize:'none',outline:'none',minHeight:80,lineHeight:1.5}}/>
                      {(c.phone||c.telegram) && (
                        <div style={{display:'flex',gap:8,marginTop:12}}>
                          {c.phone && (
                            <button onClick={()=>{navigator.clipboard.writeText(c.phone);alert('Номер скопійовано!')}}
                              style={{flex:1,padding:'10px 8px',borderRadius:10,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                              📞 {c.phone}
                            </button>
                          )}
                          {c.telegram && (
                            <button onClick={()=>window.open(c.telegram.startsWith('http')?c.telegram:`https://t.me/${c.telegram.replace('@','')}`, '_blank')}
                              style={{flex:1,padding:'10px 8px',borderRadius:10,border:'1px solid #1A2E4A',background:'rgba(36,161,222,.15)',color:'#29b6f6',fontFamily:'DM Sans',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg> Telegram
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab==='metrics' && (() => {
                    const cMetrics = metrics.filter(m => m.client_id === c.id)
                    return (
                      <div>
                        {cMetrics.length === 0 && (
                          <div style={{color:'#4A90B8',textAlign:'center',padding:'20px 0',fontSize:13}}>Показників ще немає</div>
                        )}
                        {cMetrics.map(metric => {
                          const meas = measurements.filter(m => m.metric_id === metric.id).sort((a,b) => a.date.localeCompare(b.date))
                          const last = meas[meas.length-1]
                          const first = meas[0]
                          const delta = last && first ? (last.value - first.value) : null
                          const improving = delta !== null && delta <= 0
                          // mini sparkline points
                          const vals = meas.map(m => m.value)
                          const minV = Math.min(...vals, 0)
                          const maxV = Math.max(...vals, 1)
                          const range = maxV - minV || 1
                          return (
                            <div key={metric.id}
                              onClick={() => setOpenMetricChart({metric, meas})}
                              style={{background:'#0D0D16',borderRadius:12,padding:'12px 14px',marginBottom:8,cursor:'pointer',border:'1px solid #1A2E4A',display:'flex',alignItems:'center',gap:12}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,fontWeight:600}}>{metric.name}</div>
                                <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>
                                  {meas.length} вимірів
                                  {last ? ` · ${last.value} ${metric.unit}` : ''}
                                </div>
                              </div>
                              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                                {meas.length >= 2 && (
                                  <svg width={70} height={28} style={{overflow:'visible'}}>
                                    <polyline
                                      points={meas.map((m,i) => `${(i/(meas.length-1))*70},${28-((m.value-minV)/range)*24}`).join(' ')}
                                      fill="none" stroke={improving?'#00FF88':'#FF4466'} strokeWidth="2"
                                      strokeLinecap="round" strokeLinejoin="round"
                                    />
                                    <circle cx={(meas.length-1)/(meas.length-1)*70} cy={28-((vals[vals.length-1]-minV)/range)*24}
                                      r="3" fill={improving?'#00FF88':'#FF4466'}/>
                                  </svg>
                                )}
                                {delta !== null && (
                                  <span style={{fontSize:11,fontWeight:600,color:improving?'#00FF88':'#FF4466'}}>
                                    {improving?'▼':'▲'} {Math.abs(delta).toFixed(1)} {metric.unit}
                                  </span>
                                )}
                              </div>
                              <button onClick={e=>{e.stopPropagation();deleteMetric(metric.id)}}
                                style={{background:'none',border:'none',color:'#4A90B8',cursor:'pointer',fontSize:14,padding:'0 2px'}}>✕</button>
                            </div>
                          )
                        })}
                        <button onClick={() => setShowAddMetric(c.id)}
                          style={{width:'100%',marginTop:4,padding:'10px',borderRadius:10,border:'1px dashed #1A2E4A',background:'none',color:'#4A90B8',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>
                          ＋ Додати показник
                        </button>
                      </div>
                    )
                  })()}

                  {activeTab==='schedule' && (
                    <div>
                      <div style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Дні та час тренувань</div>
                      {SCHEDULE_DAYS.map((day,i)=>{
                        const active = (c.schedule_days||[]).includes(i)
                        const timeVal = (c.schedule_times||{})[i] || '10:00'
                        return (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                            <button onClick={()=>toggleScheduleDay(c,i)} style={{width:44,padding:'8px 0',borderRadius:10,border:`1px solid ${active?'#00F5FF':'#1E2A3A'}`,background:active?'#00F5FF':'#0D0D16',color:active?'#111':'#4A5A6A',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0}}>{day}</button>
                            {active && <input type="time" defaultValue={timeVal} onBlur={e=>updateScheduleTime(c,i,e.target.value)} style={{background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:8,padding:'7px 10px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,outline:'none',width:110}}/>}
                            {!active && <span style={{fontSize:12,color:'#1A2A3A'}}>—</span>}
                          </div>
                        )
                      })}
                      <div style={{marginTop:16}}>
                        <div style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Заповнити розклад</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                          <div>
                            <label style={{fontSize:11,color:'#4A90B8',display:'block',marginBottom:4}}>З дати</label>
                            <input type="date" id={`fill-from-${c.id}`} defaultValue={todayStr()} style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:8,padding:'8px 10px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,outline:'none'}}/>
                          </div>
                          <div>
                            <label style={{fontSize:11,color:'#4A90B8',display:'block',marginBottom:4}}>До дати</label>
                            <input type="date" id={`fill-to-${c.id}`} defaultValue={(() => { const d=new Date(); d.setMonth(d.getMonth()+1); return dateToStr(d) })()} style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:8,padding:'8px 10px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,outline:'none'}}/>
                          </div>
                        </div>
                        <button onClick={()=>fillRange(c)} style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>⚡ Заповнити розклад</button>
                      </div>
                    </div>
                  )}
                  {activeTab==='records' && (
                    <div>
                      {cRecords.length===0 && <div style={{color:'#4A90B8',textAlign:'center',padding:'16px 0',fontSize:14}}>Рекордів ще немає</div>}
                      {cRecords.map(r=>(
                        <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,background:'#0D0D16',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600}}>{r.exercise}</div>
                            <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{r.date}</div>
                          </div>
                          <div style={{fontFamily:'Oswald',fontSize:22,color:'#00F5FF'}}>{r.value} <span style={{fontFamily:'DM Sans',fontSize:12,color:'#4A90B8'}}>{r.unit}</span></div>
                          <button onClick={()=>deleteRecord(r.id)} style={{background:'none',border:'none',color:'#4A90B8',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✕</button>
                        </div>
                      ))}
                      <button onClick={()=>setShowAddRecord(c.id)} style={{width:'100%',marginTop:8,padding:'10px',borderRadius:10,border:'1px dashed #1A2E4A',background:'none',color:'#4A90B8',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>＋ Додати рекорд</button>
                    </div>
                  )}
                  {activeTab==='clip' && (
                    <ClipTab c={c} clients={clients} setClients={setClients} sessions={sessions} pricePlans={pricePlans} setFinance={setFinance}/>
                  )}
                  {activeTab==='history' && (
                    <div>
                      {cSessions.filter(s=>s.done).sort((a,b)=>b.date.localeCompare(a.date)).map(s=>(
                        <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,background:'#0D0D16',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                          <div style={{fontFamily:'Oswald',fontSize:14,color:'#00F5FF',minWidth:55}}>{s.date.slice(5).replace('-','/')}</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:600}}>{s.type}</div>
                            <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{s.time} · Виконано</div>
                          </div>
                        </div>
                      ))}
                      {cSessions.filter(s=>s.done).length===0&&<div style={{color:'#4A90B8',textAlign:'center',padding:'20px 0'}}>Історії ще немає</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:20,width:'100%',maxWidth:480,padding:24}}>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Новий клієнт</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div><label style={lbl}>Ім'я</label><input value={nc.name} onChange={e=>setNc({...nc,name:e.target.value})} placeholder="Аліна" style={inp}/></div>
              <div><label style={lbl}>Прізвище</label><input value={nc.last} onChange={e=>setNc({...nc,last:e.target.value})} placeholder="Мороз" style={inp}/></div>
            </div>
            <label style={lbl}>Мета</label>
            <input value={nc.goal} onChange={e=>setNc({...nc,goal:e.target.value})} placeholder="Схуднення…" style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              <div><label style={lbl}>Вага</label><input type="number" value={nc.w} onChange={e=>setNc({...nc,w:e.target.value})} placeholder="70" style={inp}/></div>
              <div><label style={lbl}>Зріст</label><input type="number" value={nc.h} onChange={e=>setNc({...nc,h:e.target.value})} placeholder="170" style={inp}/></div>
            </div>
            {pricePlans.length > 0 && (
              <>
                <label style={lbl}>Тариф (необов'язково)</label>
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
                  {pricePlans.map(p=>(
                    <div key={p.id} onClick={()=>setNc({...nc,planId:p.id,clip:p.sessions})}
                      style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderRadius:10,cursor:'pointer',
                        border:`1.5px solid ${nc.planId===p.id?'#00F5FF':'#1E2A3A'}`,
                        background:nc.planId===p.id?'rgba(0,245,255,.15)':'#0D0D16'}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{p.name}</div>
                        <div style={{fontSize:11,color:'#4A90B8'}}>{p.sessions} тренувань</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{fontFamily:'Oswald',fontSize:16,color:'#00F5FF'}}>{Number(p.price).toLocaleString('uk')} ₴</div>
                        {nc.planId===p.id && <span style={{color:'#00F5FF'}}>✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={saveClient} disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>{saving?'Збереження…':'Додати'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddRecord && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:20,width:'100%',maxWidth:440,padding:24}}>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Новий рекорд</div>
            <label style={lbl}>Вправа</label>
            <input value={nr.exercise} onChange={e=>setNr({...nr,exercise:e.target.value})} placeholder="Жим лежачи…" style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              <div><label style={lbl}>Результат</label><input value={nr.value} onChange={e=>setNr({...nr,value:e.target.value})} placeholder="100" style={inp}/></div>
              <div><label style={lbl}>Одиниця</label>
                <select value={nr.unit} onChange={e=>setNr({...nr,unit:e.target.value})} style={{...inp,padding:'10px 8px'}}>
                  <option value="кг">кг</option><option value="хв">хв</option><option value="сек">сек</option><option value="раз">раз</option><option value="км">км</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAddRecord(null)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={()=>saveRecord(showAddRecord)} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Зберегти</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClient && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}} onClick={()=>setEditClient(null)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Редагувати клієнта</div>
            <label style={lbl}>Повне ім'я</label>
            <input value={ec.name} onChange={e=>setEc({...ec,name:e.target.value})} style={{...inp,marginBottom:12}}/>
            <label style={lbl}>Мета</label>
            <input value={ec.goal} onChange={e=>setEc({...ec,goal:e.target.value})} style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div>
                <label style={lbl}>Вага (кг)</label>
                <input type="number" value={ec.w} onChange={e=>setEc({...ec,w:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Зріст (см)</label>
                <input type="number" value={ec.h} onChange={e=>setEc({...ec,h:e.target.value})} style={inp}/>
              </div>
            </div>
            <label style={lbl}>Дата початку співпраці</label>
            <input type="date" value={ec.started} onChange={e=>setEc({...ec,started:e.target.value})} style={{...inp,marginBottom:12}}/>
            <label style={lbl}>Телефон</label>
            <input value={ec.phone} onChange={e=>setEc({...ec,phone:e.target.value})} placeholder="+380..." style={{...inp,marginBottom:12}}/>
            <label style={lbl}>Telegram (посилання або @username)</label>
            <input value={ec.telegram} onChange={e=>setEc({...ec,telegram:e.target.value})} placeholder="https://t.me/username" style={{...inp,marginBottom:20}}/>
            <button onClick={saveEditClient}
              style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:8}}>
              Зберегти зміни
            </button>
            <button onClick={async()=>{if(window.confirm(`Видалити ${editClient.name}? Всі сесії теж видаляться.`)){await deleteClient(editClient.id);setEditClient(null)}}}
              style={{width:'100%',padding:11,borderRadius:12,border:'1px solid rgba(255,79,79,.3)',background:'transparent',color:'#FF4466',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              🗑 Видалити клієнта
            </button>
          </div>
        </div>
      )}

      {/* Add Metric Modal */}
      {showAddMetric && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}} onClick={()=>setShowAddMetric(null)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Новий показник</div>
            <label style={lbl}>Назва</label>
            <input value={nm.name} onChange={e=>setNm({...nm,name:e.target.value})}
              placeholder="Вага тіла, Обхват талії…"
              style={{...inp,marginBottom:14}}/>
            <label style={lbl}>Одиниця</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
              {UNITS.map(u=>(
                <button key={u} onClick={()=>setNm({...nm,unit:u})}
                  style={{padding:'7px 14px',borderRadius:10,border:`1.5px solid ${nm.unit===u?'#00F5FF':'#1E2A3A'}`,background:nm.unit===u?'rgba(0,245,255,.12)':'#0D0D16',color:nm.unit===u?'#00F5FF':'#4A5A6A',fontSize:13,fontWeight:nm.unit===u?700:400,cursor:'pointer'}}>
                  {u}
                </button>
              ))}
            </div>
            <button onClick={()=>saveMetric(showAddMetric)}
              style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Додати показник
            </button>
          </div>
        </div>
      )}

      {/* Add Measurement Modal */}
      {showAddMeasure && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:400}} onClick={()=>setShowAddMeasure(null)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Новий вимір</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              <div>
                <label style={lbl}>Значення ({showAddMeasure.unit})</label>
                <input type="number" value={nv.value} onChange={e=>setNv({...nv,value:e.target.value})}
                  placeholder="0" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Дата</label>
                <input type="date" value={nv.date} onChange={e=>setNv({...nv,date:e.target.value})}
                  style={inp}/>
              </div>
            </div>
            <button onClick={()=>saveMeasurement(showAddMeasure.id, showAddMeasure.client_id)}
              style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Зберегти вимір
            </button>
          </div>
        </div>
      )}

      {/* Metric Chart Modal */}
      {openMetricChart && (() => {
        const {metric, meas} = openMetricChart
        const sorted = [...meas].sort((a,b)=>a.date.localeCompare(b.date))
        const vals = sorted.map(m=>m.value)
        const minV = Math.min(...vals)
        const maxV = Math.max(...vals)
        const range = maxV - minV || 1
        const W=320, H=140, PL=36, PR=12, PT=16, PB=24
        const cW = W-PL-PR, cH = H-PT-PB
        const pts = sorted.map((m,i)=>({
          x: PL + (i/(sorted.length-1||1))*cW,
          y: PT + (1-(m.value-minV)/range)*cH,
          ...m
        }))
        const pathD = pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ')
        const areaD = pathD+` L${pts[pts.length-1]?.x},${PT+cH} L${pts[0]?.x},${PT+cH} Z`
        const delta = vals.length>1 ? vals[vals.length-1]-vals[0] : null
        const improving = delta!==null && delta<=0
        const lc = improving ? '#00FF88' : '#FF4466'
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:350,padding:16}} onClick={()=>setOpenMetricChart(null)}>
            <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:20,width:'100%',maxWidth:420,padding:24}} onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div>
                  <div style={{fontWeight:700,fontSize:18,color:'#E8EAF0'}}>{metric.name}</div>
                  <div style={{color:'#4A90B8',fontSize:12,marginTop:2}}>{sorted.length} вимірів · {metric.unit}</div>
                </div>
                {delta!==null && (
                  <div style={{textAlign:'right'}}>
                    <div style={{color:lc,fontWeight:700,fontSize:18}}>{improving?'▼':'▲'} {Math.abs(delta).toFixed(1)} {metric.unit}</div>
                    <div style={{color:'#4A90B8',fontSize:11}}>з початку</div>
                  </div>
                )}
              </div>

              {sorted.length >= 2 ? (
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible',marginBottom:12}}>
                  {[0,0.5,1].map((t,i)=>{
                    const y=PT+t*cH; const v=(maxV-t*range).toFixed(1)
                    return <g key={i}>
                      <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#1E2A3A" strokeWidth="1" strokeDasharray="4,4"/>
                      <text x={PL-4} y={y+4} fontSize="9" fill="#3A4A5A" textAnchor="end">{v}</text>
                    </g>
                  })}
                  <path d={areaD} fill={lc} opacity="0.08"/>
                  <path d={pathD} fill="none" stroke={lc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {pts.map((p,i)=>(
                    <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={lc} stroke="#111118" strokeWidth="2"/>
                  ))}
                  {pts.map((p,i)=>(
                    (i===0||i===pts.length-1) &&
                    <text key={`l${i}`} x={p.x} y={H-4} fontSize="9" fill="#3A4A5A" textAnchor="middle">
                      {p.date.slice(5).replace('-','/')}
                    </text>
                  ))}
                </svg>
              ) : (
                <div style={{color:'#4A90B8',textAlign:'center',padding:'20px 0',fontSize:13}}>Потрібно мінімум 2 виміри для графіку</div>
              )}

              <div style={{borderTop:'1px solid #162038',paddingTop:12,marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontSize:12,color:'#4A90B8'}}>Всі виміри</div>
                  <button onClick={()=>setShowAddMeasure(metric)}
                    style={{background:'#00F5FF',color:'#111',border:'none',borderRadius:8,padding:'5px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    + Додати вимір
                  </button>
                </div>
                <div style={{maxHeight:160,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                  {[...sorted].reverse().map(m=>(
                    <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0D0D16',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{color:'#4A90B8',fontSize:12}}>{m.date.slice(5).replace('-','/')}.{m.date.slice(0,4)}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{color:'#E8EAF0',fontWeight:600,fontSize:15}}>{m.value} <span style={{color:'#4A90B8',fontSize:11,fontWeight:400}}>{metric.unit}</span></span>
                        <button onClick={()=>deleteMeasurement(m.id)}
                          style={{background:'none',border:'none',color:'#4A90B8',cursor:'pointer',fontSize:13}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={()=>setOpenMetricChart(null)}
                style={{width:'100%',padding:10,borderRadius:12,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
                Закрити
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
function StatsTab({ sessions, clients, finance, pricePlans, setPricePlans }) {
  const today = todayStr()
  const now = new Date()
  const weekStartDate = new Date(now)
  weekStartDate.setDate(now.getDate() - getMondayFirst(now))
  const weekStartStr = dateToStr(weekStartDate)
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const todayCount = sessions.filter(s => s.date === today).length
  const weekCount  = sessions.filter(s => s.date >= weekStartStr && s.date <= today).length
  const monthCount = sessions.filter(s => s.date >= monthStartStr && s.date <= today).length
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(now); d.setDate(now.getDate()-6+i); return {ds:dateToStr(d),lbl:d.getDate(),day:DAYS_SHORT[getMondayFirst(d)]} })
  const counts = days.map(d=>sessions.filter(s=>s.date===d.ds).length)
  const max = Math.max(...counts,1)
  const income = finance.filter(f=>f.type==='in').reduce((a,f)=>a+Number(f.amount),0)

  const [showAddPlan, setShowAddPlan] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [np, setNp] = useState({name:'',sessions:1,price:''})

  const savePlan = async () => {
    if (!np.name || !np.price) return
    if (editPlan) {
      const {data,error} = await supabase.from('price_plans').update({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).eq('id',editPlan.id).select().single()
      if (!error) setPricePlans(prev => prev.map(p => p.id===editPlan.id ? data : p).sort((a,b)=>a.name.localeCompare(b.name,'uk')))
      setEditPlan(null)
    } else {
      const {data,error} = await supabase.from('price_plans').insert({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).select().single()
      if (!error) setPricePlans(prev => [...prev,data].sort((a,b)=>a.name.localeCompare(b.name,'uk')))
    }
    setShowAddPlan(false); setNp({name:'',sessions:1,price:''})
  }

  const deletePlan = async (id) => {
    await supabase.from('price_plans').delete().eq('id',id)
    setPricePlans(prev => prev.filter(p => p.id!==id))
  }

  const inp = {width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div>
      {/* Stats cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {[['Сьогодні',todayCount,'#00F5FF'],['Тиждень',weekCount,'#47d4ff'],['Місяць',monthCount,'#00FF88']].map(([l,v,cl])=>(
          <div key={l} style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,textAlign:'center'}}>
            <div style={{fontFamily:'Oswald',fontSize:42,color:cl,lineHeight:1}}>{v}</div>
            <div style={{fontSize:12,color:'#4A90B8',marginTop:6}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
        {/* Activity chart */}
        <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
          <div style={{fontFamily:'Oswald',fontSize:18,marginBottom:14}}>Активність — 7 днів</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,marginBottom:8}}>
            {counts.map((c,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:4}}>
                <span style={{fontSize:10,color:c>0?'#00F5FF':'#3A4A5A',fontWeight:600}}>{c>0?c:''}</span>
                <div style={{width:'100%',borderRadius:'4px 4px 0 0',minHeight:4,height:`${Math.max(4,(c/max)*90)}px`,background:days[i].ds===today?'#00F5FF':'#08080F',border:`1px solid ${days[i].ds===today?'#00F5FF':'#1E2A3A'}`}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            {days.map((d,i)=>(
              <div key={i} style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:10,color:d.ds===today?'#00F5FF':'#3A4A5A'}}>{d.day}</div>
                <div style={{fontSize:9,color:'#1A2A3A'}}>{d.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Finance */}
        <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
          <div style={{fontFamily:'Oswald',fontSize:18,marginBottom:14}}>Фінанси</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            <div style={{background:'#0D0D16',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Дохід</div>
              <div style={{fontFamily:'Oswald',fontSize:26,color:'#00FF88'}}>{income.toLocaleString('uk')} ₴</div>
            </div>
            <div style={{background:'#0D0D16',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Клієнтів</div>
              <div style={{fontFamily:'Oswald',fontSize:26,color:'#00F5FF'}}>{clients.length}</div>
            </div>
          </div>
          {finance.map((f,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<finance.length-1?'1px solid #1A2E4A':'none'}}>
              <div>
                <div style={{fontSize:14,fontWeight:500}}>{f.name}</div>
                <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{f.date}</div>
              </div>
              <div style={{fontFamily:'Oswald',fontSize:20,color:f.type==='in'?'#00FF88':'#FF4466'}}>{f.amount>0?'+':''}{Number(f.amount).toLocaleString('uk')} ₴</div>
            </div>
          ))}
          {finance.length===0&&<div style={{color:'#4A90B8',textAlign:'center',padding:'20px 0'}}>Фінансів ще немає</div>}
        </div>

        {/* Price plans */}
        <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:'Oswald',fontSize:18}}>Прайс-листи</div>
            <button onClick={()=>{setEditPlan(null);setNp({name:'',sessions:1,price:''});setShowAddPlan(true)}}
              style={{background:'#00F5FF',color:'#111',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + Додати
            </button>
          </div>
          {pricePlans.length===0 && <div style={{color:'#4A90B8',textAlign:'center',padding:'20px 0',fontSize:13}}>Прайс-листів ще немає</div>}
          {pricePlans.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#0D0D16',borderRadius:10,marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{p.name}</div>
                <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{p.sessions} {p.sessions===1?'тренування':'тренувань'}</div>
              </div>
              <div style={{fontFamily:'Oswald',fontSize:20,color:'#00F5FF'}}>{Number(p.price).toLocaleString('uk')} ₴</div>
              <button onClick={()=>{setEditPlan(p);setNp({name:p.name,sessions:p.sessions,price:p.price});setShowAddPlan(true)}}
                style={{background:'none',border:'1px solid #1A2E4A',borderRadius:7,color:'#4A90B8',fontSize:12,padding:'4px 8px',cursor:'pointer'}}>✏️</button>
              <button onClick={()=>deletePlan(p.id)}
                style={{background:'none',border:'none',color:'#4A90B8',fontSize:14,cursor:'pointer'}}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit plan modal */}
      {showAddPlan && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}} onClick={()=>setShowAddPlan(false)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>{editPlan?'Редагувати план':'Новий план'}</div>
            <label style={lbl}>Назва</label>
            <input value={np.name} onChange={e=>setNp({...np,name:e.target.value})}
              placeholder="Спліт 2026 · 12 тренувань…" style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              <div>
                <label style={lbl}>Тренувань</label>
                <input type="number" value={np.sessions} onChange={e=>setNp({...np,sessions:e.target.value})}
                  placeholder="12" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Ціна (₴)</label>
                <input type="number" value={np.price} onChange={e=>setNp({...np,price:e.target.value})}
                  placeholder="10800" style={inp}/>
              </div>
            </div>
            <button onClick={savePlan}
              style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              {editPlan?'Зберегти зміни':'Додати план'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ sessions, clients, finance, setFinance, pricePlans, setPricePlans }) {
  const [section, setSection] = useState('stats')
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [np, setNp] = useState({name:'',sessions:1,price:''})
  const [expanded, setExpanded] = useState(false)
  const [editFinance, setEditFinance] = useState(null) // транзакція для редагування
  const [ef, setEf] = useState({name:'',amount:'',date:''}) // форма редагування

  const today = todayStr()
  const now = new Date()
  const weekStartDate = new Date(now)
  weekStartDate.setDate(now.getDate() - getMondayFirst(now))
  const weekStartStr = dateToStr(weekStartDate)
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const todayCount = sessions.filter(s=>s.date===today).length
  const weekCount  = sessions.filter(s=>s.date>=weekStartStr&&s.date<=today).length
  const monthCount = sessions.filter(s=>s.date>=monthStartStr&&s.date<=today).length
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(now); d.setDate(now.getDate()-6+i); return {ds:dateToStr(d),lbl:d.getDate(),day:DAYS_SHORT[getMondayFirst(d)]} })
  const counts = days.map(d=>sessions.filter(s=>s.date===d.ds).length)
  const maxC = Math.max(...counts,1)
  const income  = finance.filter(f=>f.type==='in').reduce((a,f)=>a+Number(f.amount),0)

  // Sort plans by usage count
  const planUsage = pricePlans.map(p=>({
    ...p,
    usage: clients.filter(c=>c.active_plan_id===p.id).length
  })).sort((a,b)=>b.usage-a.usage)
  const visiblePlans = expanded ? planUsage : planUsage.slice(0,3)

  const savePlan = async () => {
    if (!np.name||!np.price) return
    if (editPlan) {
      const {data,error} = await supabase.from('price_plans').update({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).eq('id',editPlan.id).select().single()
      if (!error) setPricePlans(prev=>prev.map(p=>p.id===editPlan.id?data:p).sort((a,b)=>a.name.localeCompare(b.name,'uk')))
      setEditPlan(null)
    } else {
      const {data,error} = await supabase.from('price_plans').insert({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).select().single()
      if (!error) setPricePlans(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name,'uk')))
    }
    setShowAddPlan(false); setNp({name:'',sessions:1,price:''})
  }
  const deletePlan = async (id) => {
    await supabase.from('price_plans').delete().eq('id',id)
    setPricePlans(prev=>prev.filter(p=>p.id!==id))
  }

  const inp = {width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:'Oswald',fontSize:26,letterSpacing:0.5,color:'#00F5FF'}}>COACH<span style={{color:'#E8EAF0'}}>PRO</span></div>
        <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>{DAYS_FULL[now.getDay()]}, {now.getDate()} {MONTHS_UK2[now.getMonth()]}</div>
      </div>

      {/* Section tabs */}
      <div style={{display:'flex',gap:4,background:'#0D0D16',borderRadius:12,padding:4,marginBottom:20}}>
        {[['stats','Статистика'],['finance','Фінанси'],['price','Прайс']].map(([id,label])=>(
          <div key={id} onClick={()=>setSection(id)}
            style={{flex:1,textAlign:'center',padding:'9px 4px',borderRadius:9,
              fontSize:13,fontWeight:section===id?700:400,
              background:section===id?'#111118':'transparent',
              color:section===id?'#E8EAF0':'#3A4A5A',cursor:'pointer'}}>
            {label}
          </div>
        ))}
      </div>

      {/* ── STATS ── */}
      {section==='stats' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            {[['Сьогодні',todayCount,'#00F5FF'],['Тиждень',weekCount,'#47d4ff'],['Місяць',monthCount,'#00FF88']].map(([l,v,cl])=>(
              <div key={l} style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,textAlign:'center'}}>
                <div style={{fontFamily:'Oswald',fontSize:42,color:cl,lineHeight:1}}>{v}</div>
                <div style={{fontSize:12,color:'#4A90B8',marginTop:6}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Активність — 7 днів</div>
            <div style={{display:'flex',alignItems:'flex-end',gap:8,height:100,marginBottom:8}}>
              {counts.map((c,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:3}}>
                  <span style={{fontSize:10,fontWeight:600,color:c>0?'#00F5FF':'#3A4A5A'}}>{c>0?c:''}</span>
                  <div style={{width:'100%',borderRadius:'4px 4px 0 0',minHeight:4,height:`${Math.max(4,(c/maxC)*85)}px`,background:days[i].ds===today?'#00F5FF':'#08080F',border:`1px solid ${days[i].ds===today?'#00F5FF':'#1E2A3A'}`}}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              {days.map((d,i)=>(
                <div key={i} style={{flex:1,textAlign:'center'}}>
                  <div style={{fontSize:10,color:d.ds===today?'#00F5FF':'#3A4A5A'}}>{d.day}</div>
                  <div style={{fontSize:9,color:'#1A2A3A'}}>{d.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCE ── */}
      {section==='finance' && (
        <div>
          <div style={{marginBottom:16}}>
            <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
              <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Дохід</div>
              <div style={{fontFamily:'Oswald',fontSize:32,color:'#00FF88'}}>{income.toLocaleString('uk')} ₴</div>
            </div>
          </div>
          {/* Модал редагування транзакції */}
          {editFinance && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}} onClick={()=>setEditFinance(null)}>
              <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:16,padding:24,width:300}} onClick={e=>e.stopPropagation()}>
                <div style={{fontFamily:'Oswald',fontSize:20,marginBottom:16,color:'#E8EAF0'}}>Редагувати транзакцію</div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                  <input value={ef.name} onChange={e=>setEf(p=>({...p,name:e.target.value}))} placeholder="Назва"
                    style={{padding:'9px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:13}}/>
                  <input type="number" value={ef.amount} onChange={e=>setEf(p=>({...p,amount:e.target.value}))} placeholder="Сума"
                    style={{padding:'9px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:13}}/>
                  <input type="date" value={ef.date} onChange={e=>setEf(p=>({...p,date:e.target.value}))}
                    style={{padding:'9px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:13}}/>

                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={async()=>{
                    await supabase.from('finance').delete().eq('id',editFinance.id)
                    setFinance(prev=>prev.filter(x=>x.id!==editFinance.id))
                    setEditFinance(null)
                  }} style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid #FF4466',background:'transparent',color:'#FF4466',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                    Видалити
                  </button>
                  <button onClick={async()=>{
                    const upd={name:ef.name,amount:Number(ef.amount),type:ef.type,date:ef.date}
                    await supabase.from('finance').update(upd).eq('id',editFinance.id)
                    setFinance(prev=>prev.map(x=>x.id===editFinance.id?{...x,...upd}:x))
                    setEditFinance(null)
                  }} style={{flex:1,padding:'9px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    Зберегти
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Транзакції</div>
            {finance.length===0&&<div style={{color:'#4A90B8',textAlign:'center',padding:'20px 0'}}>Фінансів ще немає</div>}
            {finance.map((f,i)=>(
              <div key={f.id||i} onClick={()=>{setEditFinance(f);setEf({name:f.name,amount:f.amount,type:f.type,date:f.date})}}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<finance.length-1?'1px solid #1A2E4A':'none',cursor:'pointer'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{f.name}</div>
                  <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{f.date}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{fontFamily:'Oswald',fontSize:20,color:f.type==='in'?'#00FF88':'#FF4466'}}>
                    {f.type==='in'?'+':'-'}{Math.abs(Number(f.amount)).toLocaleString('uk')} ₴
                  </div>
                  <span style={{color:'#4A90B8',fontSize:16}}>✎</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRICE ── */}
      {section==='price' && (
        <div>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15}}>Прайс-листи</div>
              <button onClick={()=>{setEditPlan(null);setNp({name:'',sessions:1,price:''});setShowAddPlan(true)}}
                style={{background:'#00F5FF',color:'#111',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                + Додати
              </button>
            </div>
            {pricePlans.length===0&&<div style={{color:'#4A90B8',textAlign:'center',padding:'20px 0',fontSize:13}}>Прайс-листів ще немає</div>}
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {visiblePlans.map(p=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 12px',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:11}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{p.name}</div>
                    <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{p.sessions} {p.sessions===1?'тренування':'тренувань'}</div>
                  </div>
                  <div style={{fontFamily:'Oswald',fontSize:18,color:'#00F5FF'}}>{Number(p.price).toLocaleString('uk')} ₴</div>
                  <button onClick={()=>{setEditPlan(p);setNp({name:p.name,sessions:p.sessions,price:p.price});setShowAddPlan(true)}}
                    style={{background:'none',border:'1px solid #1A2E4A',borderRadius:7,color:'#4A90B8',fontSize:12,padding:'4px 8px',cursor:'pointer'}}>✏️</button>
                  <button onClick={()=>deletePlan(p.id)}
                    style={{background:'none',border:'none',color:'#4A90B8',fontSize:14,cursor:'pointer'}}>✕</button>
                </div>
              ))}
            </div>
            {pricePlans.length > 3 && (
              <button onClick={()=>setExpanded(!expanded)}
                style={{width:'100%',marginTop:10,padding:'9px',borderRadius:10,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
                {expanded?'▲ Згорнути':`▼ Показати всі (${pricePlans.length})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit plan modal */}
      {showAddPlan && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}} onClick={()=>setShowAddPlan(false)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>{editPlan?'Редагувати план':'Новий план'}</div>
            <label style={lbl}>Назва</label>
            <input value={np.name} onChange={e=>setNp({...np,name:e.target.value})} placeholder="Спліт 2026 · 12 тренувань…" style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              <div><label style={lbl}>Тренувань</label><input type="number" value={np.sessions} onChange={e=>setNp({...np,sessions:e.target.value})} placeholder="12" style={inp}/></div>
              <div><label style={lbl}>Ціна (₴)</label><input type="number" value={np.price} onChange={e=>setNp({...np,price:e.target.value})} placeholder="10800" style={inp}/></div>
            </div>
            <button onClick={savePlan}
              style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              {editPlan?'Зберегти зміни':'Додати план'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('schedule')
  const [openClientId, setOpenClientId] = useState(null)
  const [clients, setClients] = useState([])
  const [sessions, setSessions] = useState([])
  const [finance, setFinance] = useState([])
  const [records, setRecords] = useState([])
  const [pricePlans, setPricePlans] = useState([])

  // Завантаження даних у фоні
  useEffect(() => {
    const load = async () => {
      const [c,s,f,r,pp] = await Promise.all([
        supabase.from('clients').select('*').order('created_at'),
        supabase.from('sessions').select('*')
          .gte('date', '2026-01-01')
          .lte('date', (() => { const d = new Date(); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10) })())
          .order('created_at'),
        supabase.from('finance').select('*').order('created_at'),
        supabase.from('records').select('*').order('created_at'),
        supabase.from('price_plans').select('*').order('name'),
      ])
      if (c.data) setClients(c.data.sort((a,b) => a.name.localeCompare(b.name, 'uk')))
      if (s.data) setSessions(s.data)
      if (f.data) setFinance(f.data)
      if (r.data) setRecords(r.data)
      if (pp.data) setPricePlans(pp.data)
    }
    load()
  }, [])

  const now = new Date()
  const dateStr = `${DAYS_FULL[now.getDay()]}, ${now.getDate()} ${MONTHS_UK2[now.getMonth()]}`

  const TABS = [['schedule','📅','Графік'],['clients','👥','Клієнти'],['profile','⚡','Профіль']]

  return (
    <div style={{display:'flex',height:'100dvh',background:'#0A0A12',color:'#E8EAF0',fontFamily:'DM Sans'}}>
      <div className="desktop-sidebar" style={{width:220,background:'#111118',borderRight:'1px solid #1A2E4A',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100dvh'}}>
        <div style={{padding:'24px 20px 20px',borderBottom:'1px solid #162038'}}>
          <div style={{fontFamily:'Oswald',fontSize:26,letterSpacing:0.5,color:'#00F5FF'}}>COACH<span style={{color:'#E8EAF0'}}>PRO</span></div>
          <div style={{fontSize:12,color:'#3A7A9A',marginTop:4}}>{dateStr}</div>
        </div>
        <nav style={{flex:1,padding:'12px 0'}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 20px',cursor:'pointer',border:'none',fontFamily:'DM Sans',fontSize:14,fontWeight:500,textAlign:'left',borderLeft:tab===id?'3px solid #00F5FF':'3px solid transparent',background:tab===id?'rgba(0,245,255,.06)':'none',color:tab===id?'#00F5FF':'#3A4A5A',transition:'all .18s'}}>
              <span style={{fontSize:18}}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{padding:'16px 20px',borderTop:'1px solid #162038'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#00F5FF,#0080CC)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:16,color:'#111'}}>Т</div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Тренер</div>
              <div style={{fontSize:11,color:'#4A90B8'}}>CoachPro</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:24}}>
          {tab==='schedule'&&<ScheduleTab clients={clients} sessions={sessions} setSessions={setSessions} onClientClick={id=>{setOpenClientId(id);setTab('clients')}}/>}
          {tab==='clients'&&<ClientsTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} records={records} setRecords={setRecords} pricePlans={pricePlans} setFinance={setFinance} openClientId={openClientId} clearOpenClientId={()=>setOpenClientId(null)}/>}
          {tab==='profile'&&<ProfileTab sessions={sessions} clients={clients} finance={finance} setFinance={setFinance} pricePlans={pricePlans} setPricePlans={setPricePlans}/>}
        </div>
        <div className="mobile-tabs" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',background:'#111118',borderTop:'1px solid #162038',flexShrink:0}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 4px 12px',cursor:'pointer',border:'none',background:'none',color:tab===id?'#00F5FF':'#3A4A5A',fontFamily:'DM Sans',fontSize:11,fontWeight:500,gap:4,borderTop:tab===id?'2px solid #00F5FF':'2px solid transparent'}}>
              <span style={{fontSize:20}}>{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
