import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

const COLORS = ['#c8ff47','#47d4ff','#ff6b9d','#ffa347','#3de87a','#c47aff','#ff4f4f']
const MONTHS_UK = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']
const DAYS_SHORT = ['НД','ПН','ВТ','СР','ЧТ','ПТ','СБ']
const DAYS_FULL = ['Неділя','Понеділок','Вівторок','Середа','Четвер','Пятниця','Субота']

function todayStr() { return new Date().toISOString().slice(0,10) }

// ── SCHEDULE TAB ──
function ScheduleTab({ clients, sessions, setSessions }) {
  const today = new Date()
  const [selDay, setSelDay] = useState(today.getDay())
  const [showModal, setShowModal] = useState(false)
  const [fClient, setFClient] = useState('')
  const [fTime, setFTime] = useState('10:00')
  const [fType, setFType] = useState('')

  const getDate = (i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i)
    return d
  }

  const selDate = getDate(selDay)
  const selDs = selDate.toISOString().slice(0,10)
  const daySessions = sessions.filter(s => s.date === selDs).sort((a,b) => a.time.localeCompare(b.time))

  const toggleDone = async (id, done) => {
    await supabase.from('sessions').update({ done: !done }).eq('id', id)
    setSessions(sessions.map(s => s.id===id ? {...s, done:!done} : s))
  }

  const saveSession = async () => {
    if (!fClient) return
    const { data, error } = await supabase.from('sessions').insert({
      client_id: fClient, time: fTime, type: fType||'Тренування', date: selDs, done: false
    }).select().single()
    if (!error) setSessions([...sessions, data])
    setShowModal(false); setFType('')
  }

  return (
    <div>
      {/* Week strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6,marginBottom:16}}>
        {Array.from({length:7},(_,i)=>{
          const d = getDate(i)
          const ds = d.toISOString().slice(0,10)
          const has = sessions.some(s=>s.date===ds)
          const active = i===selDay
          return (
            <div key={i} onClick={()=>setSelDay(i)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'8px 2px',borderRadius:10,cursor:'pointer',border:`1px solid ${active?'#c8ff47':'#2a3045'}`,background:active?'#c8ff47':'#1e2330',color:active?'#111':'#eef0f7',transition:'all .18s'}}>
              <span style={{fontSize:10,fontWeight:600,color:active?'#111':'#8891ad'}}>{DAYS_SHORT[i]}</span>
              <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18}}>{d.getDate()}</span>
              {has && <span style={{width:4,height:4,borderRadius:'50%',background:active?'#111':'#47d4ff',display:'block'}}/>}
            </div>
          )
        })}
      </div>

      <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <span style={{fontFamily:'Bebas Neue',fontSize:18}}>{DAYS_FULL[selDay]}, {selDate.getDate()} {MONTHS_UK[selDate.getMonth()]}</span>
          <small style={{color:'#8891ad',fontSize:12}}>{daySessions.length} сесій</small>
        </div>

        {daySessions.length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'20px 0',fontSize:14}}>Немає сесій</div>}

        {daySessions.map(s=>{
          const c = clients.find(x=>x.id===s.client_id)
          return (
            <div key={s.id} onClick={()=>toggleDone(s.id,s.done)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:12,background:'#1e2330',border:`1px solid ${s.done?'#3de87a33':'#2a3045'}`,marginBottom:8,cursor:'pointer',transition:'all .18s'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:15,color:'#111',flexShrink:0}}>{c?.ava||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
                <div style={{fontSize:12,color:'#8891ad',marginTop:2}}>{s.type}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'Bebas Neue',fontSize:22,color:'#c8ff47'}}>{s.time}</div>
                <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,fontWeight:600,background:s.done?'rgba(61,232,122,.12)':'rgba(200,255,71,.12)',color:s.done?'#3de87a':'#c8ff47'}}>{s.done?'✓ Виконано':'Заплановано'}</span>
              </div>
            </div>
          )
        })}

        <div onClick={()=>{setFClient(clients[0]?.id||'');setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,border:'1px dashed #2a3045',cursor:'pointer',color:'#5a6482',fontSize:13,marginTop:4,transition:'all .18s'}}>＋ Додати сесію</div>
      </div>

      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
          <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:20,width:'100%',maxWidth:480,padding:24}}>
            <div style={{fontFamily:'Bebas Neue',fontSize:22,marginBottom:16}}>Нова сесія</div>
            <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Клієнт</label>
            <select value={fClient} onChange={e=>setFClient(e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,marginBottom:12,outline:'none'}}>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
  const [saving, setSaving] = useState(false)

  const filtered = clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))
  const setTab = (id,t) => setTabMap(p=>({...p,[id]:t}))
  const getTab = (id) => tabMap[id]||'profile'

  const updateNote = async (id, note) => {
    await supabase.from('clients').update({note}).eq('id',id)
    setClients(clients.map(c=>c.id===id?{...c,note}:c))
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
      clip_total:Number(nc.clip), clip_used:0
    }).select().single()
    if (!error) setClients([...clients,data])
    setSaving(false)
    setShowAdd(false)
    setNc({name:'',last:'',goal:'',w:'',h:'',clip:10})
  }

  const DTABS = [{id:'profile',label:'Профіль'},{id:'records',label:'Рекорди'},{id:'clip',label:'Кліп-карта'},{id:'history',label:'Історія'}]

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Пошук клієнта…" style={{flex:1,background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
        <button onClick={()=>setShowAdd(true)} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#c8ff47',color:'#111',fontWeight:700,fontSize:14,cursor:'pointer'}}>＋</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:12}}>
        {filtered.length===0 && <div style={{color:'#5a6482',textAlign:'center',padding:'40px 0',gridColumn:'1/-1'}}>Клієнтів ще немає</div>}

        {filtered.map(c=>{
          const isOpen = openId===c.id
          const progress = c.clip_total?Math.round((c.clip_used/c.clip_total)*100):0
          const activeTab = getTab(c.id)
          const cSessions = sessions.filter(s=>s.client_id===c.id)

          return (
            <div key={c.id} style={{background:'#181c24',border:`1px solid ${isOpen?'#c8ff47':'#2a3045'}`,borderRadius:14,overflow:'hidden',transition:'border-color .18s',alignSelf:'start'}}>
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
                  <div style={{height:'100%',borderRadius:2,width:`${progress}%`,background:c.color,transition:'width .5s'}}/>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:c.color,minWidth:30,textAlign:'right'}}>{progress}%</span>
              </div>

              {isOpen && (
                <div style={{borderTop:'1px solid #2a3045',padding:14}}>
                  <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
                    {DTABS.map(t=>(
                      <button key={t.id} onClick={()=>setTab(c.id,t.id)} style={{padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${activeTab===t.id?'#c8ff47':'#2a3045'}`,background:activeTab===t.id?'#c8ff47':'none',color:activeTab===t.id?'#111':'#8891ad',transition:'all .18s'}}>{t.label}</button>
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
                          <div style={{fontSize:11,fontWeight:600,color:'#3de87a',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>💪 Сильні</div>
                          {(c.strengths||[]).map((s,i)=><div key={i} style={{fontSize:12,marginBottom:3}}>✓ {s}</div>)}
                          {(!c.strengths||c.strengths.length===0)&&<div style={{fontSize:12,color:'#5a6482'}}>—</div>}
                        </div>
                        <div style={{background:'#1e2330',borderRadius:10,padding:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#ff4f4f',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>⚠️ Слабкі</div>
                          {(c.weaknesses||[]).map((s,i)=><div key={i} style={{fontSize:12,marginBottom:3}}>• {s}</div>)}
                          {(!c.weaknesses||c.weaknesses.length===0)&&<div style={{fontSize:12,color:'#5a6482'}}>—</div>}
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>📝 Нотатка</div>
                      <textarea defaultValue={c.note} onBlur={e=>updateNote(c.id,e.target.value)} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 12px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:13,resize:'none',outline:'none',minHeight:80,lineHeight:1.5}}/>
                    </div>
                  )}

                  {activeTab==='records' && (
                    <div style={{color:'#5a6482',textAlign:'center',padding:'20px 0',fontSize:14}}>Рекорди — буде додано незабаром</div>
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
            <input value={nc.goal} onChange={e=>setNc({...nc,goal:e.target.value})} placeholder="Схуднення…" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none',marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Вага (кг)</label>
                <input type="number" value={nc.w} onChange={e=>setNc({...nc,w:e.target.value})} placeholder="70" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Зріст (см)</label>
                <input type="number" value={nc.h} onChange={e=>setNc({...nc,h:e.target.value})} placeholder="170" style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 14px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'#8891ad',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Кліп-карта</label>
                <select value={nc.clip} onChange={e=>setNc({...nc,clip:e.target.value})} style={{width:'100%',background:'#1e2330',border:'1px solid #2a3045',borderRadius:10,padding:'10px 8px',color:'#eef0f7',fontFamily:'DM Sans',fontSize:14,outline:'none'}}>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={12}>12</option>
                  <option value={20}>20</option>
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
    </div>
  )
}

// ── STATS TAB ──
function StatsTab({ sessions, clients, finance }) {
  const today = todayStr()
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate()-now.getDay())
  const monthStart = new Date(now.getFullYear(),now.getMonth(),1)

  const todayCount = sessions.filter(s=>s.date===today).length
  const weekCount  = sessions.filter(s=>new Date(s.date)>=weekStart).length
  const monthCount = sessions.filter(s=>new Date(s.date)>=monthStart).length

  const days = Array.from({length:7},(_,i)=>{
    const d = new Date(now); d.setDate(now.getDate()-6+i)
    return {ds:d.toISOString().slice(0,10),lbl:d.getDate(),day:DAYS_SHORT[d.getDay()]}
  })
  const counts = days.map(d=>sessions.filter(s=>s.date===d.ds).length)
  const max = Math.max(...counts,1)
  const income = finance.filter(f=>f.type==='in').reduce((a,f)=>a+Number(f.amount),0)
  const expenses = finance.filter(f=>f.type==='out').reduce((a,f)=>a+Math.abs(Number(f.amount)),0)

  return (
    <div>
      {/* Top 3 stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {[
          ['Сьогодні',todayCount,'#c8ff47'],
          ['Тиждень',weekCount,'#47d4ff'],
          ['Місяць',monthCount,'#3de87a'],
        ].map(([l,v,cl])=>(
          <div key={l} style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16,textAlign:'center'}}>
            <div style={{fontFamily:'Bebas Neue',fontSize:42,color:cl,lineHeight:1}}>{v}</div>
            <div style={{fontSize:12,color:'#8891ad',marginTop:6}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
        {/* Bar chart */}
        <div style={{background:'#181c24',border:'1px solid #2a3045',borderRadius:14,padding:16}}>
          <div style={{fontFamily:'Bebas Neue',fontSize:18,marginBottom:14}}>Активність — 7 днів</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,marginBottom:8}}>
            {counts.map((c,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:4}}>
                <span style={{fontSize:10,color:c>0?'#c8ff47':'#5a6482',fontWeight:600}}>{c>0?c:''}</span>
                <div style={{width:'100%',borderRadius:'4px 4px 0 0',minHeight:4,height:`${Math.max(4,(c/max)*90)}px`,background:days[i].ds===today?'#c8ff47':'#252c3d',border:`1px solid ${days[i].ds===today?'#c8ff47':'#2a3045'}`,transition:'height .3s'}}/>
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

        {/* Finance */}
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

// ── APP ──
export default function App() {
  const [tab, setTab] = useState('schedule')
  const [clients, setClients] = useState([])
  const [sessions, setSessions] = useState([])
  const [finance, setFinance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [c,s,f] = await Promise.all([
        supabase.from('clients').select('*').order('created_at'),
        supabase.from('sessions').select('*').order('created_at'),
        supabase.from('finance').select('*').order('created_at'),
      ])
      if (c.data) setClients(c.data)
      if (s.data) setSessions(s.data)
      if (f.data) setFinance(f.data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const dateStr = `${DAYS_FULL[now.getDay()]}, ${now.getDate()} ${MONTHS_UK[now.getMonth()]}`

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',background:'#111318',color:'#c8ff47',fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2}}>
      ЗАВАНТАЖЕННЯ…
    </div>
  )

  const TABS = [['schedule','📅','Графік'],['clients','👥','Клієнти'],['stats','📊','Статистика']]

  return (
    <div style={{display:'flex',height:'100dvh',background:'#111318',color:'#eef0f7',fontFamily:'DM Sans,sans-serif'}}>

      {/* ── DESKTOP SIDEBAR ── */}
      <div style={{width:220,background:'#181c24',borderRight:'1px solid #2a3045',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100dvh'}}>
        <div style={{padding:'24px 20px 20px',borderBottom:'1px solid #2a3045'}}>
          <div style={{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:1,color:'#c8ff47'}}>COACH<span style={{color:'#eef0f7'}}>PRO</span></div>
          <div style={{fontSize:12,color:'#8891ad',marginTop:4}}>{dateStr}</div>
        </div>
        <nav style={{flex:1,padding:'12px 0'}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 20px',cursor:'pointer',border:'none',background:'none',color:tab===id?'#c8ff47':'#5a6482',fontFamily:'DM Sans',fontSize:14,fontWeight:500,textAlign:'left',borderLeft:tab===id?'3px solid #c8ff47':'3px solid transparent',background:tab===id?'rgba(200,255,71,.06)':'none',transition:'all .18s'}}>
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

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Mobile header */}
        <div style={{display:'none',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'#181c24',borderBottom:'1px solid #2a3045',flexShrink:0,className:'mobile-header'}}>
          <div style={{fontFamily:'Bebas Neue',fontSize:22,color:'#c8ff47'}}>COACH<span style={{color:'#eef0f7'}}>PRO</span></div>
          <div style={{fontSize:12,color:'#8891ad'}}>{now.getDate()} {MONTHS_UK[now.getMonth()]}</div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:24}}>
          {tab==='schedule'&&<ScheduleTab clients={clients} sessions={sessions} setSessions={setSessions}/>}
          {tab==='clients'&&<ClientsTab clients={clients} setClients={setClients} sessions={sessions}/>}
          {tab==='stats'&&<StatsTab sessions={sessions} clients={clients} finance={finance}/>}
        </div>

        {/* Mobile bottom tabs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',background:'#181c24',borderTop:'1px solid #2a3045',flexShrink:0}} className="mobile-tabs">
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