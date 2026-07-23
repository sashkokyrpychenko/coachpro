import { useState } from 'react'
import DurationPicker from './DurationPicker'
import Modal from './Modal'
import { MONTHS_UK2 } from '../constants'

export default function EditSessionModal({ session, clients, onClose, onSave, onDelete }) {
  const [date, setDate] = useState(session?.date || '')
  const [time, setTime] = useState(session?.time || '')
  const [type, setType] = useState(session?.type || '')
  const [duration, setDuration] = useState(session?.duration || 60)
  const [clientId, setClientId] = useState(session?.client_id || '')

  if (!session) return null

  const sessionDate = new Date(date || session.date)
  const dateStr = `${sessionDate.getDate()} ${MONTHS_UK2[sessionDate.getMonth()]}`

  const labelStyle = {fontSize:11,color:'#878F9B',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}
  const inputStyle = {
    width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
    borderRadius:10, padding:'10px 12px', color:'#EAECEF', fontFamily:'DM Sans', fontSize:14,
    outline:'none', boxSizing:'border-box', minWidth:0, display:'block',
    appearance:'none', WebkitAppearance:'none',
  }

  return (
    <Modal open={!!session} onClose={onClose} zIndex={200}>
      <div style={{fontFamily:'DM Sans',fontWeight:700,fontSize:20,color:'#EAECEF',marginBottom:18}}>
        Редагувати сесію — {dateStr}
      </div>

      <label style={labelStyle}>Клієнт</label>
      <select value={clientId} onChange={e=>setClientId(e.target.value)}
        style={{...inputStyle,marginBottom:12,textAlign:'left',textAlignLast:'left'}}>
        <option value="">— Оберіть —</option>
        {clients.filter(c=>!c.archived).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <label style={labelStyle}>Дата</label>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)}
        style={{...inputStyle,marginBottom:12,colorScheme:'dark'}}/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <div style={{minWidth:0,overflow:'hidden'}}>
          <label style={labelStyle}>Час</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)}
            style={{...inputStyle,colorScheme:'dark'}}/>
        </div>
        <div style={{minWidth:0,overflow:'hidden'}}>
          <label style={labelStyle}>Тип</label>
          <input value={type} onChange={e=>setType(e.target.value)} placeholder="Силові…" style={inputStyle}/>
        </div>
      </div>

      <label style={labelStyle}>Тривалість</label>
      <DurationPicker value={duration} onChange={setDuration}/>
      <div style={{marginBottom:18}}/>

      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>{onDelete(session.id);onClose()}}
          style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,107,107,.3)',background:'rgba(255,107,107,.1)',color:'#FF6B6B',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          Видалити
        </button>
        <button onClick={onClose}
          style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',color:'#EAECEF',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          Скасувати
        </button>
        <button onClick={()=>{onSave({...session,date,time,type,duration,client_id:clientId});onClose()}}
          style={{flex:1,padding:'12px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#5EE0CE,#3FA9F0)',color:'#0A0B0F',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}>
          Готово
        </button>
      </div>
    </Modal>
  )
}
