import { useState } from 'react'
import './App.css'

const COLORS = ['#c8ff47','#47d4ff','#ff6b9d','#ffa347','#3de87a','#c47aff','#ff4f4f']
const MONTHS_UK = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']
const DAYS_SHORT = ['НД','ПН','ВТ','СР','ЧТ','ПТ','СБ']

function todayStr() { return new Date().toISOString().slice(0,10) }

const INIT_CLIENTS = [
  { id:1, name:'Аліна Мороз', goal:'Схуднення', w:72, h:168, color:'#c8ff47', ava:'АМ',
    note:'Зосередитись на кардіо. Спина — проблемна зона.',
    strengths:['Витривалість','Мотивація','Гнучкість'], weaknesses:['Сила ніг','Прес'],
    records:[{ex:'Планка',val:'3:20',unit:'хв',date:'23 трав'},{ex:'Присідання',val:'40',unit:'кг',date:'18 трав'}],
    clip:{total:10,used:7},
    history:[{date:'27 трав',name:'Кардіо + стретч',desc:'60 хв · Виконала 100%'},{date:'25 трав',name:'Функціональне',desc:'45 хв'}]
  },
  { id:2, name:'Богдан Левченко', goal:'Набір маси', w:82, h:182, color:'#47d4ff', ava:'БЛ',
    note:'Збільшити вагу в жимі.',
    strengths:['Жим лежачи','Дисципліна'], weaknesses:['Розтяжка','Кардіо'],
    records:[{ex:'Жим лежачи',val:'110',unit:'кг',date:'26 трав'},{ex:'Станова',val:'140',unit:'кг',date:'20 трав'}],
    clip:{total:10,used:4},
    history:[{date:'26 трав',name:'Груди + трицепс',desc:'60 хв · Новий рекорд!'},{date:'23 трав',name:'Спина',desc:'60 хв'}]
  },
  { id:3, name:'Олена Петрова', goal:'Загальна форма', w:61, h:165, color:'#3de87a', ava:'ОП',
    note:'Йога після тренування.',
    strengths:['Баланс','Техніка'], weaknesses:['Сила верхньої частини'],
    records:[{ex:'Планка',val:'4:00',unit:'хв',date:'25 трав'}],
    clip:{total:12,used:11},
    history:[{date:'25 трав',name:'Функціональне',desc:'60 хв'},{date:'23 трав',name:'Йога',desc:'60 хв'}]
  },
]

const INIT_SESSIONS = [
  {id:1, clientId:1, time:'09:00', type:'Кардіо + стретч', date:todayStr(), done:true},
  {id:2, clientId:2, time:'11:00', type:'Силові — груди', date:todayStr(), done:true},
  {id:3, clientId:3, time:'15:00', type:'Функціональне', date:todayStr(), done:false},
]

const INIT_FINANCE = [
  {name:'Аліна Мороз', date:'27 трав', amount:1800, type:'in'},
  {name:'Богдан Левченко', date:'26 трав', amount:2400, type:'in'},
  {name:'Олена Петрова', date:'25 трав', amount:1800, type:'in'},
  {name:'Оренда залу', date:'24 трав', amount:-3000, type:'out'},
]

