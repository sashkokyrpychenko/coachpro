import { useState } from 'react'
import DurationPicker from './DurationPicker'
import { MONTHS_UK2 } from '../constants'

export default function EditSessionModal({ session, clients, onClose, onSave, onDelete }) {
  const [time, setTime] = useState(session?.time || '')
  const [type, setType] = useState(session?.type || '')
  const [duration, setDuration] = useState(session?.duration || 60)
  const [clientId, setClientId] = useState(session?.client_id || '')

  if (!session) return null

  const sessionDate = new Date(session.date)
  const dateStr = `${sessionDate.getDate()} ${MONTHS_UK2[sessionDate.getMonth()]}`

  const labelStyle = {fontSize:11,color:'#878F9B',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}
  const inputStyle = {width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:'10px 14px',color:'#EAECEF',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}

  return (
    <div
      style={{
        position:'fixed',
        top:0, left:0, right:0, bottom:0,
        height:'100vh',
        height:'100dvh', // dvh враховує реальну видиму область Safari (без панелі браузера)
        background:'rgba(0,0,0,.7)',
        backdropFilter:'blur(4px)',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        zIndex:200,
        padding:20,
        boxSizing:'border-box',
        overflowY:'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:'linear-gradient(160deg, rgba(255,255,255,.065), rgba(255,255,255,.022))',
          backdropFilter:'blur(14px)',
          border:'1px solid rgba(255,255,255,.08)',
          borderRadius:20,
          width:'100%',
          maxWidth:480,
          maxHeight:'min(85vh, 85dvh)',
          padding:'24px',
          boxSizing:'border-box',
          overflowY:'auto',
          margin:'auto' // додатковий страхувальний центрувач всередині flex-контейнера
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{fontFamily:'DM Sans',fontWeight:700,fontSize:20,color:'#EAECEF',marginBottom:18}}>
          Редагувати сесію — {dateStr}
        </div>

        <label style={labelStyle}>Клієнт</label>
        <select
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          style={{...inputStyle, marginBottom:12, appearance:'none'}}
        >
          <option value="">— Оберіть —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <div>
            <label style={labelStyle}>Час</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Тип</label>
            <input value={type} onChange={e => setType(e.target.value)} placeholder="Силові…" style={inputStyle}/>
          </div>
        </div>

        <label style={labelStyle}>Тривалість</label>
        <DurationPicker value={duration} onChange={setDuration}/>
        <div style={{marginBottom:18}}/>

        <div style={{display:'flex',gap:10}}>
          <button
            onClick={() => { onDelete(session.id); onClose() }}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,107,107,.3)',background:'rgba(255,107,107,.1)',color:'#FF6B6B',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}
          >
            Видалити
          </button>
          <button
            onClick={onClose}
            style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'#EAECEF',fontFamily:'DM Sans',fontSize:13,fontWeight:600,cursor:'pointer'}}
          >
            Скасувати
          </button>
          <button
            onClick={() => { onSave({...session, time, type, duration, client_id: clientId}); onClose() }}
            style={{flex:1,padding:'12px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#5EE0CE,#3FA9F0)',color:'#0A0B0F',fontFamily:'DM Sans',fontSize:13,fontWeight:700,cursor:'pointer'}}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
