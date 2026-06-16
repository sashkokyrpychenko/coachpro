import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { todayStr, dateToStr, getMondayFirst } from '../constants'

const GRD = 'linear-gradient(135deg,#5EE0CE,#3FA9F0)'
const DAYS = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД']
const DAYS_FULL = ['Понеділок','Вівторок','Середа','Четвер','П\u02bcятниця','Субота','Неділя']

// дефолтні робочі години: ПН-ПТ 08-20, СБ 10-16, НД вихідний
const DEFAULT_HOURS = {
  0:{on:true, from:8, to:20}, 1:{on:true, from:8, to:20}, 2:{on:true, from:8, to:20},
  3:{on:true, from:8, to:20}, 4:{on:true, from:8, to:20}, 5:{on:true, from:10, to:16},
  6:{on:false, from:10, to:16},
}

function FreeTimeTab({ sessions, clients }) {
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const [mode, setMode]   = useState('typical')   // typical | week
  const [loaded, setLoaded] = useState(false)
  const [shareDay, setShareDay] = useState(null)   // day idx для модалки

  // load saved working hours
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('settings').select('*').eq('key','working_hours').single()
      if (data?.value) { try { setHours(JSON.parse(data.value)) } catch {} }
      setLoaded(true)
    }
    load()
  }, [])

  const persist = async (next) => {
    setHours(next)
    await supabase.from('settings').upsert({ key:'working_hours', value: JSON.stringify(next) }, { onConflict:'key' })
  }

  const toggleDay = (idx) => persist({ ...hours, [idx]: { ...hours[idx], on: !hours[idx].on } })
  const setFrom = (idx, v) => persist({ ...hours, [idx]: { ...hours[idx], from: Number(v) } })
  const setTo   = (idx, v) => persist({ ...hours, [idx]: { ...hours[idx], to: Number(v) } })

  // дата понеділка поточного тижня
  const monday = (() => { const d = new Date(); d.setDate(d.getDate() - getMondayFirst(d)); return d })()
  const dateForDay = (idx) => { const d = new Date(monday); d.setDate(monday.getDate() + idx); return d }

  // зайняті години для дня (з сесій цього тижня) — лише в режимі "week"
  const busyHours = (idx) => {
    if (mode !== 'week') return new Set()
    const ds = dateToStr(dateForDay(idx))
    return new Set(
      sessions.filter(s => s.date === ds).map(s => parseInt(s.time.split(':')[0], 10))
    )
  }

  // вільні слоти дня
  const freeSlots = (idx) => {
    const h = hours[idx]
    if (!h?.on) return []
    const busy = busyHours(idx)
    const out = []
    for (let t = h.from; t < h.to; t++) if (!busy.has(t)) out.push(t)
    return out
  }

  // підрахунки
  const totalFree = DAYS.map((_, i) => freeSlots(i).length).reduce((a, b) => a + b, 0)
  const totalWork = DAYS.map((_, i) => hours[i]?.on ? hours[i].to - hours[i].from : 0).reduce((a, b) => a + b, 0)

  const fmt = (t) => `${String(t).padStart(2,'0')}:00`

  // повідомлення для клієнтів
  const buildMessage = (idx) => {
    const slots = freeSlots(idx)
    const dayName = mode === 'week'
      ? `${DAYS_FULL[idx]} (${dateForDay(idx).getDate()}.${String(dateForDay(idx).getMonth()+1).padStart(2,'0')})`
      : DAYS_FULL[idx]
    if (!slots.length) return ''
    const list = slots.map(fmt).join(', ')
    return `Привіт! Є вільні вікна на тренування — ${dayName}: ${list}. Хто хоче — пишіть 💪`
  }

  const copyMessage = (idx) => {
    const msg = buildMessage(idx)
    navigator.clipboard.writeText(msg)
    setShareDay(null)
    alert('✅ Повідомлення скопійовано!')
  }

  const card = { background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))', border:'1px solid rgba(255,255,255,.08)', borderRadius:16 }

  return (
    <div>
      {/* header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:20}}>⏱</span>
            <span style={{fontFamily:'Oswald',fontSize:22,color:'#E8EAF0'}}>Free Time</span>
          </div>
          <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>Вільний час для нових клієнтів</div>
        </div>
      </div>

      {/* stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        <div style={{...card,padding:16}}>
          <div style={{fontSize:11,color:'#46DCA8',fontWeight:600,marginBottom:6}}>🟢 Вільних</div>
          <div style={{fontFamily:'Oswald',fontSize:38,color:'#46DCA8',lineHeight:1}}>{totalFree}</div>
          <div style={{fontSize:10,color:'#4A90B8',marginTop:4}}>годин на тиждень</div>
        </div>
        <div style={{...card,padding:16}}>
          <div style={{fontSize:11,color:'#7FD4E8',fontWeight:600,marginBottom:6}}>📋 Робочих</div>
          <div style={{fontFamily:'Oswald',fontSize:38,background:GRD,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',lineHeight:1}}>{totalWork}</div>
          <div style={{fontSize:10,color:'#4A90B8',marginTop:4}}>годин на тиждень</div>
        </div>
      </div>

      {/* mode toggle */}
      <div style={{display:'flex',gap:4,background:'rgba(255,255,255,.04)',borderRadius:12,padding:4,marginBottom:16}}>
        {[['typical','Типовий тиждень'],['week','Цей тиждень']].map(([id,label])=>(
          <div key={id} onClick={()=>setMode(id)}
            style={{flex:1,textAlign:'center',padding:'9px 4px',borderRadius:8,fontSize:12,fontWeight:mode===id?700:400,
              background:mode===id?'#101218':'transparent',color:mode===id?'#E8EAF0':'#4A5A6A',cursor:'pointer',transition:'all .2s'}}>
            {label}
          </div>
        ))}
      </div>

      {/* days */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {DAYS.map((d, idx) => {
          const h = hours[idx]
          const slots = freeSlots(idx)
          return (
            <div key={d} style={{...card,padding:14,opacity:h?.on?1:.55,transition:'opacity .2s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:h?.on?12:0}}>
                {/* toggle */}
                <div onClick={()=>toggleDay(idx)} style={{width:40,height:22,borderRadius:11,flexShrink:0,cursor:'pointer',
                  background:h?.on?GRD:'rgba(255,255,255,.12)',position:'relative',transition:'background .25s'}}>
                  <div style={{position:'absolute',top:2,left:h?.on?20:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .25s',boxShadow:'0 1px 3px rgba(0,0,0,.35)'}}/>
                </div>
                <span style={{fontWeight:700,fontSize:14,color:'#E8EAF0',width:28}}>{d}</span>
                {h?.on ? (
                  <div style={{display:'flex',alignItems:'center',gap:4,flex:1}}>
                    <select value={h.from} onChange={e=>setFrom(idx,e.target.value)}
                      style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#7FD4E8',fontSize:13,padding:'4px 6px',outline:'none',cursor:'pointer',fontFamily:'DM Sans'}}>
                      {Array.from({length:24},(_,i)=>i).map(t=><option key={t} value={t} style={{background:'#101218'}}>{fmt(t)}</option>)}
                    </select>
                    <span style={{color:'#4A90B8',fontSize:13}}>—</span>
                    <select value={h.to} onChange={e=>setTo(idx,e.target.value)}
                      style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#7FD4E8',fontSize:13,padding:'4px 6px',outline:'none',cursor:'pointer',fontFamily:'DM Sans'}}>
                      {Array.from({length:24},(_,i)=>i+1).map(t=><option key={t} value={t} style={{background:'#101218'}}>{fmt(t)}</option>)}
                    </select>
                  </div>
                ) : (
                  <span style={{flex:1,fontSize:12,color:'#4A5A6A'}}>Вихідний</span>
                )}
                {/* share btn */}
                {h?.on && slots.length>0 && (
                  <button onClick={()=>setShareDay(idx)}
                    style={{flexShrink:0,padding:'5px 10px',borderRadius:8,border:'1px solid rgba(94,224,206,.25)',background:'rgba(94,224,206,.08)',color:'#5EE0CE',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:'DM Sans'}}>
                    ✉️ {slots.length}г
                  </button>
                )}
              </div>
              {/* slots */}
              {h?.on && (
                slots.length>0 ? (
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {slots.map(t=>(
                      <span key={t} style={{fontSize:12,fontWeight:600,padding:'4px 10px',borderRadius:8,fontFamily:'Oswald',
                        background:'rgba(70,220,168,.1)',border:'1px solid rgba(70,220,168,.25)',color:'#46DCA8'}}>
                        {fmt(t)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize:12,color:'#4A5A6A'}}>{mode==='week'?'Всі години зайняті':'—'}</div>
                )
              )}
            </div>
          )
        })}
      </div>

      {/* share modal */}
      {shareDay!==null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:400}} onClick={()=>setShareDay(null)}>
          <div style={{background:'#101218',border:'1px solid rgba(255,255,255,.1)',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:20,marginBottom:6,color:'#E8EAF0'}}>Повідомлення клієнтам</div>
            <div style={{fontSize:12,color:'#4A90B8',marginBottom:14}}>{DAYS_FULL[shareDay]} · {freeSlots(shareDay).length} вільних годин</div>
            <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(94,224,206,.2)',borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{color:'#C8CBD0',fontSize:13,lineHeight:1.6}}>{buildMessage(shareDay)}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>copyMessage(shareDay)}
                style={{flex:1,padding:12,borderRadius:12,border:'none',background:GRD,color:'#000',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans'}}>
                📋 Копіювати
              </button>
              <button onClick={()=>{ window.open(`https://t.me/share/url?url=${encodeURIComponent('')}&text=${encodeURIComponent(buildMessage(shareDay))}`,'_blank'); setShareDay(null) }}
                style={{flex:1,padding:12,borderRadius:12,border:'1px solid rgba(36,161,222,.3)',background:'rgba(36,161,222,.12)',color:'#29b6f6',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans'}}>
                Telegram
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FreeTimeTab
