import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { todayStr, dateToStr, getMondayFirst, MONTHS_UK, MONTHS_UK2, DAYS_SHORT } from '../constants'

const GRD = 'linear-gradient(135deg,#5EE0CE,#3FA9F0)'

// ── Анімований лічильник (рахує від 0 до target) ──
function useCountUp(target, dur = 1100) {
  const [val, setVal] = useState(0)
  const raf = useRef()
  useEffect(() => {
    let start
    const tick = (now) => {
      if (!start) start = now
      const p = Math.min((now - start) / dur, 1)
      const e = 1 - Math.pow(2, -10 * p)   // easeOut
      setVal(Math.round(e * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, dur])
  return val
}

function CountUp({ value, dur }) {
  const v = useCountUp(value, dur)
  return <>{v.toLocaleString('uk')}</>
}

function StatsTab({ sessions, clients, finance, pricePlans, setPricePlans }) {
  const today = todayStr()
  const now = new Date()
  const weekStartDate = new Date(now)
  weekStartDate.setDate(now.getDate() - getMondayFirst(now))
  const weekStartStr = dateToStr(weekStartDate)
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const todayCount = sessions.filter(s => s.date === today).length
  const weekCount  = sessions.filter(s => s.date >= weekStartStr && s.date <= today).length
  const monthCount = sessions.filter(s => s.date >= monthStartStr && s.date <= today).length
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(now); d.setDate(now.getDate()-6+i); return {ds:dateToStr(d),lbl:d.getDate(),day:DAYS_SHORT[getMondayFirst(d)]} })
  const counts = days.map(d=>sessions.filter(s=>s.date===d.ds).length)
  const max = Math.max(...counts,1)
  const income = finance.filter(f=>f.type==='in').reduce((a,f)=>a+Number(f.amount),0)

  const [showAddPlan, setShowAddPlan] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [np, setNp] = useState({name:'',sessions:1,price:''})
  const [barsIn, setBarsIn] = useState(false)

  // тригер анімації росту стовпчиків при монтуванні
  useEffect(() => { const t = setTimeout(()=>setBarsIn(true), 60); return ()=>clearTimeout(t) }, [])

  const savePlan = async () => {
    if (!np.name || !np.price) return
    if (editPlan) {
      const {data,error} = await supabase.from('price_plans').update({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).eq('id',editPlan.id).select().single()
      if (!error) setPricePlans(prev => prev.map(p => p.id===editPlan.id ? data : p).sort((a,b)=>a.name.localeCompare(b.name,'uk')))
      setEditPlan(null)
    } else {
      const {data,error} = await supabase.from('price_plans').insert({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).select().single()
      if (!error) setPricePlans(prev => [...prev,data].sort((a,b)=>a.name.localeCompare(b.name,'uk')))
    }
    setShowAddPlan(false); setNp({name:'',sessions:1,price:''})
  }

  const deletePlan = async (id) => {
    await supabase.from('price_plans').delete().eq('id',id)
    setPricePlans(prev => prev.filter(p => p.id!==id))
  }

  const glass = {background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)'}
  const inp = {width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  const statCards = [['Сьогодні',todayCount,'#5EE0CE'],['Тиждень',weekCount,'#7FD4E8'],['Місяць',monthCount,'#46DCA8']]

  return (
    <div>
      {/* Stats cards — анімований лічильник */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {statCards.map(([l,v,cl])=>(
          <div key={l} style={{...glass,borderRadius:14,padding:16,textAlign:'center'}}>
            <div style={{fontFamily:'Oswald',fontSize:42,color:cl,lineHeight:1}}><CountUp value={v}/></div>
            <div style={{fontSize:12,color:'#4A90B8',marginTop:6}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
        {/* Activity chart — стовпчики з glow + ростом */}
        <div style={{...glass,borderRadius:14,padding:16}}>
          <div style={{fontFamily:'Oswald',fontSize:18,marginBottom:14,color:'#E8EAF0'}}>Активність — 7 днів</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,marginBottom:8}}>
            {counts.map((c,i)=>{
              const isToday = days[i].ds===today
              const targetH = Math.max(4,(c/max)*90)
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:4}}>
                  <span style={{fontSize:10,color:c>0?'#5EE0CE':'#3A4A5A',fontWeight:600}}>{c>0?c:''}</span>
                  <div style={{
                    width:'100%',borderRadius:'4px 4px 2px 2px',minHeight:4,
                    height: barsIn ? `${targetH}px` : '4px',
                    background: isToday ? GRD : 'linear-gradient(180deg,rgba(94,224,206,.4),rgba(63,169,240,.18))',
                    border: isToday ? 'none' : '1px solid rgba(255,255,255,.06)',
                    boxShadow: isToday ? '0 0 14px rgba(94,224,206,.5)' : 'none',
                    transition:`height .7s cubic-bezier(.22,.68,0,1.1) ${i*60}ms`,
                  }}/>
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',gap:8}}>
            {days.map((d,i)=>(
              <div key={i} style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:10,color:d.ds===today?'#5EE0CE':'#3A4A5A'}}>{d.day}</div>
                <div style={{fontSize:10,color:'#3A4A5A'}}>{d.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Finance — дохід з лічильником */}
        <div style={{...glass,borderRadius:14,padding:16}}>
          <div style={{fontFamily:'Oswald',fontSize:18,marginBottom:14,color:'#E8EAF0'}}>Фінанси</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Дохід</div>
              <div style={{fontFamily:'Oswald',fontSize:26,background:GRD,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}><CountUp value={income} dur={1300}/> ₴</div>
            </div>
            <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Клієнтів</div>
              <div style={{fontFamily:'Oswald',fontSize:26,color:'#5EE0CE'}}><CountUp value={clients.length}/></div>
            </div>
          </div>
          {[...finance].reverse().slice(0,3).map((f,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<2?'1px solid rgba(255,255,255,.06)':'none'}}>
              <div>
                <div style={{fontSize:14,fontWeight:500,color:'#E8EAF0'}}>{f.name}</div>
                <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{f.date}</div>
              </div>
              <div style={{fontFamily:'Oswald',fontSize:20,color:f.type==='in'?'#46DCA8':'#FF6B6B'}}>{f.amount>0?'+':''}{Number(f.amount).toLocaleString('uk')} ₴</div>
            </div>
          ))}
          {finance.length===0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'32px',gap:8,textAlign:'center'}}><span style={{fontSize:40}}>💳</span><div style={{fontSize:14,fontWeight:600,color:'#E8EAF0'}}>Транзакцій ще немає</div><div style={{fontSize:12,color:'#4A90B8'}}>Записи з'являться після оплат клієнтів</div></div>}
        </div>

        {/* Price plans */}
        <div style={{...glass,borderRadius:14,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:'Oswald',fontSize:18,color:'#E8EAF0'}}>Прайс-листи</div>
            <button onClick={()=>{setEditPlan(null);setNp({name:'',sessions:1,price:''});setShowAddPlan(true)}}
              style={{background:GRD,color:'#000',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans'}}>
              + Додати
            </button>
          </div>
          {pricePlans.length===0 && <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px',gap:8,textAlign:'center'}}><span style={{fontSize:36}}>📋</span><div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>Прайс-листів ще немає</div><div style={{fontSize:11,color:'#4A90B8'}}>Додайте тарифи для клієнтів</div></div>}
          {pricePlans.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'rgba(255,255,255,.03)',borderRadius:10,marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{p.name}</div>
                <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{p.sessions} {p.sessions===1?'тренування':'тренувань'}</div>
              </div>
              <div style={{fontFamily:'Oswald',fontSize:20,color:'#5EE0CE'}}>{Number(p.price).toLocaleString('uk')} ₴</div>
              <button onClick={()=>{setEditPlan(p);setNp({name:p.name,sessions:p.sessions,price:p.price});setShowAddPlan(true)}}
                style={{background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,color:'#4A90B8',fontSize:12,padding:'4px 8px',cursor:'pointer'}}>✏️</button>
              <button onClick={()=>deletePlan(p.id)}
                style={{background:'none',border:'none',color:'#4A90B8',fontSize:14,cursor:'pointer'}}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit plan modal */}
      {showAddPlan && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}} onClick={()=>setShowAddPlan(false)}>
          <div style={{background:'#101218',border:'1px solid rgba(255,255,255,.1)',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'rgba(255,255,255,.15)',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16,color:'#E8EAF0'}}>{editPlan?'Редагувати план':'Новий план'}</div>
            <label style={lbl}>Назва</label>
            <input value={np.name} onChange={e=>setNp({...np,name:e.target.value})}
              placeholder="Спліт 2026 · 12 тренувань…" style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              <div>
                <label style={lbl}>Тренувань</label>
                <input type="number" value={np.sessions} onChange={e=>setNp({...np,sessions:e.target.value})}
                  placeholder="12" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Ціна (₴)</label>
                <input type="number" value={np.price} onChange={e=>setNp({...np,price:e.target.value})}
                  placeholder="10800" style={inp}/>
              </div>
            </div>
            <button onClick={savePlan}
              style={{width:'100%',padding:12,borderRadius:12,border:'none',background:GRD,color:'#000',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans'}}>
              {editPlan?'Зберегти зміни':'Додати план'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsTab
