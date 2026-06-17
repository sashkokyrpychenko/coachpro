import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { todayStr, dateToStr, getMondayFirst, COLORS, MONTHS_UK2, DAYS_SHORT } from '../constants'
import ClipTab from './ClipTab'
import ProgramsTab from './ProgramsTab'

// ── NoteRow — окрема нотатка зі свайп-видаленням ──
function NoteRow({ note, onDelete }) {
  const [offset, setOffset] = useState(0)
  const [removing, setRemoving] = useState(false)
  const startX = useRef(null)
  const isDragging = useRef(false)

  const onStart = (x) => { startX.current = x; isDragging.current = false }
  const onMove  = (x) => {
    if (startX.current === null) return
    const dx = x - startX.current
    if (Math.abs(dx) > 4) isDragging.current = true
    if (dx < 0) setOffset(Math.max(dx, -72)); else setOffset(0)
  }
  const onEnd = () => {
    if (offset < -36) { setRemoving(true); setTimeout(() => onDelete(note.id), 260) }
    else setOffset(0)
    startX.current = null
  }

  return (
    <div style={{position:'relative',overflow:'hidden',borderRadius:9,marginBottom:5,maxHeight:removing?0:80,opacity:removing?0:1,transition:'max-height .26s ease, opacity .26s ease'}}>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:72,background:'rgba(255,60,60,.15)',border:'1px solid rgba(255,60,60,.2)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',opacity:offset<0?1:0,transition:'opacity .15s',pointerEvents:'none'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </div>
      <div
        onTouchStart={e=>onStart(e.touches[0].clientX)} onTouchMove={e=>onMove(e.touches[0].clientX)} onTouchEnd={onEnd}
        onMouseDown={e=>onStart(e.clientX)} onMouseMove={e=>{if(startX.current!==null)onMove(e.clientX)}} onMouseUp={onEnd} onMouseLeave={onEnd}
        style={{display:'flex',alignItems:'flex-start',gap:8,padding:'8px 10px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:9,transform:`translateX(${offset}px)`,transition:offset===0?'transform .2s ease':'none',position:'relative',zIndex:1,userSelect:'none',cursor:'grab'}}
      >
        <div style={{width:4,height:4,borderRadius:'50%',background:'rgba(94,224,206,.4)',flexShrink:0,marginTop:5}}/>
        <span style={{color:'#C8CBD0',fontSize:12,lineHeight:1.55,flex:1}}>{note.text}</span>
      </div>
    </div>
  )
}

// ── AddNoteRow — рядок-дія для додавання нотатки ──
function AddNoteRow({ open, text, onOpen, onClose, onTextChange, onSave }) {
  if (open) return (
    <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(94,224,206,.2)',borderRadius:9,padding:'8px 10px'}}>
      <input autoFocus value={text} onChange={e=>onTextChange(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter')onSave();if(e.key==='Escape')onClose();}}
        placeholder="Введи нотатку..."
        style={{width:'100%',background:'none',border:'none',outline:'none',color:'#E8EAF0',fontSize:12,lineHeight:1.55,fontFamily:'DM Sans'}}/>
      <div style={{display:'flex',justifyContent:'flex-end',gap:6,marginTop:6}}>
        <button onClick={onClose} style={{padding:'3px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,.1)',background:'none',color:'#6B7280',fontSize:11,cursor:'pointer',fontFamily:'DM Sans'}}>Скасувати</button>
        <button onClick={onSave} style={{padding:'3px 10px',borderRadius:7,border:'none',background:text.trim()?'linear-gradient(135deg,#5EE0CE,#3FA9F0)':'rgba(255,255,255,.06)',color:text.trim()?'#000':'#4A5568',fontSize:11,fontWeight:700,cursor:text.trim()?'pointer':'default',fontFamily:'DM Sans',transition:'all .2s'}}>Зберегти</button>
      </div>
    </div>
  )
  return (
    <div onClick={onOpen} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,border:'1px dashed rgba(255,255,255,.09)',cursor:'pointer',marginTop:2}}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2.2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      <span style={{color:'#4A5568',fontSize:11}}>Додати нотатку</span>
    </div>
  )
}

function ClientsTab({ clients, setClients, sessions, setSessions, records, setRecords, pricePlans, setFinance, programs, setPrograms, openClientId, clearOpenClientId }) {
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
  const [showAddMetric, setShowAddMetric] = useState(null)
  const [showAddMeasure, setShowAddMeasure] = useState(null)
  const [openMetricChart, setOpenMetricChart] = useState(null)
  const [nm, setNm] = useState({name:'', unit:'кг'})
  const [nv, setNv] = useState({value:'', date: todayStr()})
  const [noteInput, setNoteInput] = useState({})   // clientId → текст
  const [noteOpen,  setNoteOpen]  = useState({})   // clientId → bool
  const [barsIn, setBarsIn] = useState(false)      // тригер заповнення прогрес-барів
  useEffect(() => { const t = setTimeout(()=>setBarsIn(true), 80); return ()=>clearTimeout(t) }, [])

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

  // ── Нотатки як масив ──────────────────────────────
  const parseNotes = (c) => {
    try {
      const p = JSON.parse(c.note||'[]')
      return Array.isArray(p) ? p : (c.note ? [{id:0,text:c.note}] : [])
    } catch { return c.note ? [{id:0,text:c.note}] : [] }
  }
  const saveNotes = async (clientId, items) => {
    const val = JSON.stringify(items)
    await supabase.from('clients').update({note:val}).eq('id',clientId)
    setClients(clients.map(c=>c.id===clientId?{...c,note:val}:c))
  }
  const addNote = async (clientId, text) => {
    const cl = clients.find(x=>x.id===clientId)
    await saveNotes(clientId, [...parseNotes(cl), {id:Date.now(), text}])
  }
  const deleteNoteItem = async (clientId, noteId) => {
    const cl = clients.find(x=>x.id===clientId)
    await saveNotes(clientId, parseNotes(cl).filter(n=>n.id!==noteId))
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

  const updateRange = async (client) => {
    if (!client.schedule_days?.length) { alert('Оберіть дні тренувань'); return }
    const fromEl = document.getElementById(`fill-from-${client.id}`)
    const toEl = document.getElementById(`fill-to-${client.id}`)
    if (!fromEl||!toEl) return
    const from = new Date(fromEl.value+'T12:00:00')
    const to = new Date(toEl.value+'T12:00:00')
    if (from>to) { alert('Дата "З" має бути раніше ніж "До"'); return }
    const fromStr = dateToStr(from)
    const toStr = dateToStr(to)
    // Видаляємо майбутні невиконані сесії в діапазоні
    const toDelete = sessions.filter(s =>
      s.client_id===client.id && s.date>=fromStr && s.date<=toStr && !s.done
    )
    if (toDelete.length) {
      await supabase.from('sessions').delete().in('id', toDelete.map(s=>s.id))
      setSessions(prev => prev.filter(s => !toDelete.find(d=>d.id===s.id)))
    }
    // Створюємо нові за поточним розкладом
    const inserts = []
    const cur = new Date(from)
    while (cur<=to) {
      const dow = getMondayFirst(cur)
      if (client.schedule_days.includes(dow)) {
        const ds = dateToStr(cur)
        const time = (client.schedule_times||{})[dow] || '10:00'
        inserts.push({client_id:client.id, time, type:'Тренування', date:ds, done:false})
      }
      cur.setDate(cur.getDate()+1)
    }
    if (!inserts.length) { alert('Немає сесій для створення'); return }
    const {data,error} = await supabase.from('sessions').insert(inserts).select()
    if (!error&&data) {
      setSessions(prev=>[...prev,...data])
      alert(`✅ Оновлено! Видалено: ${toDelete.length}, створено: ${data.length} сесій`)
    }
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

  const DTABS = [{id:'profile',label:'Профіль'},{id:'metrics',label:'Показники'},{id:'schedule',label:'Графік'},{id:'records',label:'Рекорди'},{id:'clip',label:'Кліп-карта'},{id:'programs',label:'Програма'},{id:'history',label:'Історія'}]
  const inp = {width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Пошук клієнта…" style={{...inp,flex:1}}/>
        <button onClick={()=>setShowAdd(true)} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#5EE0CE,#3FA9F0)',color:'#111',fontWeight:700,fontSize:14,cursor:'pointer',animation:'pulseGlow 2.4s ease-in-out infinite'}}>＋</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:12}}>
        {filtered.length===0 && <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'48px 24px',gap:12,gridColumn:'1/-1',textAlign:'center'}}><span style={{fontSize:56}}>👥</span><div style={{fontSize:16,fontWeight:700,color:'#E8EAF0'}}>Клієнтів ще немає</div><div style={{fontSize:13,color:'#4A90B8'}}>Додайте першого клієнта щоб почати роботу</div></div>}
        {filtered.map(c=>{
          const isOpen = openId===c.id
          const progress = c.clip_total?Math.round((c.clip_used/c.clip_total)*100):0
          const activeTab = getTab(c.id)
          const cSessions = sessions.filter(s=>s.client_id===c.id)
          const cRecords = records.filter(r=>r.client_id===c.id)
          return (
            <div key={c.id} style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:`1px solid ${isOpen?'rgba(94,224,206,.4)':'rgba(255,255,255,.08)'}`,borderRadius:14,overflow:'hidden',alignSelf:'start',animation:'fadeUp .35s ease-out both'}}>
              <div onClick={()=>setOpenId(isOpen?null:c.id)} style={{display:'flex',alignItems:'center',gap:12,padding:14,cursor:'pointer'}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:18,color:'#111',flexShrink:0}}>{c.ava}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600}}>{c.name}</div>
                  <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>{c.goal}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button onClick={e=>{e.stopPropagation();setEc({name:c.name,goal:c.goal,w:c.weight,h:c.height,started:c.started_at||'',phone:c.phone||'',telegram:c.telegram||''});setEditClient(c)}}
                      style={{background:'none',border:`1px solid rgba(255,255,255,.1)`,borderRadius:7,color:'#4A90B8',fontSize:12,padding:'3px 7px',cursor:'pointer'}}>✏️</button>
                    <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,background:'rgba(94,224,206,.12)',color:'#5EE0CE'}}>{c.clip_used}/{c.clip_total}</span>
                  </div>
                  <span style={{color:'#4A90B8',fontSize:14,transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 14px 14px'}}>
                <div style={{flex:1,height:4,background:'rgba(255,255,255,.07)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:2,width: barsIn ? `${progress}%` : '0%',background: progress>=100 ? 'linear-gradient(90deg,#46DCA8,#36C497)' : 'linear-gradient(135deg,#5EE0CE,#3FA9F0)',boxShadow: progress>=100?'0 0 6px rgba(70,220,168,.4)':'0 0 6px rgba(94,224,206,.35)',transition:'width .8s cubic-bezier(.22,.68,0,1.1)'}}/>
                </div>
                <span style={{fontSize:12,fontWeight:600,color: progress>=100?'#46DCA8':'#5EE0CE',minWidth:30,textAlign:'right'}}>{progress}%</span>
              </div>
              {isOpen && (
                <div style={{borderTop:'1px solid #162038',padding:14}}>
                  <div style={{display:'flex',gap:6,marginBottom:14,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
                    <style>{`.tabs-scroll::-webkit-scrollbar{display:none}`}</style>
                    {DTABS.map(t=>(
                      <button key={t.id} onClick={()=>setTab(c.id,t.id)} style={{flexShrink:0,padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${activeTab===t.id?'#00F5FF':'#1E2A3A'}`,background:activeTab===t.id?'rgba(0,245,255,.1)':'none',color:activeTab===t.id?'#00F5FF':'#4A5A6A',whiteSpace:'nowrap'}}>{t.label}</button>
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
                          <textarea defaultValue={(c.strengths||[]).join('\n')} onFocus={e=>{e.target.style.minHeight='70px'}} onBlur={e=>{updateStrengths(c.id,e.target.value);if(!e.target.value.trim())e.target.style.minHeight='0'}} placeholder="По одному на рядок&#10;Натисни щоб додати" style={{width:'100%',background:'#08080F',border:'1px dashed #1A2E4A',borderRadius:8,padding:(c.strengths||[]).length>0?'8px':'0',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,resize:'none',outline:'none',lineHeight:1.5,minHeight:(c.strengths||[]).length>0?70:40,transition:'min-height .2s',cursor:'text'}}/>
                        </div>
                        <div style={{background:'#0D0D16',borderRadius:10,padding:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#FF4466',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>⚠️ Слабкі</div>
                          <textarea defaultValue={(c.weaknesses||[]).join('\n')} onFocus={e=>{e.target.style.minHeight='70px'}} onBlur={e=>{updateWeaknesses(c.id,e.target.value);if(!e.target.value.trim())e.target.style.minHeight='0'}} placeholder="По одному на рядок&#10;Натисни щоб додати" style={{width:'100%',background:'#08080F',border:'1px dashed #1A2E4A',borderRadius:8,padding:(c.weaknesses||[]).length>0?'8px':'0',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,resize:'none',outline:'none',lineHeight:1.5,minHeight:(c.weaknesses||[]).length>0?70:40,transition:'min-height .2s',cursor:'text'}}/>
                        </div>
                      </div>
                      <div style={{marginTop:12,borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <span style={{fontSize:10,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,fontWeight:600}}>Нотатки</span>
                          {parseNotes(c).length>0&&<span style={{fontSize:10,color:'#4A5568'}}>{parseNotes(c).length}</span>}
                        </div>
                        {parseNotes(c).map(n=>(
                          <NoteRow key={n.id} note={n} onDelete={noteId=>deleteNoteItem(c.id,noteId)}/>
                        ))}
                        <AddNoteRow
                          open={!!noteOpen[c.id]}
                          text={noteInput[c.id]||''}
                          onOpen={()=>setNoteOpen(p=>({...p,[c.id]:true}))}
                          onClose={()=>setNoteOpen(p=>({...p,[c.id]:false}))}
                          onTextChange={t=>setNoteInput(p=>({...p,[c.id]:t}))}
                          onSave={()=>{
                            const t=(noteInput[c.id]||'').trim()
                            if(t){addNote(c.id,t);setNoteInput(p=>({...p,[c.id]:''}));setNoteOpen(p=>({...p,[c.id]:false}))}
                          }}
                        />
                      </div>
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
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px',gap:8,textAlign:'center'}}><span style={{fontSize:36}}>📊</span><div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>Метрик ще немає</div><div style={{fontSize:11,color:'#4A90B8'}}>Додайте метрику щоб відстежувати показники</div></div>
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
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={()=>fillRange(c)} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>⚡ Заповнити</button>
                          <button onClick={()=>updateRange(c)} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'rgba(255,68,102,.15)',color:'#FF4466',border:'1px solid rgba(255,68,102,.3)',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>🔄 Оновити</button>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab==='records' && (
                    <div>
                      {cRecords.length===0 && <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px',gap:8,textAlign:'center'}}><span style={{fontSize:36}}>🏆</span><div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>Рекордів ще немає</div><div style={{fontSize:11,color:'#4A90B8'}}>Додайте перший рекорд клієнта</div></div>}
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
                    <ClipTab clientId={c.id} clients={clients} setClients={setClients} sessions={sessions} pricePlans={pricePlans} setFinance={setFinance}/>
                  )}
                  {activeTab==='programs' && (
                    <ProgramsTab clientId={c.id} programs={programs} setPrograms={setPrograms}/>
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
                      {cSessions.filter(s=>s.done).length===0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px',gap:8,textAlign:'center'}}><span style={{fontSize:36}}>📋</span><div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>Історії ще немає</div><div style={{fontSize:11,color:'#4A90B8'}}>Виконані тренування з'являться тут</div></div>}
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
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16,maxHeight:300,overflowY:'auto',paddingRight:4}}>
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
                        <span style={{color:'#E8EAF0',fontWeight:600,fontSize:14}}>{m.value} <span style={{color:'#4A90B8',fontSize:11,fontWeight:400}}>{metric.unit}</span></span>
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

export default ClientsTab
