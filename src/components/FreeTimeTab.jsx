import { useState, useEffect } from 'react'
import { supabase, getUserId } from '../supabase'
import { dateToStr, getMondayFirst } from '../constants'

const GRD = 'linear-gradient(135deg,#5EE0CE,#3FA9F0)'
const DAYS = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД']
const DAYS_FULL = ['Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота','Неділя']

// дефолтні робочі години (breakFrom/breakTo = null → перерви немає)
const DEFAULT_HOURS = {
  0:{on:true, from:8, to:20, breakFrom:null, breakTo:null},
  1:{on:true, from:8, to:20, breakFrom:null, breakTo:null},
  2:{on:true, from:8, to:20, breakFrom:null, breakTo:null},
  3:{on:true, from:8, to:20, breakFrom:null, breakTo:null},
  4:{on:true, from:8, to:20, breakFrom:null, breakTo:null},
  5:{on:true, from:10, to:16, breakFrom:null, breakTo:null},
  6:{on:false, from:10, to:16, breakFrom:null, breakTo:null},
}

// нормалізація: гарантує що в кожного дня є всі поля і всі числа — числа
const normalize = (h) => {
  const out = {}
  for (let i = 0; i < 7; i++) {
    const d = h?.[i] || {}
    out[i] = {
      on: d.on ?? DEFAULT_HOURS[i].on,
      from:      Number(d.from      ?? 8),
      to:        Number(d.to        ?? 20),
      breakFrom: d.breakFrom != null ? Number(d.breakFrom) : null,
      breakTo:   d.breakTo   != null ? Number(d.breakTo)   : null,
    }
  }
  return out
}

// ключ Supabase для кожного режиму
const STORAGE_KEY = { typical:'working_hours_typical', week:'working_hours_week', next:'working_hours_next' }

