import { useState, useEffect } from 'react'
import { DurationPicker } from './DurationPicker'
import { MONTHS_UK2 } from '../constants'

export default function EditSessionModal({ session, clients, onClose, onSave, onDelete }) {
  const [time, setTime] = useState(session?.time || '')
  const [type, setType] = useState(session?.type || '')
  const [duration, setDuration] = useState(session?.duration || 60)
  const [clientId, setClientId] = useState(session?.client_id || '')

  if (!session) return null

  const sessionDate = new Date(session.date)
  const dateStr = `${sessionDate.getDate()} ${MONTHS_UK2[sessionDate.getMonth()]}`

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,padding:0}} onClick={onClose}>
      <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'85vh',padding:'20px 24px',boxSizing:'border-box',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Редагувати сесію — {dateStr}</div>
        
        <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Клієнт</label>
        <select value={clientId} onChange={e=>setClientId(e.target.value)} style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,marginBottom:12,outline:'none'}}>
          <option value="">— Оберіть —</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Час</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тип</label>
            <input value={type} onChange={e=>setType(e.target.value)} placeholder="Силові…" style={{width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none'}}/>
          </div>
        </div>

        <label style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Тривалість</label>
        <DurationPicker value={duration} onChange={setDuration}/>
        <div style={{marginBottom:16}}/>

        <div style={{display:'flex',gap:10}}>
          <button onClick={() => { onDelete(session.id); onClose() }} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #FF6B6B',background:'rgba(255,107,107,.1)',color:'#FF6B6B',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>🗑️ Видалити</button>
          <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'#0D0D16',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>Скасувати</button>
          <button onClick={() => { onSave({...session, time, type, duration, client_id: clientId}); onClose() }} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>✓ Готово</button>
        </div>
      </div>
    </div>
  )
}