// ── SCHEDULE TAB ──
function ScheduleTab({ clients, sessions, setSessions }) {
  const today = new Date()
  const [selDay, setSelDay] = useState(today.getDay())
  const [showModal, setShowModal] = useState(false)
  const [fClient, setFClient] = useState(clients[0]?.id || '')
  const [fTime, setFTime] = useState('10:00')
  const [fType, setFType] = useState('')
  const [fDur, setFDur] = useState('60 хв')

  const getDate = (dayIdx) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + dayIdx)
    return d
  }

  const selDate = getDate(selDay)
  const selDs = selDate.toISOString().slice(0,10)
  const daySessions = sessions.filter(s => s.date === selDs).sort((a,b) => a.time.localeCompare(b.time))

  const toggleDone = (id) => setSessions(sessions.map(s => s.id===id ? {...s, done:!s.done} : s))

  const saveSession = () => {
    if (!fClient) return
    setSessions([...sessions, { id: Date.now(), clientId: Number(fClient), time: fTime, type: fType||'Тренування', date: selDs, done: false }])
    setShowModal(false); setFType('')
  }

  return (
    <div>
      {/* Week strip */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6, marginBottom:16}}>
        {Array.from({length:7}, (_,i) => {
          const d = getDate(i)
          const ds = d.toISOString().slice(0,10)
          const has = sessions.some(s => s.date === ds)
          const active = i === selDay
          return (
            <div key={i} onClick={() => setSelDay(i)} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              padding:'8px 2px', borderRadius:10, cursor:'pointer',
              border:`1px solid ${active ? '#c8ff47' : '#2a3045'}`,
              background: active ? '#c8ff47' : '#1e2330',
              color: active ? '#111' : '#eef0f7',
            }}>
              <span style={{fontSize:10, fontWeight:600, color: active?'#111':'#8891ad'}}>{DAYS_SHORT[i]}</span>
              <span style={{fontFamily:'Bebas Neue, sans-serif', fontSize:18}}>{d.getDate()}</span>
              {has && <span style={{width:4,height:4,borderRadius:'50%',background: active?'#111':'#47d4ff',display:'block'}}/>}
            </div>
          )
        })}
      </div>

      <div style={{background:'#181c24', border:'1px solid #2a3045', borderRadius:14, padding:16, marginBottom:14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
          <span style={{fontFamily:'Bebas Neue',fontSize:18}}>
            {selDate.getDate()} {MONTHS_UK[selDate.getMonth()]}
          </span>
          <small style={{color:'#8891ad', fontSize:12}}>{daySessions.length} сесій</small>
        </div>

        {daySessions.length === 0 && (
          <div style={{color:'#5a6482', textAlign:'center', padding:'20px 0', fontSize:14}}>Немає сесій на цей день</div>
        )}

        {daySessions.map(s => {
          const c = clients.find(x => x.id === s.clientId)
          return (
            <div key={s.id} onClick={() => toggleDone(s.id)} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              borderRadius:12, background:'#1e2330', border:`1px solid ${s.done ? '#3de87a33' : '#2a3045'}`,
              marginBottom:8, cursor:'pointer'
            }}>
              <div style={{width:36,height:36,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:14,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
                <div style={{fontSize:12,color:'#8891ad',marginTop:2}}>{s.type}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'Bebas Neue',fontSize:20,color:'#c8ff47'}}>{s.time}</div>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600,
                  background: s.done ? 'rgba(61,232,122,.12)' : 'rgba(200,255,71,.12)',
                  color: s.done ? '#3de87a' : '#c8ff47'
                }}>{s.done ? '✓ Виконано' : 'Заплановано'}</span>
              </div>
            </div>
          )
        })}

        <div onClick={() => setShowModal(true)} style={{
          display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
          borderRadius:12, border:'1px dashed #2a3045', cursor:'pointer',
          color:'#5a6482', fontSize:13, marginTop:4, transition:'all .18s'
        }}>＋ Додати сесію</div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}}>
          <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:430,padding:20}}>
            <div style={{width:36,height:4,background:'#2a3045',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:16}}>Нова сесія</div>
            <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Клієнт</label>
            <select value={fClient} onChange={e=>setFClient(e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,marginBottom:12,outline:'none'}}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Час</label>
                <input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тривалість</label>
                <select value={fDur} onChange={e=>setFDur(e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}>
                  <option>45 хв</option><option>60 хв</option><option>90 хв</option>
                </select>
              </div>
            </div>
            <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тип тренування</label>
            <input value={fType} onChange={e=>setFType(e.target.value)} placeholder="Силові, кардіо…" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none',marginBottom:16}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={saveSession} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Додати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CLIENTS TAB ──
function ClientsTab({ clients, setClients, sessions }) {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const [tabMap, setTabMap] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [nc, setNc] = useState({name:'',last:'',goal:'',w:'',h:'',clip:10})

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const setTab = (id, t) => setTabMap(prev => ({...prev, [id]: t}))
  const getTab = (id) => tabMap[id] || 'profile'

  const updateNote = (id, note) => setClients(clients.map(c => c.id===id ? {...c, note} : c))
  const useClip = (id) => setClients(clients.map(c => c.id===id && c.clip.used < c.clip.total ? {...c, clip:{...c.clip, used:c.clip.used+1}} : c))
  const renewClip = (id) => setClients(clients.map(c => c.id===id ? {...c, clip:{...c.clip, used:0}} : c))

  const saveClient = () => {
    if (!nc.name) return
    const fullName = nc.last ? nc.name+' '+nc.last : nc.name
    const initials = (nc.name[0]||'')+(nc.last[0]||'')
    setClients([...clients, {
      id: Date.now(), name: fullName, goal: nc.goal||'Загальна форма',
      w: Number(nc.w)||70, h: Number(nc.h)||170,
      color: COLORS[clients.length % COLORS.length], ava: initials||'??',
      note:'', strengths:[], weaknesses:[], records:[], clip:{total:Number(nc.clip),used:0}, history:[]
    }])
    setShowAdd(false); setNc({name:'',last:'',goal:'',w:'',h:'',clip:10})
  }

  const DTABS = [{id:'profile',label:'Профіль'},{id:'records',label:'Рекорди'},{id:'clip',label:'Кліп-карта'},{id:'history',label:'Історія'}]

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Пошук клієнта…"
          style={{flex:1,background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
        <button onClick={()=>setShowAdd(true)} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontWeight:700,fontSize:14,cursor:'pointer'}}>＋</button>
      </div>

      {filtered.map(c => {
        const isOpen = openId === c.id
        const progress = c.clip ? Math.round((c.clip.used/c.clip.total)*100) : 0
        const activeTab = getTab(c.id)
        const cSessions = sessions.filter(s => s.clientId === c.id)

        return (
          <div key={c.id} style={{background:'#181c24',border:`1px solid ${isOpen?'#c8ff47':'#2a3045'}`,borderRadius:14,marginBottom:10,overflow:'hidden'}}>
            <div onClick={() => setOpenId(isOpen ? null : c.id)} style={{display:'flex',alignItems:'center',gap:12,padding:14,cursor:'pointer'}}>
              <div style={{width:46,height:46,borderRadius:'50%',background:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:18,color:'#111',flexShrink:0}}>{c.ava}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:600}}>{c.name}</div>
                <div style={{fontSize:12,color:'#8891ad',marginTop:2}}>{c.goal}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                {c.clip && <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,background:'rgba(200,255,71,.12)',color:'#c8ff47'}}>{c.clip.used}/{c.clip.total}</span>}
                <span style={{color:'#5a6482',fontSize:14,transform: isOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 14px 14px'}}>
              <div style={{flex:1,height:4,background:'#252c3d',borderRadius:2}}>
                <div style={{height:'100%',borderRadius:2,width:`${progress}%`,background:c.color}}/>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:c.color,minWidth:30,textAlign:'right'}}>{progress}%</span>
            </div>

            {isOpen && (
              <div style={{borderTop:'1px solid #2a3045',padding:14}}>
                {/* Detail tabs */}
                <div style={{display:'flex',gap:6,marginBottom:14}}>
                  {DTABS.map(t => (
                    <button key={t.id} onClick={()=>setTab(c.id,t.id)} style={{
                      padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
                      border:`1px solid ${activeTab===t.id?'#c8ff47':'#2a3045'}`,
                      background: activeTab===t.id ? '#c8ff47' : 'none',
                      color: activeTab===t.id ? '#111' : '#8891ad'
                    }}>{t.label}</button>
                  ))}
                </div>

                {/* PROFILE */}
                {activeTab==='profile' && (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                      {[['Вага',`${c.w} кг`],['Зріст',`${c.h} см`],['Сесій',cSessions.length]].map(([l,v])=>(
                        <div key={l} style={{background:'#1e2330',borderRadius:10,padding:10,textAlign:'center'}}>
                          <div style={{fontFamily:'Bebas Neue',fontSize:22}}>{v}</div>
                          <div style={{fontSize:10,color:'#8891ad',marginTop:2}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                      <div style={{background:'#1e2330',borderRadius:10,padding:10}}>
                        <div style={{fontSize:11,fontWeight:600,color:'#3de87a',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>💪 Сильні</div>
                        {c.strengths.map((s,i)=><div key={i} style={{fontSize:12,marginBottom:3}}>✓ {s}</div>)}
                        {c.strengths.length===0 && <div style={{fontSize:12,color:'#5a6482'}}>—</div>}
                      </div>
                      <div style={{background:'#1e2330',borderRadius:10,padding:10}}>
                        <div style={{fontSize:11,fontWeight:600,color:'#ff4f4f',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>⚠️ Слабкі</div>
                        {c.weaknesses.map((s,i)=><div key={i} style={{fontSize:12,marginBottom:3}}>• {s}</div>)}
                        {c.weaknesses.length===0 && <div style={{fontSize:12,color:'#5a6482'}}>—</div>}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>📝 Нотатка до наступного тренування</div>
                    <textarea defaultValue={c.note} onBlur={e=>updateNote(c.id,e.target.value)}
                      style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 12px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,resize:'none',outline:'none',minHeight:80,lineHeight:1.5}}/>
                  </div>
                )}

                {/* RECORDS */}
                {activeTab==='records' && (
                  <div>
                    {c.records.map((r,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'#1e2330',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                        <div style={{flex:1,fontSize:13,fontWeight:500}}>{r.ex}</div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontFamily:'Bebas Neue',fontSize:18,color:'#c8ff47'}}>{r.val} <span style={{fontFamily:'DM Sans',fontSize:12,color:'#8891ad'}}>{r.unit}</span></div>
                          <div style={{fontSize:11,color:'#8891ad'}}>{r.date}</div>
                        </div>
                      </div>
                    ))}
                    {c.records.length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'20px 0'}}>Рекордів ще немає</div>}
                  </div>
                )}

                {/* CLIP CARD */}
                {activeTab==='clip' && c.clip && (
                  <div style={{background:'#1e2330',borderRadius:12,padding:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <span style={{fontFamily:'Bebas Neue',fontSize:16}}>Кліп-карта</span>
                      <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,
                        background: c.clip.used>=c.clip.total ? 'rgba(255,79,79,.12)' : 'rgba(61,232,122,.12)',
                        color: c.clip.used>=c.clip.total ? '#ff4f4f' : '#3de87a'
                      }}>{c.clip.used>=c.clip.total ? 'Вичерпано' : `Залишилось: ${c.clip.total-c.clip.used}`}</span>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                      {Array.from({length:c.clip.total},(_,i)=>(
                        <div key={i} style={{
                          width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:11,fontWeight:700,
                          background: i<c.clip.used ? '#c8ff47' : i===c.clip.used ? 'rgba(71,212,255,.1)' : '#252c3d',
                          border: i<c.clip.used ? '2px solid #c8ff47' : i===c.clip.used ? '2px solid #47d4ff' : '2px solid #2a3045',
                          color: i<c.clip.used ? '#111' : '#5a6482'
                        }}>{i<c.clip.used ? '✓' : ''}</div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>useClip(c.id)} style={{flex:1,padding:'8px',borderRadius:10,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Відмітити</button>
                      <button onClick={()=>renewClip(c.id)} style={{flex:1,padding:'8px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Поновити</button>
                    </div>
                  </div>
                )}

                {/* HISTORY */}
                {activeTab==='history' && (
                  <div>
                    {c.history.map((h,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'#1e2330',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                        <div style={{fontFamily:'Bebas Neue',fontSize:14,color:'#c8ff47',minWidth:50}}>{h.date}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{h.name}</div>
                          <div style={{fontSize:11,color:'#8891ad',marginTop:2}}>{h.desc}</div>
                        </div>
                      </div>
                    ))}
                    {cSessions.filter(s=>s.done).map(s=>(
                      <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,background:'#1e2330',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                        <div style={{fontFamily:'Bebas Neue',fontSize:14,color:'#c8ff47',minWidth:50}}>{s.date.slice(5).replace('-','/')}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{s.type}</div>
                          <div style={{fontSize:11,color:'#8891ad',marginTop:2}}>{s.time} · Виконано</div>
                        </div>
                      </div>
                    ))}
                    {c.history.length===0 && cSessions.filter(s=>s.done).length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'20px 0'}}>Історії ще немає</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add client modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}}>
          <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:430,padding:20}}>
            <div style={{width:36,height:4,background:'#2a3045',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:16}}>Новий клієнт</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Ім'я</label>
                <input value={nc.name} onChange={e=>setNc({...nc,name:e.target.value})} placeholder="Аліна" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Прізвище</label>
                <input value={nc.last} onChange={e=>setNc({...nc,last:e.target.value})} placeholder="Мороз" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
            </div>
            <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Мета</label>
            <input value={nc.goal} onChange={e=>setNc({...nc,goal:e.target.value})} placeholder="Схуднення, набір маси…" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none',marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Вага (кг)</label>
                <input type="number" value={nc.w} onChange={e=>setNc({...nc,w:e.target.value})} placeholder="70" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Зріст (см)</label>
                <input type="number" value={nc.h} onChange={e=>setNc({...nc,h:e.target.value})} placeholder="170" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
            </div>
            <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Кліп-карта</label>
            <select value={nc.clip} onChange={e=>setNc({...nc,clip:e.target.value})} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none',marginBottom:16}}>
              <option value={8}>8 занять</option><option value={10}>10 занять</option><option value={12}>12 занять</option><option value={20}>20 занять</option>
            </select>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #2a3045',background:'#1e2330',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
              <button onClick={saveClient} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Додати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── STATS TAB ──
function StatsTab({ sessions, clients, finance }) {
  const today = todayStr()
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const todayCount = sessions.filter(s => s.date === today).length
  const weekCount  = sessions.filter(s => new Date(s.date) >= weekStart).length
  const monthCount = sessions.filter(s => new Date(s.date) >= monthStart).length

  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(now); d.setDate(now.getDate() - 6 + i)
    return { ds: d.toISOString().slice(0,10), lbl: d.getDate() }
  })
  const counts = days.map(d => sessions.filter(s => s.date === d.ds).length)
  const max = Math.max(...counts, 1)

  const income = finance.filter(f=>f.type==='in').reduce((a,f)=>a+f.amount,0)
  const expenses = finance.filter(f=>f.type==='out').reduce((a,f)=>a+Math.abs(f.amount),0)

  return (
    <div>
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,rgba(200,255,71,.08),rgba(71,212,255,.04))',border:'1px solid rgba(200,255,71,.2)',borderRadius:16,padding:20,marginBottom:14,textAlign:'center'}}>
        <div style={{fontFamily:'Bebas Neue',fontSize:64,color:'#c8ff47',lineHeight:1}}>{todayCount}</div>
        <div style={{fontSize:13,color:'#8891ad',marginTop:6}}>тренувань сьогодні</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        {[['Цього тижня',weekCount,'#47d4ff'],['Цього місяця',monthCount,'#3de87a']].map(([l,v,cl])=>(
          <div key={l} style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16,textAlign:'center'}}>
            <div style={{fontFamily:'Bebas Neue',fontSize:38,color:cl}}>{v}</div>
            <div style={{fontSize:12,color:'#8891ad'}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{fontFamily:'Bebas Neue',fontSize:18,marginBottom:14}}>Активність — 7 днів</div>
        <div style={{display:'flex',alignItems:'flex-end',gap:6,height:100,marginBottom:6}}>
          {counts.map((c,i) => (
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}}>
              <div style={{
                width:'100%', borderRadius:'4px 4px 0 0', minHeight:4,
                height: `${Math.max(4,(c/max)*90)}px`,
                background: days[i].ds===today ? '#c8ff47' : '#252c3d',
                border: `1px solid ${days[i].ds===today ? '#c8ff47' : '#2a3045'}`
              }}/>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:6}}>
          {days.map((d,i) => <span key={i} style={{flex:1,textAlign:'center',fontSize:10,color:d.ds===today?'#c8ff47':'#5a6482'}}>{d.lbl}</span>)}
        </div>
      </div>

      {/* Finance */}
      <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16}}>
        <div style={{fontFamily:'Bebas Neue',fontSize:18,marginBottom:14}}>Фінанси</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          <div style={{background:'#1e2330',borderRadius:10,padding:12}}>
            <div style={{fontSize:11,color:'#8891ad',marginBottom:4}}>Дохід</div>
            <div style={{fontFamily:'Bebas Neue',fontSize:28,color:'#3de87a'}}>{income.toLocaleString('uk')} ₴</div>
          </div>
          <div style={{background:'#1e2330',borderRadius:10,padding:12}}>
            <div style={{fontSize:11,color:'#8891ad',marginBottom:4}}>Клієнтів</div>
            <div style={{fontFamily:'Bebas Neue',fontSize:28,color:'#c8ff47'}}>{clients.length}</div>
          </div>
        </div>
        {finance.map((f,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom: i<finance.length-1 ? '1px solid #2a3045' : 'none'}}>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>{f.name}</div>
              <div style={{fontSize:11,color:'#8891ad',marginTop:2}}>{f.date}</div>
            </div>
            <div style={{fontFamily:'Bebas Neue',fontSize:20,color:f.type==='in'?'#3de87a':'#ff4f4f'}}>
              {f.amount>0?'+':''}{f.amount.toLocaleString('uk')} ₴
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── APP ──
export default function App() {
  const [tab, setTab] = useState('schedule')
  const [clients, setClients] = useState(INIT_CLIENTS)
  const [sessions, setSessions] = useState(INIT_SESSIONS)
  const finance = INIT_FINANCE

  const now = new Date()
  const dateStr = `${DAYS_SHORT[now.getDay()]}, ${now.getDate()} ${MONTHS_UK[now.getMonth()]}`

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',maxWidth:430,margin:'0 auto',background:'#111318',color:'#eef0f7',fontFamily:'DM Sans, sans-serif',position:'relative'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px 10px',background:'#181c24',borderBottom:'1px solid #2a3045',flexShrink:0}}>
        <div>
          <div style={{fontFamily:'Bebas Neue',fontSize:26,letterSpacing:1,color:'#c8ff47'}}>COACH<span style={{color:'#eef0f7'}}>PRO</span></div>
          <div style={{fontSize:12,color:'#8891ad'}}>{dateStr}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',padding:16}}>
        {tab==='schedule' && <ScheduleTab clients={clients} sessions={sessions} setSessions={setSessions}/>}
        {tab==='clients'  && <ClientsTab clients={clients} setClients={setClients} sessions={sessions}/>}
        {tab==='stats'    && <StatsTab sessions={sessions} clients={clients} finance={finance}/>}
      </div>

      {/* Bottom tabs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',background:'#181c24',borderTop:'1px solid #2a3045',flexShrink:0}}>
        {[['schedule','📅','Графік'],['clients','👥','Клієнти'],['stats','📊','Статистика']].map(([id,icon,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            padding:'10px 4px 12px',cursor:'pointer',border:'none',background:'none',
            color: tab===id ? '#c8ff47' : '#5a6482',
            fontFamily:'DM Sans',fontSize:11,fontWeight:500,gap:4,
            borderTop: tab===id ? '2px solid #c8ff47' : '2px solid transparent'
          }}>
            <span style={{fontSize:20}}>{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  )
}