function FreeTimeTab({ sessions, clients }) {
  // окремі робочі години для кожного режиму
  const [hoursByMode, setHoursByMode] = useState({
    typical: normalize(DEFAULT_HOURS),
    week:    normalize(DEFAULT_HOURS),
    next:    normalize(DEFAULT_HOURS),
  })
  const [mode, setMode]   = useState('typical')   // typical | week | next
  const [expanded, setExpanded] = useState(null)
  const [editedMsg, setEditedMsg] = useState({})
  const [toast, setToast] = useState('')
  const [loaded, setLoaded] = useState(false)

  const hours = hoursByMode[mode]

  // завантаження всіх трьох наборів одразу
  useEffect(() => {
    const load = async () => {
      const keys = Object.values(STORAGE_KEY)
      const { data } = await supabase.from('settings').select('*').in('key', keys)
      const next = { typical:normalize(DEFAULT_HOURS), week:normalize(DEFAULT_HOURS), next:normalize(DEFAULT_HOURS) }
      if (data) {
        for (const [m, key] of Object.entries(STORAGE_KEY)) {
          const row = data.find(r => r.key === key)
          if (row?.value) { try { next[m] = normalize(JSON.parse(row.value)) } catch {} }
        }
      }
      setHoursByMode(next)
      setLoaded(true)
    }
    load()
  }, [])

  const persist = async (nextHours) => {
    setHoursByMode(prev => ({ ...prev, [mode]: nextHours }))
    const user_id = await getUserId()
    await supabase.from('settings').upsert({ key: STORAGE_KEY[mode], value: JSON.stringify(nextHours), user_id }, { onConflict:'key,user_id' })
  }

  const clearEdit = (idx) => setEditedMsg(p => { const n = {...p}; delete n[idx]; return n })
  const toggleDay = (idx) => { clearEdit(idx); persist({ ...hours, [idx]: { ...hours[idx], on: !hours[idx].on } }) }
  const setFrom = (idx, v) => { clearEdit(idx); persist({ ...hours, [idx]: { ...hours[idx], from: Number(v) } }) }
  const setTo   = (idx, v) => { clearEdit(idx); persist({ ...hours, [idx]: { ...hours[idx], to: Number(v) } }) }

  // обідня перерва
  const addBreak = (idx) => { clearEdit(idx); const h = hours[idx]; const bf = Math.min(h.from + 4, h.to - 1); persist({ ...hours, [idx]: { ...h, breakFrom: bf, breakTo: bf + 1 } }) }
  const removeBreak = (idx) => { clearEdit(idx); persist({ ...hours, [idx]: { ...hours[idx], breakFrom: null, breakTo: null } }) }
  const setBreakFrom = (idx, v) => { clearEdit(idx); persist({ ...hours, [idx]: { ...hours[idx], breakFrom: Number(v) } }) }
  const setBreakTo   = (idx, v) => { clearEdit(idx); persist({ ...hours, [idx]: { ...hours[idx], breakTo: Number(v) } }) }

  // понеділок поточного або наступного тижня
  const mondayOf = (offsetWeeks = 0) => { const d = new Date(); d.setDate(d.getDate() - getMondayFirst(d) + offsetWeeks*7); return d }
  const dateForDay = (idx) => { const base = mondayOf(mode === 'next' ? 1 : 0); const d = new Date(base); d.setDate(base.getDate() + idx); return d }

  // зайняті години
  const busyHours = (idx) => {
    if (mode === 'week' || mode === 'next') {
      const ds = dateToStr(dateForDay(idx))
      return new Set(sessions.filter(s => s.date === ds).map(s => parseInt(s.time.split(':')[0], 10)))
    }
    // typical — з графіків клієнтів
    // schedule_days зберігається як масив рядків ["0","2","4"], schedule_times як {"0":"10:00",...}
    const idxStr = String(idx)
    const set = new Set()
    clients.forEach(c => {
      const days = c.schedule_days || []
      // підтримуємо і числа, і рядки в schedule_days
      const hasDay = days.some(d => String(d) === idxStr)
      if (hasDay) {
        const times = c.schedule_times || {}
        // підтримуємо і числовий, і рядковий ключ
        const time = times[idxStr] ?? times[idx]
        if (time) set.add(parseInt(time.split(':')[0], 10))
      }
    })
    return set
  }

  const freeSlots = (idx) => {
    const h = hours[idx]
    if (!h?.on) return []
    const busy = busyHours(idx)
    const from = Number(h.from)
    const to   = Number(h.to)
    // перерва завжди з типового режиму (налаштовується один раз і діє скрізь)
    const typicalDay = hoursByMode.typical?.[idx]
    const hasBreak = typicalDay?.breakFrom != null && typicalDay?.breakTo != null
    const bFrom = hasBreak ? Number(typicalDay.breakFrom) : null
    const bTo   = hasBreak ? Number(typicalDay.breakTo)   : null
    const out = []
    for (let t = from; t < to; t++) {
      if (busy.has(t)) continue
      if (hasBreak && t >= bFrom && t < bTo) continue   // вирізаємо перерву
      out.push(t)
    }
    return out
  }

  const totalFree = DAYS.map((_, i) => freeSlots(i).length).reduce((a, b) => a + b, 0)
  const totalWork = DAYS.map((_, i) => {
    const h = hours[i]; if (!h?.on) return 0
    let w = Number(h.to) - Number(h.from)
    const typicalDay = hoursByMode.typical?.[i]
    if (typicalDay?.breakFrom != null && typicalDay?.breakTo != null) {
      w -= (Number(typicalDay.breakTo) - Number(typicalDay.breakFrom))
    }
    return Math.max(0, w)
  }).reduce((a, b) => a + b, 0)
  const workDays = DAYS.filter((_, i) => hours[i]?.on).length

  const fmt = (t) => `${String(t).padStart(2,'0')}:00`

  const buildMessage = (idx) => {
    const slots = freeSlots(idx)
    if (!slots.length) return ''
    const dayName = (mode === 'week' || mode === 'next')
      ? `${DAYS_FULL[idx]} (${dateForDay(idx).getDate()}.${String(dateForDay(idx).getMonth()+1).padStart(2,'0')})`
      : DAYS_FULL[idx]
    return `${dayName}: ${slots.map(fmt).join(', ')}.`
  }

  const msgFor = (idx) => editedMsg[idx] !== undefined ? editedMsg[idx] : buildMessage(idx)

  const ping = (m) => { setToast(m); setTimeout(() => setToast(''), 2000) }

  const copyMessage = (idx) => {
    const msg = msgFor(idx)
    if (!msg) return
    navigator.clipboard.writeText(msg)
    ping('День скопійовано')
  }

  // копіювання всього тижня
  const copyWeek = () => {
    const header = mode === 'typical' ? 'Вільні години (типовий тиждень):'
      : mode === 'week' ? 'Вільні години цього тижня:'
      : 'Вільні години наступного тижня:'
    const lines = DAYS.map((_, i) => buildMessage(i)).filter(Boolean)
    if (!lines.length) { ping('Немає вільних годин'); return }
    navigator.clipboard.writeText(`${header}\n${lines.join('\n')}`)
    ping('Тиждень скопійовано')
  }

  const card = { background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))', border:'1px solid rgba(255,255,255,.08)', borderRadius:16 }
  const selStyle = { background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#7FD4E8', fontSize:13, padding:'5px 8px', outline:'none', cursor:'pointer', fontFamily:'DM Sans' }

  return (
    <div>
      {/* Назва вкладки + копіювати тиждень (заголовок Free Time прибрано) */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <span style={{fontFamily:'Oswald',fontSize:22,color:'#E8EAF0'}}>Вільний час</span>
        <button onClick={copyWeek}
          style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:12,border:'none',background:GRD,color:'#06243B',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans'}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06243B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Копіювати тиждень
        </button>
      </div>

      {/* Статистика — 3 картки (одразу актуальні) */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
        <div style={{...card,padding:'14px 10px',textAlign:'center'}}>
          <div style={{fontFamily:'Oswald',fontSize:30,color:'#46DCA8',lineHeight:1}}>{totalFree}</div>
          <div style={{fontSize:10,color:'#878F9B',marginTop:4}}>вільних год</div>
        </div>
        <div style={{...card,padding:'14px 10px',textAlign:'center'}}>
          <div style={{fontFamily:'Oswald',fontSize:30,background:GRD,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',lineHeight:1}}>{totalWork}</div>
          <div style={{fontSize:10,color:'#878F9B',marginTop:4}}>робочих год</div>
        </div>
        <div style={{...card,padding:'14px 10px',textAlign:'center'}}>
          <div style={{fontFamily:'Oswald',fontSize:30,color:'#7FD4E8',lineHeight:1}}>{workDays}</div>
          <div style={{fontSize:10,color:'#878F9B',marginTop:4}}>робочих днів</div>
        </div>
      </div>

      {/* 3 режими */}
      {(() => {
        const mon = mondayOf(0)
        const sun = new Date(mon); sun.setDate(mon.getDate()+6)
        const monNext = mondayOf(1)
        const sunNext = new Date(monNext); sunNext.setDate(monNext.getDate()+6)
        const fmt2 = (d) => `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`
        const subtitles = {
          typical: 'Пн–Нд',
          week:    `${fmt2(mon)}–${fmt2(sun)}`,
          next:    `${fmt2(monNext)}–${fmt2(sunNext)}`,
        }
        return (
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {[['typical','Типовий'],['week','Цей тиждень'],['next','Наступний']].map(([id,label])=>(
              <div key={id} onClick={()=>{setMode(id);setExpanded(null);setEditedMsg({})}}
                style={{flex:1,textAlign:'center',padding:'8px 4px',borderRadius:10,cursor:'pointer',transition:'all .2s',
                  background:mode===id?'#101218':'rgba(255,255,255,.03)',
                  border:`1px solid ${mode===id?'rgba(94,224,206,.25)':'rgba(255,255,255,.06)'}` }}>
                <div style={{fontSize:11,fontWeight:mode===id?700:400,color:mode===id?'#E8EAF0':'#4A5A6A'}}>{label}</div>
                <div style={{fontSize:9,color:mode===id?'#5EE0CE':'#3A4A5A',marginTop:2}}>{subtitles[id]}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Дні */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {DAYS.map((d, idx) => {
          const h = hours[idx]
          const slots = freeSlots(idx)
          const isOpen = expanded === idx
          const hasBreak = h?.breakFrom !== null && h?.breakTo !== null
          return (
            <div key={d} style={{...card,padding:14,opacity:h?.on?1:.55,transition:'opacity .2s'}}>
              <div onClick={()=>setExpanded(isOpen?null:idx)} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                <div onClick={e=>{e.stopPropagation();toggleDay(idx)}} style={{width:40,height:22,borderRadius:11,flexShrink:0,
                  background:h?.on?GRD:'rgba(255,255,255,.12)',position:'relative',transition:'background .25s'}}>
                  <div style={{position:'absolute',top:2,left:h?.on?20:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .25s',boxShadow:'0 1px 3px rgba(0,0,0,.35)'}}/>
                </div>
                <span style={{fontWeight:700,fontSize:14,color:'#E8EAF0',width:28}}>{d}</span>
                {h?.on
                  ? <span style={{fontSize:13,color:'#7FD4E8',flex:1,fontFamily:'Oswald'}}>{fmt(h.from)}–{fmt(h.to)}</span>
                  : <span style={{fontSize:12,color:'#4A5A6A',flex:1}}>Вихідний</span>
                }
                {h?.on && slots.length>0 && (
                  <button onClick={e=>{e.stopPropagation();copyMessage(idx)}}
                    style={{flexShrink:0,padding:'5px 10px',borderRadius:8,border:'1px solid rgba(94,224,206,.25)',background:'rgba(94,224,206,.08)',color:'#5EE0CE',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:'DM Sans'}}>
                    📋 {slots.length}г
                  </button>
                )}
                <span style={{color:'#4A90B8',fontSize:13,transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s',flexShrink:0}}>▾</span>
              </div>

              {/* вільні години */}
              {h?.on && (
                <div style={{marginTop:12}}>
                  {slots.length>0 ? (
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {slots.map(t=>(
                        <span key={t} style={{fontSize:12,fontWeight:600,padding:'4px 10px',borderRadius:8,fontFamily:'Oswald',
                          background:'rgba(70,220,168,.1)',border:'1px solid rgba(70,220,168,.25)',color:'#46DCA8'}}>
                          {fmt(t)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{fontSize:12,color:'#4A5A6A'}}>{(mode==='week'||mode==='next')?'Всі години зайняті':'Немає вільних годин'}</div>
                  )}
                </div>
              )}

              {/* розкрите редагування */}
              {isOpen && h?.on && (
                <div style={{marginTop:14,borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:14}}>
                  <div style={{fontSize:10,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8,fontWeight:600}}>Робочі години</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
                    <select value={h.from} onChange={e=>setFrom(idx,e.target.value)} style={selStyle}>
                      {Array.from({length:24},(_,i)=>i).map(t=><option key={t} value={t} style={{background:'#101218'}}>{fmt(t)}</option>)}
                    </select>
                    <span style={{color:'#4A90B8',fontSize:13}}>—</span>
                    <select value={h.to} onChange={e=>setTo(idx,e.target.value)} style={selStyle}>
                      {Array.from({length:24},(_,i)=>i+1).map(t=><option key={t} value={t} style={{background:'#101218'}}>{fmt(t)}</option>)}
                    </select>
                  </div>

                  {/* Обідня перерва — налаштовується в типовому, діє скрізь */}
                  {(() => {
                    const typicalDay = hoursByMode.typical?.[idx]
                    const tHasBreak = typicalDay?.breakFrom != null && typicalDay?.breakTo != null
                    if (mode !== 'typical') {
                      // в інших режимах показуємо перерву з типового (лише читання)
                      return tHasBreak ? (
                        <div style={{fontSize:10,color:'#4A5A6A',marginBottom:14}}>
                          Перерва (з типового): {fmt(Number(typicalDay.breakFrom))}–{fmt(Number(typicalDay.breakTo))}
                        </div>
                      ) : null
                    }
                    // типовий режим — повне редагування
                    return (
                      <>
                        <div style={{fontSize:10,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <span>Обідня перерва</span>
                          {hasBreak && <span onClick={()=>removeBreak(idx)} style={{fontSize:10,color:'#FF6B6B',cursor:'pointer',textTransform:'none',letterSpacing:0}}>✕ Прибрати</span>}
                        </div>
                        {hasBreak ? (
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
                            <select value={h.breakFrom} onChange={e=>setBreakFrom(idx,e.target.value)} style={selStyle}>
                              {Array.from({length:h.to-h.from},(_,i)=>h.from+i).map(t=><option key={t} value={t} style={{background:'#101218'}}>{fmt(t)}</option>)}
                            </select>
                            <span style={{color:'#4A90B8',fontSize:13}}>—</span>
                            <select value={h.breakTo} onChange={e=>setBreakTo(idx,e.target.value)} style={selStyle}>
                              {Array.from({length:h.to-h.breakFrom},(_,i)=>h.breakFrom+1+i).map(t=><option key={t} value={t} style={{background:'#101218'}}>{fmt(t)}</option>)}
                            </select>
                          </div>
                        ) : (
                          <button onClick={()=>addBreak(idx)}
                            style={{marginBottom:14,padding:'8px 14px',borderRadius:10,border:'1px dashed rgba(94,224,206,.35)',background:'rgba(94,224,206,.05)',color:'#5EE0CE',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans',display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:14,lineHeight:1}}>+</span> Додати перерву
                          </button>
                        )}
                      </>
                    )
                  })()}

                  {/* повідомлення */}
                  {buildMessage(idx) && (
                    <>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <span style={{fontSize:10,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,fontWeight:600}}>Повідомлення</span>
                        {editedMsg[idx]!==undefined && (
                          <span onClick={()=>clearEdit(idx)} style={{fontSize:10,color:'#5EE0CE',cursor:'pointer'}}>↺ Скинути</span>
                        )}
                      </div>
                      <textarea
                        value={msgFor(idx)}
                        onChange={e=>setEditedMsg(p=>({...p,[idx]:e.target.value}))}
                        rows={3}
                        style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(94,224,206,.2)',borderRadius:12,padding:12,color:'#C8CBD0',fontSize:13,lineHeight:1.6,fontFamily:'DM Sans',outline:'none',resize:'vertical',minHeight:72,boxSizing:'border-box'}}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toast */}
      <div style={{position:'fixed',bottom:88,left:0,right:0,display:'flex',justifyContent:'center',pointerEvents:'none',zIndex:300}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'#101218',border:'1px solid rgba(94,224,206,.3)',borderRadius:30,padding:'10px 18px',boxShadow:'0 8px 24px rgba(0,0,0,.5)',transform:toast?'translateY(0)':'translateY(70px)',opacity:toast?1:0,transition:'transform .3s cubic-bezier(.34,1.3,.64,1), opacity .25s'}}>
          <div style={{width:18,height:18,borderRadius:'50%',background:'rgba(70,220,168,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{fontSize:10,color:'#46DCA8'}}>✓</span>
          </div>
          <span style={{color:'#EAECEF',fontSize:13,fontWeight:600}}>{toast || 'Скопійовано'}</span>
        </div>
      </div>
    </div>
  )
}

export default FreeTimeTab
