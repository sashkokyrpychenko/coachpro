import { useState } from 'react'
import { supabase } from '../supabase'
import { todayStr, MONTHS_UK2 } from '../constants'

function ClipTab({ clientId, clients, setClients, sessions, pricePlans, setFinance }) {
  const [showAllPlans, setShowAllPlans] = useState(false)
  const [editDateIdx, setEditDateIdx] = useState(null)
  const [editDateVal, setEditDateVal] = useState('')
  const [localClipUsed, setLocalClipUsed] = useState(null)
  const [localClipDates, setLocalClipDates] = useState(null)

  // Завжди свіжий клієнт зі стейту
  const baseC = clients.find(x => x.id === clientId)
  if (!baseC) return null
  // Якщо є локальні дані — використовуємо їх для миттєвого UI
  const c = {
    ...baseC,
    clip_used: localClipUsed !== null ? localClipUsed : baseC.clip_used,
    clip_dates: localClipDates !== null ? localClipDates : baseC.clip_dates,
  }

  const activePlan = pricePlans.find(p => p.id === c.active_plan_id)
  const clipDates = Array.isArray(c.clip_dates) ? [...c.clip_dates].sort() : []
  const isExhausted = c.clip_used >= c.clip_total
  const progress = c.clip_total ? Math.round((c.clip_used/c.clip_total)*100) : 0

  const addFinanceRecord = async (planName, amount) => {
    const lastName = c.name ? c.name.split(' ')[1] || c.name.split(' ')[0] : c.name
    const finName = `${lastName} - ${planName} - ${Number(amount).toLocaleString('uk')} грн`
    const {data} = await supabase.from('finance').insert({name:finName, amount:Number(amount), type:'in', date:todayStr()}).select().single()
    if (data && setFinance) setFinance(prev => [data, ...prev])
  }

  const useClip = async () => {
    if (c.clip_used >= c.clip_total) return
    const newUsed = c.clip_used + 1
    const newDates = [...(c.clip_dates||[]), todayStr()]
    // Миттєво оновлюємо локальний стейт
    setLocalClipUsed(newUsed)
    setLocalClipDates(newDates)
    // Зберігаємо в Supabase і оновлюємо глобальний стейт
    await supabase.from('clients').update({clip_used:newUsed, clip_dates:newDates}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x,clip_used:newUsed,clip_dates:newDates} : x))
    // Скидаємо локальний стейт — тепер глобальний актуальний
    setLocalClipUsed(null)
    setLocalClipDates(null)
  }

  const renewClip = async () => {
    const renewDate = todayStr()
    const debt = Math.max(0, (c.clip_used || 0) - (c.clip_total || 0))
    await supabase.from('clients').update({clip_used:debt, clip_renewed_at:renewDate, clip_dates:[]}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x, clip_used:debt, clip_renewed_at:renewDate, clip_dates:[]} : x))
    if (activePlan) {
      await addFinanceRecord(activePlan.name, activePlan.price)
    }
  }

  const selectPlan = async (p) => {
    const renewDate = todayStr()
    const debt = Math.max(0, (c.clip_used || 0) - (c.clip_total || 0))
    await supabase.from('clients').update({active_plan_id:p.id, clip_total:p.sessions, clip_used:debt, clip_renewed_at:renewDate, clip_dates:[]}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x, active_plan_id:p.id, clip_total:p.sessions, clip_used:debt, clip_renewed_at:renewDate, clip_dates:[]} : x))
    setShowAllPlans(false)
    await addFinanceRecord(p.name, p.price)
  }

  const openEditDate = (i) => {
    setEditDateIdx(i)
    setEditDateVal(clipDates[i] || todayStr())
  }

  const saveEditDate = async () => {
    const newDates = [...clipDates]
    newDates[editDateIdx] = editDateVal
    await supabase.from('clients').update({clip_dates:newDates}).eq('id',c.id)
    setClients(prev => prev.map(x => x.id===c.id ? {...x,clip_dates:newDates} : x))
    setEditDateIdx(null)
  }

  return (
    <div style={{background:'#0D0D16',borderRadius:12,padding:14}}>

      {/* Модал редагування дати */}
      {editDateIdx !== null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}} onClick={()=>setEditDateIdx(null)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:16,padding:24,width:280}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:'Oswald',fontSize:20,marginBottom:16,color:'#E8EAF0'}}>Змінити дату #{editDateIdx+1}</div>
            <input type="date" value={editDateVal} onChange={e=>setEditDateVal(e.target.value)}
              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:14,marginBottom:16,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditDateIdx(null)}
                style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
                Скасувати
              </button>
              <button onClick={saveEditDate}
                style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active plan or full list */}
      {!showAllPlans ? (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Поточний тариф</div>
          {activePlan ? (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#111118',border:'1.5px solid rgba(0,245,255,.3)',borderRadius:10,padding:'11px 14px',marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#E8EAF0'}}>{activePlan.name}</div>
                  <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{activePlan.sessions} тренувань</div>
                </div>
                <div style={{fontFamily:'Oswald',fontSize:18,color:'#00F5FF'}}>{Number(activePlan.price).toLocaleString('uk')} ₴</div>
              </div>
              <button onClick={()=>setShowAllPlans(true)}
                style={{width:'100%',padding:'8px',borderRadius:8,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:12,cursor:'pointer'}}>
                🔄 Змінити тариф
              </button>
            </>
          ) : (
            <button onClick={()=>setShowAllPlans(true)}
              style={{width:'100%',padding:'10px',borderRadius:8,border:'1px dashed #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
              + Обрати тариф
            </button>
          )}
        </div>
      ) : (
        <div style={{marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:14,fontWeight:700}}>{activePlan?'Змінити тариф':'Обрати тариф'}</div>
            {activePlan && <button onClick={()=>setShowAllPlans(false)} style={{background:'none',border:'none',color:'#4A90B8',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:360,overflowY:'auto',paddingRight:4}}>
            {pricePlans.map(p=>(
              <div key={p.id} onClick={()=>selectPlan(p)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:12,cursor:'pointer',
                  border:`1.5px solid ${c.active_plan_id===p.id?'#00F5FF':'#1E2A3A'}`,
                  background:c.active_plan_id===p.id?'rgba(0,245,255,.15)':'#111118'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{p.name}</div>
                  <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{p.sessions} тренувань</div>
                </div>
                <div style={{fontFamily:'Oswald',fontSize:16,color:'#00F5FF'}}>{Number(p.price).toLocaleString('uk')} ₴</div>
                {c.active_plan_id===p.id && <span style={{color:'#00F5FF',fontSize:16}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clip card */}
      {activePlan && !showAllPlans && (
        <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:14,fontWeight:700}}>Кліп-карта</div>
            <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,
              background: c.clip_used > c.clip_total ? 'rgba(255,68,102,.12)' : isExhausted ? 'rgba(220,38,38,.1)' : 'rgba(22,163,74,.12)',
              color: c.clip_used > c.clip_total ? '#FF4466' : isExhausted ? '#FF4466' : '#00FF88'}}>
              {c.clip_used > c.clip_total
                ? `Борг: ${c.clip_used - c.clip_total} зан.`
                : isExhausted ? 'Вичерпано' : `Залишилось: ${c.clip_total - c.clip_used}`}
            </span>
          </div>

          <div style={{height:5,background:'#08080F',borderRadius:3,marginBottom:12,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:3,width:`${Math.min(progress,100)}%`,background: c.clip_used > c.clip_total ? '#FF4466' : isExhausted ? '#FF4466' : '#00F5FF',transition:'width 0.3s'}}/>
          </div>

          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
            {Array.from({length: Math.max(c.clip_total, c.clip_used)},(_,i)=>{
              const isDone = i < c.clip_used
              const isDebt = i >= c.clip_total
              const dateStr = clipDates[i] || null
              return (
                <div key={i} onClick={()=>isDone && !isDebt && openEditDate(i)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,width:'calc(16.66% - 5px)',cursor:isDone&&!isDebt?'pointer':'default'}}>
                  <div style={{width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,
                    background: isDebt && isDone ? 'rgba(255,68,102,.15)' : isDone ? '#00F5FF' : i===c.clip_used ? 'rgba(71,212,255,.1)' : '#08080F',
                    border: isDebt && isDone ? '2px solid #FF4466' : isDone ? '2px solid #00F5FF' : i===c.clip_used ? '2px solid #47d4ff' : '2px solid #1A2E4A',
                    color: isDebt && isDone ? '#FF4466' : isDone ? '#111' : '#3A4A5A'}}>
                    {isDebt && isDone ? '−' : isDone ? '✓' : i+1}
                  </div>
                  <div style={{fontSize:10,color: isDebt&&isDone ? '#FF4466' : isDone ? '#00F5FF' : '#3A4A5A',textAlign:'center',opacity:isDone?1:0.4}}>
                    {isDone && dateStr ? dateStr.slice(5).replace('-','/') : isDebt&&isDone ? 'борг' : '—'}
                  </div>
                </div>
              )
            })}
          </div>

          {clipDates.length > 0 && (
            <div style={{borderTop:'1px solid #162038',paddingTop:12,marginBottom:12}}>
              <div style={{fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Відвідування</div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {[...clipDates].reverse().map((date,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'#111118',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:'#00F5FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#111',flexShrink:0}}>{clipDates.length-i}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#E8EAF0'}}>{date.slice(8,10)}/{date.slice(5,7)}/{date.slice(0,4)}</div>
                    </div>
                    <span style={{color:'#00FF88',fontSize:11}}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:8}}>
            <button onClick={useClip} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Відмітити</button>
            <button onClick={renewClip} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:12,fontWeight:600,cursor:'pointer'}}>Поновити</button>
          </div>
        </>
      )}
    </div>
  )
}

export default ClipTab
