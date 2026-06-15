import { useState, useEffect, useRef } from 'react'
import DurationPicker from './DurationPicker'

export default function EditSessionModal({ session, clients, onClose, onSave, onDelete }) {
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
      container.scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
    }
  }, [])

  const inp = {width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}} onClick={onClose}>
      <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px max(36px, calc(20px + env(safe-area-inset-bottom)))'}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
        <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:18}}>Редагувати сесію</div>

        <label style={lbl}>Клієнт</label>
        <div ref={scrollRef} style={{display:'flex',gap:6,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
          {clients.map(c => (
            <div key={c.id} ref={c.id === clientId ? selectedRef : null} onClick={() => setClientId(c.id)}
              style={{flexShrink:0, padding:'8px 12px', borderRadius:10, border:`2px solid ${clientId===c.id ? c.color : '#1E2A3A'}`, background: clientId===c.id ? c.color+'18' : '#0D0D16', display:'flex', alignItems:'center', gap:7, cursor:'pointer'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:12,color:'#111'}}>{c.ava}</div>
              <span style={{fontSize:12,fontWeight:600,color:clientId===c.id?'#E8EAF0':'#4A5A6A',whiteSpace:'nowrap'}}>{c.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

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

        <button onClick={() => onSave({...session, client_id:clientId, date, time, type, duration})}
          style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:8}}>
          Зберегти зміни
        </button>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            style={{width:'100%',padding:11,borderRadius:12,border:'1px solid rgba(255,79,79,.3)',background:'transparent',color:'#FF4466',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            🗑 Видалити сесію
          </button>
        ) : (
          <div style={{background:'rgba(255,79,79,.08)',border:'1px solid rgba(255,79,79,.25)',borderRadius:12,padding:14}}>
            <div style={{color:'#E8EAF0',fontSize:13,textAlign:'center',marginBottom:12}}>Видалити цю сесію?</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setConfirmDelete(false)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>Скасувати</button>
              <button onClick={() => onDelete(session.id)} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#FF4466',color:'#fff',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>Видалити</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
