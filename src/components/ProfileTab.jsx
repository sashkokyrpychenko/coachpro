import { useState } from 'react'
import { supabase } from '../supabase'
import { todayStr, dateToStr, getMondayFirst, MONTHS_UK, MONTHS_UK2 } from '../constants'
import StatsTab from './StatsTab'
function ProfileTab({ sessions, clients, finance, setFinance, pricePlans, setPricePlans }) {
  const [section, setSection] = useState('stats')
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [np, setNp] = useState({name:'',sessions:1,price:''})
  const [expanded, setExpanded] = useState(false)
  const [editFinance, setEditFinance] = useState(null)
  const [ef, setEf] = useState({name:'',amount:'',date:''})
  const [showAllFinance, setShowAllFinance] = useState(false)

  const today = todayStr()
  const now = new Date()
  const weekStartDate = new Date(now)
  weekStartDate.setDate(now.getDate() - getMondayFirst(now))
  const weekStartStr = dateToStr(weekStartDate)
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const todayCount = sessions.filter(s=>s.date===today).length
  const weekCount  = sessions.filter(s=>s.date>=weekStartStr&&s.date<=today).length
  const monthCount = sessions.filter(s=>s.date>=monthStartStr&&s.date<=today).length
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(now); d.setDate(now.getDate()-6+i); return {ds:dateToStr(d),lbl:d.getDate(),day:DAYS_SHORT[getMondayFirst(d)]} })
  const counts = days.map(d=>sessions.filter(s=>s.date===d.ds).length)
  const maxC = Math.max(...counts,1)
  const income  = finance.filter(f=>f.type==='in').reduce((a,f)=>a+Number(f.amount),0)

  // Прогноз доходу на поточний місяць
  const monthEndStr = (() => {
    const d = new Date(now.getFullYear(), now.getMonth()+1, 0)
    return dateToStr(d)
  })()
  const monthIncomeFactual = finance
    .filter(f=>f.type==='in' && f.date>=monthStartStr && f.date<=today)
    .reduce((a,f)=>a+Number(f.amount),0)
  const futureSessions = sessions.filter(s=>s.date>today && s.date<=monthEndStr)
  const forecastAmount = clients.reduce((total, client) => {
    if (!client.active_plan_id) return total
    const plan = pricePlans.find(p=>p.id===client.active_plan_id)
    if (!plan || plan.sessions < 1) return total
    const clientFuture = futureSessions.filter(s=>s.client_id===client.id).length
    if (clientFuture === 0) return total
    const remaining = Math.max(0, (client.clip_total||0) - (client.clip_used||0))
    // Якщо майбутніх занять менше ніж залишилось — поновлення не буде
    if (clientFuture < remaining) return total
    // Скільки разів поновить пакет
    const renewals = Math.floor((clientFuture - remaining) / plan.sessions) + 1
    return total + renewals * plan.price
  }, 0)
  const monthForecastTotal = monthIncomeFactual + forecastAmount
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
  const daysPassed = now.getDate()
  const forecastProgress = Math.min(Math.round((monthIncomeFactual / (monthForecastTotal||1)) * 100), 100)

  // Sort plans by usage count
  const planUsage = pricePlans.map(p=>({
    ...p,
    usage: clients.filter(c=>c.active_plan_id===p.id).length
  })).sort((a,b)=>b.usage-a.usage)
  const visiblePlans = expanded ? planUsage : planUsage.slice(0,3)

  const savePlan = async () => {
    if (!np.name||!np.price) return
    if (editPlan) {
      const {data,error} = await supabase.from('price_plans').update({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).eq('id',editPlan.id).select().single()
      if (!error) setPricePlans(prev=>prev.map(p=>p.id===editPlan.id?data:p).sort((a,b)=>a.name.localeCompare(b.name,'uk')))
      setEditPlan(null)
    } else {
      const {data,error} = await supabase.from('price_plans').insert({name:np.name,sessions:Number(np.sessions),price:Number(np.price)}).select().single()
      if (!error) setPricePlans(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name,'uk')))
    }
    setShowAddPlan(false); setNp({name:'',sessions:1,price:''})
  }
  const deletePlan = async (id) => {
    await supabase.from('price_plans').delete().eq('id',id)
    setPricePlans(prev=>prev.filter(p=>p.id!==id))
  }

  const inp = {width:'100%',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:10,padding:'10px 14px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:11,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:'Oswald',fontSize:26,letterSpacing:0.5,color:'#00F5FF'}}>COACH<span style={{color:'#E8EAF0'}}>PRO</span></div>
        <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>{DAYS_FULL[now.getDay()]}, {now.getDate()} {MONTHS_UK2[now.getMonth()]}</div>
      </div>

      {/* Section tabs */}
      <div style={{display:'flex',gap:4,background:'#0D0D16',borderRadius:12,padding:4,marginBottom:20}}>
        {[['stats','Статистика'],['finance','Фінанси'],['price','Прайс']].map(([id,label])=>(
          <div key={id} onClick={()=>setSection(id)}
            style={{flex:1,textAlign:'center',padding:'9px 4px',borderRadius:8,
              fontSize:13,fontWeight:section===id?700:400,
              background:section===id?'#111118':'transparent',
              color:section===id?'#E8EAF0':'#3A4A5A',cursor:'pointer'}}>
            {label}
          </div>
        ))}
      </div>

      {/* ── STATS ── */}
      {section==='stats' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            {[['Сьогодні',todayCount,'#00F5FF'],['Тиждень',weekCount,'#47d4ff'],['Місяць',monthCount,'#00FF88']].map(([l,v,cl])=>(
              <div key={l} style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,textAlign:'center'}}>
                <div style={{fontFamily:'Oswald',fontSize:42,color:cl,lineHeight:1}}>{v}</div>
                <div style={{fontSize:12,color:'#4A90B8',marginTop:6}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Активність — 7 днів</div>
            <div style={{display:'flex',alignItems:'flex-end',gap:8,height:100,marginBottom:8}}>
              {counts.map((c,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:3}}>
                  <span style={{fontSize:10,fontWeight:600,color:c>0?'#00F5FF':'#3A4A5A'}}>{c>0?c:''}</span>
                  <div style={{width:'100%',borderRadius:'4px 4px 0 0',minHeight:4,height:`${Math.max(4,(c/maxC)*85)}px`,background:days[i].ds===today?'#00F5FF':'#08080F',border:`1px solid ${days[i].ds===today?'#00F5FF':'#1E2A3A'}`}}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              {days.map((d,i)=>(
                <div key={i} style={{flex:1,textAlign:'center'}}>
                  <div style={{fontSize:10,color:d.ds===today?'#00F5FF':'#3A4A5A'}}>{d.day}</div>
                  <div style={{fontSize:10,color:'#1A2A3A'}}>{d.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCE ── */}
      {section==='finance' && (
        <div>
          {/* Прогноз місяця */}
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:'#4A90B8',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>Прогноз на {MONTHS_UK[now.getMonth()]}</div>
                <div style={{fontFamily:'Oswald',fontSize:30,color:'#00FF88',lineHeight:1}}>{Math.round(monthForecastTotal).toLocaleString('uk')} ₴</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Вже зароблено</div>
                <div style={{fontFamily:'Oswald',fontSize:20,color:'#00F5FF'}}>{Math.round(monthIncomeFactual).toLocaleString('uk')} ₴</div>
              </div>
            </div>
            {/* Прогрес-бар */}
            <div style={{height:6,background:'#08080F',borderRadius:3,overflow:'hidden',marginBottom:8}}>
              <div style={{height:'100%',borderRadius:3,width:`${forecastProgress}%`,background:'linear-gradient(90deg,#00F5FF,#00FF88)',transition:'width .4s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#3A4A5A'}}>
              <span>День {daysPassed} з {daysInMonth}</span>
              <span style={{color:'#4A90B8'}}>+{Math.round(forecastAmount).toLocaleString('uk')} ₴ очікується</span>
            </div>
            {futureSessions.length > 0 && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #1A2E4A',fontSize:11,color:'#4A90B8'}}>
                {futureSessions.length} тренувань заплановано до кінця місяця
              </div>
            )}
          </div>

          {/* Загальний дохід */}
          <div style={{marginBottom:12}}>
            <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
              <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Дохід (всього)</div>
              <div style={{fontFamily:'Oswald',fontSize:32,color:'#00FF88'}}>{income.toLocaleString('uk')} ₴</div>
            </div>
          </div>
          {/* Модал редагування транзакції */}
          {editFinance && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}} onClick={()=>setEditFinance(null)}>
              <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:16,padding:24,width:300}} onClick={e=>e.stopPropagation()}>
                <div style={{fontFamily:'Oswald',fontSize:20,marginBottom:16,color:'#E8EAF0'}}>Редагувати транзакцію</div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                  <input value={ef.name} onChange={e=>setEf(p=>({...p,name:e.target.value}))} placeholder="Назва"
                    style={{padding:'9px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:13}}/>
                  <input type="number" value={ef.amount} onChange={e=>setEf(p=>({...p,amount:e.target.value}))} placeholder="Сума"
                    style={{padding:'9px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:13}}/>
                  <input type="date" value={ef.date} onChange={e=>setEf(p=>({...p,date:e.target.value}))}
                    style={{padding:'9px 12px',borderRadius:10,border:'1px solid #1A2E4A',background:'#08080F',color:'#E8EAF0',fontSize:13}}/>

                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={async()=>{
                    await supabase.from('finance').delete().eq('id',editFinance.id)
                    setFinance(prev=>prev.filter(x=>x.id!==editFinance.id))
                    setEditFinance(null)
                  }} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #FF4466',background:'transparent',color:'#FF4466',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                    Видалити
                  </button>
                  <button onClick={async()=>{
                    const upd={name:ef.name,amount:Number(ef.amount),type:ef.type,date:ef.date}
                    await supabase.from('finance').update(upd).eq('id',editFinance.id)
                    setFinance(prev=>prev.map(x=>x.id===editFinance.id?{...x,...upd}:x))
                    setEditFinance(null)
                  }} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    Зберегти
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:14}}>Транзакції</div>
              {finance.length > 3 && (
                <button onClick={()=>setShowAllFinance(o=>!o)} style={{background:'none',border:'none',color:'#4A90B8',fontSize:12,cursor:'pointer',fontFamily:'DM Sans'}}>
                  {showAllFinance ? 'Сховати' : `Всі ${finance.length}`}
                </button>
              )}
            </div>
            {finance.length===0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'32px',gap:8,textAlign:'center'}}><span style={{fontSize:40}}>💳</span><div style={{fontSize:14,fontWeight:600,color:'#E8EAF0'}}>Транзакцій ще немає</div><div style={{fontSize:12,color:'#4A90B8'}}>Записи з'являться після оплат клієнтів</div></div>}
            {[...finance].reverse().slice(0, showAllFinance ? finance.length : 3).map((f,i,arr)=>(
              <div key={f.id||i} onClick={()=>{setEditFinance(f);setEf({name:f.name,amount:f.amount,type:f.type,date:f.date})}}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<arr.length-1?'1px solid #1A2E4A':'none',cursor:'pointer'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{f.name}</div>
                  <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{f.date}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{fontFamily:'Oswald',fontSize:20,color:f.type==='in'?'#00FF88':'#FF4466'}}>
                    {f.type==='in'?'+':'-'}{Math.abs(Number(f.amount)).toLocaleString('uk')} ₴
                  </div>
                  <span style={{color:'#4A90B8',fontSize:16}}>✎</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRICE ── */}
      {section==='price' && (
        <div>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:14}}>Прайс-листи</div>
              <button onClick={()=>{setEditPlan(null);setNp({name:'',sessions:1,price:''});setShowAddPlan(true)}}
                style={{background:'#00F5FF',color:'#111',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                + Додати
              </button>
            </div>
            {pricePlans.length===0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px',gap:8,textAlign:'center'}}><span style={{fontSize:36}}>📋</span><div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>Прайс-листів ще немає</div><div style={{fontSize:11,color:'#4A90B8'}}>Додайте тарифи для клієнтів</div></div>}
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {visiblePlans.map(p=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 12px',background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{p.name}</div>
                    <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{p.sessions} {p.sessions===1?'тренування':'тренувань'}</div>
                  </div>
                  <div style={{fontFamily:'Oswald',fontSize:18,color:'#00F5FF'}}>{Number(p.price).toLocaleString('uk')} ₴</div>
                  <button onClick={()=>{setEditPlan(p);setNp({name:p.name,sessions:p.sessions,price:p.price});setShowAddPlan(true)}}
                    style={{background:'none',border:'1px solid #1A2E4A',borderRadius:7,color:'#4A90B8',fontSize:12,padding:'4px 8px',cursor:'pointer'}}>✏️</button>
                  <button onClick={()=>deletePlan(p.id)}
                    style={{background:'none',border:'none',color:'#4A90B8',fontSize:14,cursor:'pointer'}}>✕</button>
                </div>
              ))}
            </div>
            {pricePlans.length > 3 && (
              <button onClick={()=>setExpanded(!expanded)}
                style={{width:'100%',marginTop:10,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
                {expanded?'▲ Згорнути':`▼ Показати всі (${pricePlans.length})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit plan modal */}
      {showAddPlan && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}} onClick={()=>setShowAddPlan(false)}>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
            <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>{editPlan?'Редагувати план':'Новий план'}</div>
            <label style={lbl}>Назва</label>
            <input value={np.name} onChange={e=>setNp({...np,name:e.target.value})} placeholder="Спліт 2026 · 12 тренувань…" style={{...inp,marginBottom:12}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              <div><label style={lbl}>Тренувань</label><input type="number" value={np.sessions} onChange={e=>setNp({...np,sessions:e.target.value})} placeholder="12" style={inp}/></div>
              <div><label style={lbl}>Ціна (₴)</label><input type="number" value={np.price} onChange={e=>setNp({...np,price:e.target.value})} placeholder="10800" style={inp}/></div>
            </div>
            <button onClick={savePlan}
              style={{width:'100%',padding:12,borderRadius:12,border:'none',background:'#00F5FF',color:'#111',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              {editPlan?'Зберегти зміни':'Додати план'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
export default ProfileTab
