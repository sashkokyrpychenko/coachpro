import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

const COLORS = ['#c8ff47','#47d4ff','#ff6b9d','#ffa347','#3de87a','#c47aff','#ff4f4f']
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
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:80,background:'#3B82F6',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:2,borderRadius:12}}>
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
          background:'#1e2330',
          border:`1px solid ${s.done?'#3de87a33':'#2a3045'}`,
          cursor:'pointer', userSelect:'none', position:'relative', zIndex:1,
        }}
      >
        <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:15,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
          <div style={{fontSize:12,color:'#8891ad',marginTop:2}}>{s.type}</div>
        </div>
        <div style={{textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
          <div style={{fontFamily:'Bebas Neue',fontSize:22,color:'#c8ff47'}}>{s.time}</div>
          <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,fontWeight:600,background:s.done?'rgba(61,232,122,.12)':'rgba(200,255,71,.12)',color:s.done?'#3de87a':'#c8ff47'}}>{s.done?'✓ Виконано':'Заплановано'}</span>
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
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:80,background:'#3B82F6',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:2,borderRadius:12}}>
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
        style={{transform:`translateX(${offset}px)`, transition: offset===0 ? 'transform 0.25s ease' : 'none', background:'#1e2330', borderRadius:12, border:'1px solid #2a3045', overflow:'hidden', position:'relative', zIndex:1, userSelect:'none'}}
      >
        <div style={{background:'#252c3d', padding:'6px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #2a3045'}}>
          <span style={{color:'#c8ff47', fontFamily:'Bebas Neue', fontSize:16}}>{sessions[0].time}</span>
          <span style={{background:'rgba(200,255,71,.15)', color:'#c8ff47', fontSize:10, fontWeight:700, borderRadius:6, padding:'2px 8px', letterSpacing:.5}}>СПЛІТ</span>
        </div>
        {sessions.map((s, i) => {
          const c = clients.find(x => x.id === s.client_id)
          return (
            <div key={s.id}
              onClick={() => { if (!dragging.current) onToggle(s.id, s.done) }}
              style={{display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderBottom: i < sessions.length-1 ? '1px solid #2a3045' : 'none', cursor:'pointer'}}
            >
              <div style={{width:36,height:36,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:14,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{c?.name||'Гість'}</div>
                <div style={{fontSize:11,color:'#8891ad',marginTop:1}}>{s.type}</div>
              </div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600,background:s.done?'rgba(61,232,122,.12)':'rgba(200,255,71,.12)',color:s.done?'#3de87a':'#c8ff47'}}>{s.done?'✓ Виконано':'Заплановано'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day Timeline (duration-aware) ───────────────────────────────────────────
function DayTimeline({ sessions, clients }) {
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
    <div style={{background:'#181c24', border:'1px solid #2a3045', borderRadius:14, padding:16, marginTop:12}}>
      <div style={{fontSize:11,color:'#8891ad',fontWeight:600,textTransform:'uppercase',letterSpacing:.5,marginBottom:12}}>Денний графік</div>
      <div style={{display:'flex', gap:8}}>
        {/* Hour labels */}
        <div style={{display:'flex', flexDirection:'column', flexShrink:0}}>
          {HOURS.map(h => (
            <div key={h} style={{
              height: SLOT_H, display:'flex', alignItems:'flex-start', paddingTop:4,
              color: h === now.getHours() ? '#c8ff47' : '#5a6482',
              fontSize:10, width:36, fontFamily:'monospace',
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
              background: h === now.getHours() ? 'rgba(200,255,71,.25)' : '#2a3045',
            }}/>
          ))}

          {/* Current time line */}
          {showNow && (
            <div style={{position:'absolute', left:0, right:0, top: nowOffset, zIndex:10, display:'flex', alignItems:'center', gap:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#c8ff47',flexShrink:0,marginLeft:-4}}/>
              <div style={{flex:1,height:2,background:'#c8ff47',borderRadius:1}}/>
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
              <div key={s.id} style={{
                position:'absolute', top, left, width:w, height,
                borderRadius:10,
                background: (c?.color||'#888')+'18',
                border:`1.5px solid ${(c?.color||'#888')}50`,
                display:'flex', flexDirection:'column', justifyContent:'center',
                padding:'4px 8px', overflow:'hidden', zIndex:2,
              }}>
                <div style={{display:'flex', alignItems:'center', gap:5}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:c?.color||'#888',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontWeight:700,fontSize:9,color:'#111',flexShrink:0}}>
                    {c?.ava}
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:'#eef0f7',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',flex:1}}>
                    {isplit ? c?.name?.split(' ')[0] : c?.name}
                  </span>
                  {s.done && <span style={{color:'#3de87a',fontSize:9,flexShrink:0}}>✓</span>}
                </div>
                {s.dur >= 45 && (
                  <div style={{fontSize:9,color:'#5a6482',marginTop:2,marginLeft:25}}>
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
    <div style={{position:'relative', height:containerH, overflow:'hidden', borderRadius:12, background:'#1e2330', border:'1px solid #2a3045'}}>
      {/* Selection highlight */}
      <div style={{position:'absolute', left:0, right:0, top: ITEM_H, height: ITEM_H,
        background:'rgba(200,255,71,.08)', borderTop:'1px solid rgba(200,255,71,.2)',
        borderBottom:'1px solid rgba(200,255,71,.2)', pointerEvents:'none', zIndex:2}}/>
      {/* Top/bottom fade */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:ITEM_H,
        background:'linear-gradient(to bottom, #1e2330, transparent)',pointerEvents:'none',zIndex:3}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:ITEM_H,
        background:'linear-gradient(to top, #1e2330, transparent)',pointerEvents:'none',zIndex:3}}/>
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
              color: value===opt ? '#c8ff47' : '#5a6482',
              transition:'all 0.15s',
            }}>
            {opt} хв
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Pick client modal (for split swipe) ─────────────────────────────────────
function PickClientModal({ sessions, clients, onPick, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}} onClick={onClose}>
      <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:'#2a3045',borderRadius:2,margin:'0 auto 18px'}}/>
        <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:16}}>Кого редагувати?</div>
        {sessions.map(s => {
          const c = clients.find(x => x.id === s.client_id)
          return (
            <div key={s.id} onClick={() => onPick(s)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',background:'#1e2330',borderRadius:12,marginBottom:8,cursor:'pointer',border:'1px solid #2a3045'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:15,color:'#111'}}>{c?.ava||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
                <div style={{fontSize:12,color:'#8891ad'}}>{s.time} · {s.type}</div>
              </div>
              <span style={{color:'#3B82F6',fontSize:20}}>›</span>
            </div>
          )
        })}
        <button onClick={onClose} style={{width:'100%',marginTop:4,padding:11,borderRadius:12,border:'1px solid #2a3045',background:'transparent',color:'#8891ad',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>Скасувати</button>
      </div>
    </div>
  )
}

// ─── Edit/Delete Modal ────────────────────────────────────────────────────────
function EditSessionModal({ session, clients, onClose, onSave, onDelete }) {
  const [clientId, setClientId] = useState(session.client_id)
  const [time, setTime] = useState(session.time)
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

  const inp = {width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300,padding:'0'}} onClick={onClose}>
      <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
        {/* Handle */}
        <div style={{width:40,height:4,background:'#2a3045',borderRadius:2,margin:'0 auto 18px'}}/>

        <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:18}}>Редагувати сесію</div>

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
                border:`2px solid ${clientId===c.id ? c.color : '#2a3045'}`,
                background: clientId===c.id ? c.color+'18' : '#1e2330',
                display:'flex', alignItems:'center', gap:7, cursor:'pointer',
              }}
            >
              <div style={{width:28,height:28,borderRadius:'50%',background:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:12,color:'#111'}}>{c.ava}</div>
              <span style={{fontSize:12,fontWeight:600,color:clientId===c.id?'#eef0f7':'#8891ad',whiteSpace:'nowrap'}}>{c.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Time + Type + Duration */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          <div>
            <label style={lbl}>Час</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Тип</label>
            <input value={type} onChange={e=>setType(e.target.value)} placeholder="Тренування…" style={inp}/>
          </div>
        </div>
        <label style={lbl}>Тривалість</label>
        <DurationPicker value={duration} onChange={setDuration}/>
        <div style={{marginBottom:16}}/>

        {/* Save */}
        <button
          onClick={() => onSave({...session, client_id:clientId, time, type, duration})}
          style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:8}}
        >Зберегти зміни</button>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{width:'100%',padding:11,borderRadius:12,border:'1px solid rgba(255,79,79,.3)',background:'transparent',color:'#ff4f4f',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}
          >🗑 Видалити сесію</button>
        ) : (
          <div style={{background:'rgba(255,79,79,.08)',border:'1px solid rgba(255,79,79,.25)',borderRadius:12,padding:14}}>
            <div style={{color:'#eef0f7',fontSize:13,textAlign:'center',marginBottom:12}}>Видалити цю сесію?</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setConfirmDelete(false)} style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>Скасувати</button>
              <button onClick={() => onDelete(session.id)} style={{flex:1,padding:'9px',borderRadius:10,border:'none',background:'#ff4f4f',color:'#fff',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>Видалити</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ clients, sessions, setSessions }) {
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
    await supabase.from('sessions').update({done:!done}).eq('id',id)
    setSessions(sessions.map(s=>s.id===id?{...s,done:!done}:s))
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

  const card = {background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16,marginBottom:14}

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <button onClick={prevPeriod} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',cursor:'pointer',fontSize:14}}>‹</button>
        <button onClick={nextPeriod} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',cursor:'pointer',fontSize:14}}>›</button>
        <div style={{fontFamily:'Bebas Neue',fontSize:20,flex:1}}>
          {viewMode==='week'
            ? `${weekDates[0].getDate()} — ${weekDates[6].getDate()} ${MONTHS_UK[weekDates[6].getMonth()]}`
            : `${MONTHS_UK[refDate.getMonth()]} ${refDate.getFullYear()}`}
        </div>
        <button onClick={goToday} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #2a3045',background:'#1e2330',color:'#8891ad',cursor:'pointer',fontSize:12,fontWeight:600}}>Сьогодні</button>
        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid #2a3045'}}>
          <button onClick={()=>setViewMode('week')} style={{padding:'6px 12px',border:'none',background:viewMode==='week'?'#c8ff47':'#1e2330',color:viewMode==='week'?'#111':'#8891ad',cursor:'pointer',fontSize:12,fontWeight:600}}>Тиждень</button>
          <button onClick={()=>setViewMode('month')} style={{padding:'6px 12px',border:'none',background:viewMode==='month'?'#c8ff47':'#1e2330',color:viewMode==='month'?'#111':'#8891ad',cursor:'pointer',fontSize:12,fontWeight:600}}>Місяць</button>
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
                <div key={i} onClick={()=>setSelDs(ds)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 2px',borderRadius:10,cursor:'pointer',border:`1px solid ${isSel?'#c8ff47':isToday?'#c8ff4744':'#2a3045'}`,background:isSel?'#c8ff47':isToday?'rgba(200,255,71,.08)':'#1e2330',color:isSel?'#111':'#eef0f7',transition:'all .18s'}}>
                  <span style={{fontSize:10,fontWeight:600,color:isSel?'#111':'#8891ad'}}>{DAYS_SHORT[i]}</span>
                  <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18}}>{d.getDate()}</span>
                  {has && <span style={{width:4,height:4,borderRadius:'50%',background:isSel?'#111':'#47d4ff',display:'block'}}/>}
                </div>
              )
            })}
          </div>

          {/* Day label */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontFamily:'Bebas Neue',fontSize:16,color:'#8891ad'}}>{DAYS_FULL[selDate.getDay()]}, {selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</span>
            <small style={{color:'#5a6482',fontSize:12}}>{daySessions.length} сесій</small>
          </div>

          {/* Sessions */}
          {daySessions.length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'16px 0',fontSize:14}}>Немає сесій</div>}

          {groupedSessions().map(([time, group]) =>
            group.length > 1
              ? <SplitCard key={time} sessions={group} clients={clients} onEdit={handleEdit} onToggle={toggleDone}/>
              : <SwipeSessionCard key={group[0].id} s={group[0]} clients={clients} onEdit={s => handleEdit([s])} onToggle={toggleDone}/>
          )}

          <div onClick={()=>{setFClient(clients[0]?.id||'');setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,border:'1px dashed #2a3045',cursor:'pointer',color:'#5a6482',fontSize:13,marginTop:4}}>＋ Додати сесію</div>

          {/* Timeline */}
          <DayTimeline sessions={daySessions} clients={clients}/>
        </div>
      )}

      {viewMode==='month' && (
        <div style={card}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
            {DAYS_SHORT.map(d=><div key={d} style={{textAlign:'center',fontSize:11,color:'#5a6482',fontWeight:600,padding:'4px 0'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:12}}>
            {monthDates.map(({date,current},i)=>{
              const ds = dateToStr(date)
              const count = sessions.filter(s=>s.date===ds).length
              const isToday = ds===todayDs
              const isSel = ds===selDs
              return (
                <div key={i} onClick={()=>setSelDs(ds)} style={{minHeight:40,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'6px 4px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:isSel||isToday?700:400,background:isSel?'#c8ff47':isToday?'rgba(200,255,71,.15)':'none',color:isSel?'#111':current?'#eef0f7':'#3a4460',border:isSel?'1px solid #c8ff47':isToday?'1px solid #c8ff4744':'1px solid transparent',transition:'all .15s',gap:2}}>
                  <span>{date.getDate()}</span>
                  {count>0 && <span style={{width:5,height:5,borderRadius:'50%',background:isSel?'#111':'#c8ff47',display:'block'}}/>}
                </div>
              )
            })}
          </div>
          <div style={{borderTop:'1px solid #2a3045',paddingTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontFamily:'Bebas Neue',fontSize:16,color:'#8891ad'}}>{selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</span>
              <small style={{color:'#5a6482',fontSize:12}}>{daySessions.length} сесій</small>
            </div>
            {daySessions.length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'12px 0',fontSize:13}}>Немає сесій</div>}

            {groupedSessions().map(([time, group]) =>
              group.length > 1
                ? <SplitCard key={time} sessions={group} clients={clients} onEdit={handleEdit} onToggle={toggleDone}/>
                : <SwipeSessionCard key={group[0].id} s={group[0]} clients={clients} onEdit={s => handleEdit([s])} onToggle={toggleDone}/>
            )}

            <div onClick={()=>{setFClient(clients[0]?.id||'');setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,border:'1px dashed #2a3045',cursor:'pointer',color:'#5a6482',fontSize:12,marginTop:4}}>＋ Додати сесію</div>

            <DayTimeline sessions={daySessions} clients={clients}/>
          </div>
        </div>
      )}

      {/* Add session modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
          <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:20,width:'100%',maxWidth:480,padding:24}}>
            <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:16}}>Нова сесія — {selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button onClick={()=>setSplitMode(false)} style={{flex:1,padding:'8px',borderRadius:10,border:`1px solid ${!splitMode?'#c8ff47':'#2a3045'}`,background:!splitMode?'rgba(200,255,71,.1)':'none',color:!splitMode?'#c8ff47':'#8891ad',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>👤 Один клієнт</button>
              <button onClick={()=>setSplitMode(true)} style={{flex:1,padding:'8px',borderRadius:10,border:`1px solid ${splitMode?'#c8ff47':'#2a3045'}`,background:splitMode?'rgba(200,255,71,.1)':'none',color:splitMode?'#c8ff47':'#8891ad',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>👥 Спліт (двоє)</button>
            </div>
            <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>{splitMode?'Перший клієнт':'Клієнт'}</label>
            <select value={fClient} onChange={e=>setFClient(e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,marginBottom:12,outline:'none'}}>
              <option value="">— Оберіть —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {splitMode && (
              <>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Другий клієнт</label>
                <select value={fClient2} onChange={e=>setFClient2(e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,marginBottom:12,outline:'none'}}>
                  <option value="">— Оберіть —</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Час</label>
                <input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тип</label>
                <input value={fType} onChange={e=>setFType(e.target.value)} placeholder="Силові…" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
            </div>
            <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тривалість</label>
            <DurationPicker value={fDuration} onChange={setFDuration}/>
            <div style={{marginBottom:16}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowModal(false);setSplitMode(false)}} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={saveSession} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Додати</button>
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
function ClientsTab({ clients, setClients, sessions, setSessions, records, setRecords }) {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const [tabMap, setTabMap] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [showAddRecord, setShowAddRecord] = useState(null)
  const [nc, setNc] = useState({name:'',last:'',goal:'',w:'',h:'',clip:10})
  const [nr, setNr] = useState({exercise:'',value:'',unit:'кг'})
  const [saving, setSaving] = useState(false)
  const SCHEDULE_DAYS = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД']
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
  const saveClient = async () => {
    if (!nc.name||saving) return
    setSaving(true)
    const fullName = nc.last?nc.name+' '+nc.last:nc.name
    const initials = (nc.name[0]||'')+(nc.last[0]||'')
    const {data,error} = await supabase.from('clients').insert({
      name:fullName, goal:nc.goal||'Загальна форма',
      weight:Number(nc.w)||70, height:Number(nc.h)||170,
      color:COLORS[clients.length%COLORS.length], ava:initials||'??',
      note:'', strengths:[], weaknesses:[],
      clip_total:Number(nc.clip), clip_used:0,
      schedule_days:[], schedule_times:{}
    }).select().single()
    if (!error) setClients([...clients,data])
    setSaving(false); setShowAdd(false)
    setNc({name:'',last:'',goal:'',w:'',h:'',clip:10})
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

  const DTABS = [{id:'profile',label:'Профіль'},{id:'schedule',label:'Графік'},{id:'records',label:'Рекорди'},{id:'clip',label:'Кліп-карта'},{id:'history',label:'Історія'}]
  const inp = {width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}
  const lbl = {fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Пошук клієнта…" style={{...inp,flex:1}}/>
        <button onClick={()=>setShowAdd(true)} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontWeight:700,fontSize:14,cursor:'pointer'}}>＋</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:12}}>
        {filtered.length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'40px 0',gridColumn:'1/-1'}}>Клієнтів ще немає</div>}
        {filtered.map(c=>{
          const isOpen = openId===c.id
          const progress = c.clip_total?Math.round((c.clip_used/c.clip_total)*100):0
          const activeTab = getTab(c.id)
          const cSessions = sessions.filter(s=>s.client_id===c.id)
          const cRecords = records.filter(r=>r.client_id===c.id)
          return (
            <div key={c.id} style={{background:'#181c24',border:`1px solid ${isOpen?'#c8ff47':'#2a3045'}`,borderRadius:14,overflow:'hidden',alignSelf:'start'}}>
              <div onClick={()=>setOpenId(isOpen?null:c.id)} style={{display:'flex',alignItems:'center',gap:12,padding:14,cursor:'pointer'}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:18,color:'#111',flexShrink:0}}>{c.ava}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:600}}>{c.name}</div>
                  <div style={{fontSize:12,color:'#8891ad',marginTop:2}}>{c.goal}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,background:'rgba(200,255,71,.12)',color:'#c8ff47'}}>{c.clip_used}/{c.clip_total}</span>
                  <span style={{color:'#5a6482',fontSize:14,transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 14px 14px'}}>
                <div style={{flex:1,height:4,background:'#252c3d',borderRadius:2}}>
                  <div style={{height:'100%',borderRadius:2,width:`${progress}%`,background:c.color}}/>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:c.color,minWidth:30,textAlign:'right'}}>{progress}%</span>
              </div>
              {isOpen && (
                <div style={{borderTop:'1px solid #2a3045',padding:14}}>
                  <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
                    {DTABS.map(t=>(
                      <button key={t.id} onClick={()=>setTab(c.id,t.id)} style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${activeTab===t.id?'#c8ff47':'#2a3045'}`,background:activeTab===t.id?'#c8ff47':'none',color:activeTab===t.id?'#111':'#8891ad'}}>{t.label}</button>
                    ))}
                  </div>
                  {activeTab==='profile' && (
                    <div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                        {[['Вага',`${c.weight} кг`],['Зріст',`${c.height} см`],['Сесій',cSessions.length]].map(([l,v])=>(
                          <div key={l} style={{background:'#1e2330',borderRadius:10,padding:10,textAlign:'center'}}>
                            <div style={{fontFamily:'Bebas Neue',fontSize:22}}>{v}</div>
                            <div style={{fontSize:10,color:'#8891ad',marginTop:2}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                        <div style={{background:'#1e2330',borderRadius:10,padding:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#3de87a',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>💪 Сильні</div>
                          <textarea defaultValue={(c.strengths||[]).join('\n')} onBlur={e=>updateStrengths(c.id,e.target.value)} placeholder="По одному на рядок" style={{width:'100%',background:'#252c3d',border:'1px solid #2a3045',borderRadius:8,padding:'8px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:12,resize:'none',outline:'none',minHeight:70,lineHeight:1.5}}/>
                        </div>
                        <div style={{background:'#1e2330',borderRadius:10,padding:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#ff4f4f',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>⚠️ Слабкі</div>
                          <textarea defaultValue={(c.weaknesses||[]).join('\n')} onBlur={e=>updateWeaknesses(c.id,e.target.value)} placeholder="По одному на рядок" style={{width:'100%',background:'#252c3d',border:'1px solid #2a3045',borderRadius:8,padding:'8px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:12,resize:'none',outline:'none',minHeight:70,lineHeight:1.5}}/>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>📝 Нотатка</div>
                      <textarea defaultValue={c.note} onBlur={e=>updateNote(c.id,e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 12px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,resize:'none',outline:'none',minHeight:80,lineHeight:1.5}}/>
                    </div>
                  )}
                  {activeTab==='schedule' && (
                    <div>
                      <div style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Дні та час тренувань</div>
                      {SCHEDULE_DAYS.map((day,i)=>{
                        const active = (c.schedule_days||[]).includes(i)
                        const timeVal = (c.schedule_times||{})[i] || '10:00'
                        return (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                            <button onClick={()=>toggleScheduleDay(c,i)} style={{width:44,padding:'8px 0',borderRadius:10,border:`1px solid ${active?'#c8ff47':'#2a3045'}`,background:active?'#c8ff47':'#1e2330',color:active?'#111':'#8891ad',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0}}>{day}</button>
                            {active && <input type="time" defaultValue={timeVal} onBlur={e=>updateScheduleTime(c,i,e.target.value)} style={{background:'#1e2330',border:'1px solid #2a3045',borderRadius:8,padding:'7px 10px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,outline:'none',width:110}}/>}
                            {!active && <span style={{fontSize:12,color:'#3a4460'}}>—</span>}
                          </div>
                        )
                      })}
                      <div style={{marginTop:16}}>
                        <div style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Заповнити розклад</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                          <div>
                            <label style={{fontSize:11,color:'#5a6482',display:'block',marginBottom:4}}>З дати</label>
                            <input type="date" id={`fill-from-${c.id}`} defaultValue={todayStr()} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:8,padding:'8px 10px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,outline:'none'}}/>
                          </div>
                          <div>
                            <label style={{fontSize:11,color:'#5a6482',display:'block',marginBottom:4}}>До дати</label>
                            <input type="date" id={`fill-to-${c.id}`} defaultValue={(() => { const d=new Date(); d.setMonth(d.getMonth()+1); return dateToStr(d) })()} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:8,padding:'8px 10px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,outline:'none'}}/>
                          </div>
                        </div>
                        <button onClick={()=>fillRange(c)} style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>⚡ Заповнити розклад</button>
                      </div>
                    </div>
                  )}
                  {activeTab==='records' && (
                    <div>
                      {cRecords.length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'16px 0',fontSize:14}}>Рекордів ще немає</div>}
                      {cRecords.map(r=>(
                        <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,background:'#1e2330',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600}}>{r.exercise}</div>
                            <div style={{fontSize:11,color:'#8891ad',marginTop:2}}>{r.date}</div>
                          </div>
                          <div style={{fontFamily:'Bebas Neue',fontSize:22,color:'#c8ff47'}}>{r.value} <span style={{fontFamily:'DM Sans',fontSize:12,color:'#8891ad'}}>{r.unit}</span></div>
                          <button onClick={()=>deleteRecord(r.id)} style={{background:'none',border:'none',color:'#5a6482',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✕</button>
                        </div>
                      ))}
                      <button onClick={()=>setShowAddRecord(c.id)} style={{width:'100%',marginTop:8,padding:'10px',borderRadius:10,border:'1px dashed #2a3045',background:'none',color:'#5a6482',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>＋ Додати рекорд</button>
                    </div>
                  )}
                  {activeTab==='clip' && (
                    <div style={{background:'#1e2330',borderRadius:12,padding:14}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                        <span style={{fontFamily:'Bebas Neue',fontSize:16}}>Кліп-карта</span>
                        <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,background:c.clip_used>=c.clip_total?'rgba(255,79,79,.12)':'rgba(61,232,122,.12)',color:c.clip_used>=c.clip_total?'#ff4f4f':'#3de87a'}}>{c.clip_used>=c.clip_total?'Вичерпано':`Залишилось: ${c.clip_total-c.clip_used}`}</span>
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                        {Array.from({length:c.clip_total},(_,i)=>(
                          <div key={i} style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,background:i<c.clip_used?'#c8ff47':i===c.clip_used?'rgba(71,212,255,.1)':'#252c3d',border:i<c.clip_used?'2px solid #c8ff47':i===c.clip_used?'2px solid #47d4ff':'2px solid #2a3045',color:i<c.clip_used?'#111':'#5a6482'}}>{i<c.clip_used?'✓':''}</div>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>useClip(c.id)} style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid #2a3045',background:'#252c3d',color:'#eef0f7',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Відмітити</button>
                        <button onClick={()=>renewClip(c.id)} style={{flex:1,padding:'9px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Поновити</button>
                      </div>
                    </div>
                  )}
                  {activeTab==='history' && (
                    <div>
                      {cSessions.filter(s=>s.done).sort((a,b)=>b.date.localeCompare(a.date)).map(s=>(
                        <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,background:'#1e2330',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                          <div style={{fontFamily:'Bebas Neue',fontSize:14,color:'#c8ff47',minWidth:55}}>{s.date.slice(5).replace('-','/')}</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:600}}>{s.type}</div>
                            <div style={{fontSize:11,color:'#8891ad',marginTop:2}}>{s.time} · Виконано</div>
                          </div>
                        </div>
                      ))}
                      {cSessions.filter(s=>s.done).length===0&&<div style={{color:'#5a6482',textAlign:'center',padding:'20px 0'}}>Історії ще немає</div>}
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
          <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:20,width:'100%',maxWidth:480,padding:24}}>
            <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:16}}>Новий клієнт</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div><label style={lbl}>Ім'я</label><input value={nc.name} onChange={e=>setNc({...nc,name:e.target.value})} placeholder="Аліна" style={inp}/></div>
              <div><label style={lbl}>Прізвище</label><input value={nc.last} onChange={e=>setNc({...nc,last:e.target.value})} placeholder="Мороз" style={inp}/></div>
            </div>
            <label style={lbl}>Мета</label>
            <input value={nc.goal} onChange={e=>setNc({...nc,goal:e.target.value})} placeholder="Схуднення…" style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
              <div><label style={lbl}>Вага</label><input type="number" value={nc.w} onChange={e=>setNc({...nc,w:e.target.value})} placeholder="70" style={inp}/></div>
              <div><label style={lbl}>Зріст</label><input type="number" value={nc.h} onChange={e=>setNc({...nc,h:e.target.value})} placeholder="170" style={inp}/></div>
              <div><label style={lbl}>Кліп</label>
                <select value={nc.clip} onChange={e=>setNc({...nc,clip:e.target.value})} style={{...inp,padding:'10px 8px'}}>
                  <option value={8}>8</option><option value={10}>10</option><option value={12}>12</option><option value={20}>20</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={saveClient} disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>{saving?'Збереження…':'Додати'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddRecord && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
          <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:20,width:'100%',maxWidth:440,padding:24}}>
            <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:16}}>Новий рекорд</div>
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
              <button onClick={()=>setShowAddRecord(null)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={()=>saveRecord(showAddRecord)} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stats Tab (unchanged) ────────────────────────────────────────────────────
function StatsTab({ sessions, clients, finance }) {
  const today = todayStr()
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - getMondayFirst(now))
  const monthStart = new Date(now.getFullYear(),now.getMonth(),1)
  const todayCount = sessions.filter(s=>s.date===today).length
  const weekCount = sessions.filter(s=>new Date(s.date+'T12:00:00')>=weekStart).length
  const monthCount = sessions.filter(s=>new Date(s.date+'T12:00:00')>=monthStart).length
  const days = Array.from({length:7},(_,i)=>{
    const d = new Date(now); d.setDate(now.getDate()-6+i)
    return {ds:dateToStr(d),lbl:d.getDate(),day:DAYS_SHORT[getMondayFirst(d)]}
  })
  const counts = days.map(d=>sessions.filter(s=>s.date===d.ds).length)
  const max = Math.max(...counts,1)
  const income = finance.filter(f=>f.type==='in').reduce((a,f)=>a+Number(f.amount),0)

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {[['Сьогодні',todayCount,'#c8ff47'],['Тиждень',weekCount,'#47d4ff'],['Місяць',monthCount,'#3de87a']].map(([l,v,cl])=>(
          <div key={l} style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16,textAlign:'center'}}>
            <div style={{fontFamily:'Bebas Neue',fontSize:42,color:cl,lineHeight:1}}>{v}</div>
            <div style={{fontSize:12,color:'#8891ad',marginTop:6}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
        <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16}}>
          <div style={{fontFamily:'Bebas Neue',fontSize:18,marginBottom:14}}>Активність — 7 днів</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,marginBottom:8}}>
            {counts.map((c,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:4}}>
                <span style={{fontSize:10,color:c>0?'#c8ff47':'#5a6482',fontWeight:600}}>{c>0?c:''}</span>
                <div style={{width:'100%',borderRadius:'4px 4px 0 0',minHeight:4,height:`${Math.max(4,(c/max)*90)}px`,background:days[i].ds===today?'#c8ff47':'#252c3d',border:`1px solid ${days[i].ds===today?'#c8ff47':'#2a3045'}`}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            {days.map((d,i)=>(
              <div key={i} style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:10,color:d.ds===today?'#c8ff47':'#5a6482'}}>{d.day}</div>
                <div style={{fontSize:9,color:'#3a4460'}}>{d.lbl}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16}}>
          <div style={{fontFamily:'Bebas Neue',fontSize:18,marginBottom:14}}>Фінанси</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            <div style={{background:'#1e2330',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#8891ad',marginBottom:4}}>Дохід</div>
              <div style={{fontFamily:'Bebas Neue',fontSize:26,color:'#3de87a'}}>{income.toLocaleString('uk')} ₴</div>
            </div>
            <div style={{background:'#1e2330',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#8891ad',marginBottom:4}}>Клієнтів</div>
              <div style={{fontFamily:'Bebas Neue',fontSize:26,color:'#c8ff47'}}>{clients.length}</div>
            </div>
          </div>
          {finance.map((f,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<finance.length-1?'1px solid #2a3045':'none'}}>
              <div>
                <div style={{fontSize:14,fontWeight:500}}>{f.name}</div>
                <div style={{fontSize:11,color:'#8891ad',marginTop:2}}>{f.date}</div>
              </div>
              <div style={{fontFamily:'Bebas Neue',fontSize:20,color:f.type==='in'?'#3de87a':'#ff4f4f'}}>{f.amount>0?'+':''}{Number(f.amount).toLocaleString('uk')} ₴</div>
            </div>
          ))}
          {finance.length===0&&<div style={{color:'#5a6482',textAlign:'center',padding:'20px 0'}}>Фінансів ще немає</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('schedule')
  const [clients, setClients] = useState([])
  const [sessions, setSessions] = useState([])
  const [finance, setFinance] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [c,s,f,r] = await Promise.all([
        supabase.from('clients').select('*').order('created_at'),
        supabase.from('sessions').select('*').order('created_at'),
        supabase.from('finance').select('*').order('created_at'),
        supabase.from('records').select('*').order('created_at'),
      ])
      if (c.data) setClients(c.data)
      if (s.data) setSessions(s.data)
      if (f.data) setFinance(f.data)
      if (r.data) setRecords(r.data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const dateStr = `${DAYS_FULL[now.getDay()]}, ${now.getDate()} ${MONTHS_UK2[now.getMonth()]}`

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',background:'#111318',color:'#c8ff47',fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2}}>
      ЗАВАНТАЖЕННЯ…
    </div>
  )

  const TABS = [['schedule','📅','Графік'],['clients','👥','Клієнти'],['stats','📊','Статистика']]

  return (
    <div style={{display:'flex',height:'100dvh',background:'#111318',color:'#eef0f7',fontFamily:'DM Sans,sans-serif'}}>
      <div className="desktop-sidebar" style={{width:220,background:'#181c24',borderRight:'1px solid #2a3045',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100dvh'}}>
        <div style={{padding:'24px 20px 20px',borderBottom:'1px solid #2a3045'}}>
          <div style={{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:1,color:'#c8ff47'}}>COACH<span style={{color:'#eef0f7'}}>PRO</span></div>
          <div style={{fontSize:12,color:'#8891ad',marginTop:4}}>{dateStr}</div>
        </div>
        <nav style={{flex:1,padding:'12px 0'}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 20px',cursor:'pointer',border:'none',fontFamily:'DM Sans',fontSize:14,fontWeight:500,textAlign:'left',borderLeft:tab===id?'3px solid #c8ff47':'3px solid transparent',background:tab===id?'rgba(200,255,71,.06)':'none',color:tab===id?'#c8ff47':'#5a6482',transition:'all .18s'}}>
              <span style={{fontSize:18}}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{padding:'16px 20px',borderTop:'1px solid #2a3045'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#c8ff47,#a8c500)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:16,color:'#111'}}>Т</div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Тренер</div>
              <div style={{fontSize:11,color:'#5a6482'}}>CoachPro</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:24}}>
          {tab==='schedule'&&<ScheduleTab clients={clients} sessions={sessions} setSessions={setSessions}/>}
          {tab==='clients'&&<ClientsTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} records={records} setRecords={setRecords}/>}
          {tab==='stats'&&<StatsTab sessions={sessions} clients={clients} finance={finance}/>}
        </div>
        <div className="mobile-tabs" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',background:'#181c24',borderTop:'1px solid #2a3045',flexShrink:0}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 4px 12px',cursor:'pointer',border:'none',background:'none',color:tab===id?'#c8ff47':'#5a6482',fontFamily:'DM Sans',fontSize:11,fontWeight:500,gap:4,borderTop:tab===id?'2px solid #c8ff47':'2px solid transparent'}}>
              <span style={{fontSize:20}}>{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
