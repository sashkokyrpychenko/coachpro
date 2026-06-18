import { useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { todayStr, dateToStr, getWeekDates, getMonthDates, MONTHS_UK, MONTHS_UK2, DAYS_SHORT, DAYS_FULL } from '../constants'
import SwipeSessionCard from './SwipeSessionCard'
import SplitCard from './SplitCard'
import DayTimeline from './DayTimeline'
import DurationPicker from './DurationPicker'
import PickClientModal from './PickClientModal'
import EditSessionModal from './EditSessionModal'

export default function ScheduleTab({ clients, sessions, setSessions, setClients, onClientClick }) {
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

  const groupedSessions = () => {
    const map = {}
    daySessions.forEach(s => {
      if (!map[s.time]) map[s.time] = []
      map[s.time].push(s)
    })
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]))
  }

  const toggleDone = useCallback(async (id, done) => {
    const session = sessions.find(s => s.id === id)
    if (!session) return
    const partners = sessions.filter(s => s.date === session.date && s.time === session.time && s.id !== id)
    const allIds = [id, ...partners.map(s => s.id)]
    await supabase.from('sessions').update({done:!done}).in('id', allIds)
    setSessions(prev => prev.map(s => allIds.includes(s.id) ? {...s, done:!done} : s))

    const updateClip = async (clientId) => {
      const { data: freshClient } = await supabase.from('clients').select('*').eq('id', clientId).single()
      if (!freshClient) return
      if (!done) {
        const newUsed = (freshClient.clip_used || 0) + 1
        const newDates = [...(freshClient.clip_dates || []), session.date]
        await supabase.from('clients').update({clip_used:newUsed, clip_dates:newDates}).eq('id', clientId)
        setClients(prev => prev.map(c => c.id===clientId ? {...c, clip_used:newUsed, clip_dates:newDates} : c))
      } else {
        const newUsed = Math.max(0, (freshClient.clip_used || 0) - 1)
        const dates = [...(freshClient.clip_dates || [])]
        dates.splice(dates.lastIndexOf(session.date), 1)
        const newDates = dates.filter(d => d !== undefined)
        await supabase.from('clients').update({clip_used:newUsed, clip_dates:newDates}).eq('id', clientId)
        setClients(prev => prev.map(c => c.id===clientId ? {...c, clip_used:newUsed, clip_dates:newDates} : c))
      }
    }

    await updateClip(session.client_id)
    if (partners.length > 0) await updateClip(partners[0].client_id)
  }, [sessions, setClients, setSessions])

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
      client_id: updated.client_id, date: updated.date, time: updated.time, type: updated.type, duration: updated.duration,
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

  const card = {background:'linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,.02))',border:'1px solid rgba(255,255,255,.08)',borderRadius:18,padding:16,marginBottom:14,backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',boxShadow:'0 1px 0 rgba(255,255,255,.05) inset, 0 10px 26px rgba(0,0,0,.28)'}

  return (
    <div>
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:'Oswald',fontSize:20,letterSpacing:0.3,whiteSpace:'nowrap',marginBottom:10}}>
          {viewMode==='week'
            ? (weekDates[0].getMonth()===weekDates[6].getMonth()
                ? `${weekDates[0].getDate()}–${weekDates[6].getDate()} ${MONTHS_UK2[weekDates[6].getMonth()]}`
                : `${weekDates[0].getDate()} ${MONTHS_UK2[weekDates[0].getMonth()]} – ${weekDates[6].getDate()} ${MONTHS_UK2[weekDates[6].getMonth()]}`)
            : `${MONTHS_UK[refDate.getMonth()]} ${refDate.getFullYear()}`}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={prevPeriod} style={{padding:'7px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'#EAECEF',cursor:'pointer',fontSize:14}}>‹</button>
          <button onClick={nextPeriod} style={{padding:'7px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'#EAECEF',cursor:'pointer',fontSize:14}}>›</button>
          <button onClick={goToday} style={{padding:'6px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'#878F9B',cursor:'pointer',fontSize:12,fontWeight:600}}>Сьогодні</button>
          <div style={{flex:1}}/>
          <div style={{display:'flex',borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,.08)'}}>
            <button onClick={()=>setViewMode('week')} style={{padding:'6px 16px',border:'none',background:viewMode==='week'?'linear-gradient(135deg,#5EE0CE,#3FA9F0)':'rgba(255,255,255,.04)',color:viewMode==='week'?'#06181b':'#878F9B',cursor:'pointer',fontSize:12,fontWeight:600}}>Тиждень</button>
            <button onClick={()=>setViewMode('month')} style={{padding:'6px 16px',border:'none',background:viewMode==='month'?'linear-gradient(135deg,#5EE0CE,#3FA9F0)':'rgba(255,255,255,.04)',color:viewMode==='month'?'#06181b':'#878F9B',cursor:'pointer',fontSize:12,fontWeight:600}}>Місяць</button>
          </div>
        </div>
      </div>

      {viewMode==='week' && (
        <div style={card}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:12}}>
            {weekDates.map((d,i)=>{
              const ds = dateToStr(d)
              const has = sessions.some(s=>s.date===ds)
              const isSel = ds===selDs
              return (
                <div key={i} onClick={()=>setSelDs(ds)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 2px',borderRadius:12,cursor:'pointer',border:`1px solid ${isSel?'transparent':'rgba(255,255,255,.06)'}`,background:isSel?'linear-gradient(135deg,#5EE0CE,#3FA9F0)':'rgba(255,255,255,.03)',boxShadow:isSel?'0 6px 18px rgba(79,200,220,.35)':'none',transition:'all .18s'}}>
                  <span style={{fontSize:10,fontWeight:600,color:isSel?'#0a3640':'#878F9B'}}>{DAYS_SHORT[i]}</span>
                  <span style={{fontSize:19,fontWeight:700,lineHeight:1,fontFamily:'"DM Sans",sans-serif',display:'block',textAlign:'center',color:isSel?'#04161a':'#EAECEF'}}>{d.getDate()}</span>
                  {has && !isSel && <span style={{width:5,height:5,borderRadius:'50%',background:'#46DCA8',boxShadow:'0 0 6px rgba(70,220,168,.6)',display:'block',marginTop:1}}/>}
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontFamily:'Oswald',fontSize:16,color:'#EAECEF',fontWeight:500}}>{DAYS_FULL[selDate.getDay()]}, {selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</span>
            <small style={{color:'#878F9B',fontSize:12}}>{daySessions.length} сесій</small>
          </div>
          {daySessions.length===0 && <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 0',gap:8}}><span style={{fontSize:36}}>🗓️</span><div style={{fontSize:14,fontWeight:600,color:'#EAECEF'}}>Тренувань немає</div><div style={{fontSize:12,color:'#878F9B'}}>На цей день нічого не заплановано</div></div>}
          {/* key={selDs} → перемонтовує список при зміні дня → стартує stagger-анімацію */}
          <div key={selDs}>
            {groupedSessions().map(([time, group], idx) =>
              group.length > 1
                ? <SplitCard key={time} index={idx} sessions={group} clients={clients} onEdit={handleEdit} onToggle={toggleDone}/>
                : <SwipeSessionCard key={group[0].id} index={idx} s={group[0]} clients={clients} onEdit={s => handleEdit([s])} onToggle={toggleDone}/>
            )}
          </div>
          <div onClick={()=>{setFClient(clients[0]?.id||'');setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:14,border:'1px dashed rgba(255,255,255,.12)',cursor:'pointer',color:'#878F9B',fontSize:13,marginTop:4}}>＋ Додати сесію</div>
          <DayTimeline sessions={daySessions} clients={clients} onClientClick={onClientClick}/>
        </div>
      )}

      {viewMode==='month' && (
        <div style={card}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
            {DAYS_SHORT.map(d=><div key={d} style={{textAlign:'center',fontSize:11,color:'#878F9B',fontWeight:600,padding:'4px 0'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:12}}>
            {monthDates.map(({date,current},i)=>{
              const ds = dateToStr(date)
              const count = sessions.filter(s=>s.date===ds).length
              const isToday = ds===todayStr()
              const isSel = ds===selDs
              return (
                <div key={i} onClick={()=>setSelDs(ds)} style={{minHeight:40,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'6px 4px',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:isSel||isToday?700:400,background:isSel?'linear-gradient(135deg,#5EE0CE,#3FA9F0)':isToday?'rgba(94,224,206,.12)':'none',color:isSel?'#04161a':current?'#EAECEF':'#3A4250',border:isSel?'1px solid transparent':isToday?'1px solid rgba(94,224,206,.3)':'1px solid transparent',boxShadow:isSel?'0 4px 14px rgba(79,200,220,.3)':'none',transition:'all .15s',gap:2}}>
                  <span>{date.getDate()}</span>
                  {count>0 && <span style={{width:5,height:5,borderRadius:'50%',background:isSel?'#04161a':'#5EE0CE',display:'block'}}/>}
                </div>
              )
            })}
          </div>
          <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontFamily:'Oswald',fontSize:16,color:'#EAECEF',fontWeight:500}}>{selDate.getDate()} {MONTHS_UK2[selDate.getMonth()]}</span>
              <small style={{color:'#878F9B',fontSize:12}}>{daySessions.length} сесій</small>
            </div>
            {daySessions.length===0 && <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 0',gap:8}}><span style={{fontSize:36}}>🗓️</span><div style={{fontSize:14,fontWeight:600,color:'#EAECEF'}}>Тренувань немає</div><div style={{fontSize:12,color:'#878F9B'}}>На цей день нічого не заплановано</div></div>}
            <div key={selDs}>
              {groupedSessions().map(([time, group], idx) =>
                group.length > 1
                  ? <SplitCard key={time} index={idx} sessions={group} clients={clients} onEdit={handleEdit} onToggle={toggleDone}/>
                  : <SwipeSessionCard key={group[0].id} index={idx} s={group[0]} clients={clients} onEdit={s => handleEdit([s])} onToggle={toggleDone}/>
              )}
            </div>
            <div onClick={()=>{setFClient(clients[0]?.id||'');setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:12,border:'1px dashed rgba(255,255,255,.12)',cursor:'pointer',color:'#878F9B',fontSize:12,marginTop:4}}>＋ Додати сесію</div>
            <DayTimeline sessions={daySessions} clients={clients} onClientClick={onClientClick}/>
          </div>
        </div>
      )}

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
        <PickClientModal sessions={pickList} clients={clients} onPick={s => { setPickList(null); setEditSession(s) }} onClose={() => setPickList(null)}/>
      )}

      {editSession && (
        <EditSessionModal session={editSession} clients={clients} onClose={() => setEditSession(null)} onSave={saveEdit} onDelete={deleteSession}/>
      )}
    </div>
  )
}
