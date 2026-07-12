import { useState, useEffect, useRef } from 'react'
import { supabase, getUserId } from '../supabase'
import { todayStr, dateToStr, getMondayFirst, MONTHS_UK, MONTHS_UK2, DAYS_SHORT, DAYS_FULL } from '../constants'
import StatsTab from './StatsTab'
import FreeTimeTab from './FreeTimeTab'
import Modal from './Modal'
// ── PriceRow — рядок прайсу без видимих кнопок, свайп відкриває редагувати/видалити ──
function PriceRow({ plan, onEdit, onDelete }) {
  const ACTIONS_W = 144
  const [dx, setDx] = useState(0)
  const startX = useRef(null)
  const dragging = useRef(false)
  const startDx = useRef(0)

  const onStart = (x) => { startX.current = x; dragging.current = true; startDx.current = dx }
  const onMove = (x) => {
    if (!dragging.current) return
    const delta = x - startX.current
    setDx(Math.min(0, Math.max(-ACTIONS_W, startDx.current + delta)))
  }
  const onEnd = () => { dragging.current = false; setDx(dx < -ACTIONS_W/2 ? -ACTIONS_W : 0) }

  return (
    <div style={{position:'relative', borderRadius:12, overflow:'hidden'}}>
      <div style={{position:'absolute', top:0, right:0, bottom:0, width:ACTIONS_W, display:'flex'}}>
        <button onClick={()=>{onEdit(); setDx(0)}} style={{width:72, height:'100%', border:'none', background:'#3FA9F0', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button onClick={()=>{onDelete(); setDx(0)}} style={{width:72, height:'100%', border:'none', background:'#FF6B6B', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <div
        onMouseDown={e=>onStart(e.clientX)} onMouseMove={e=>dragging.current&&onMove(e.clientX)} onMouseUp={onEnd} onMouseLeave={()=>dragging.current&&onEnd()}
        onTouchStart={e=>onStart(e.touches[0].clientX)} onTouchMove={e=>onMove(e.touches[0].clientX)} onTouchEnd={onEnd}
        style={{display:'flex', alignItems:'center', gap:10, padding:'11px 12px', background:'#0D0D16', border:'1px solid #1A2E4A', borderRadius:12, position:'relative', transform:`translateX(${dx}px)`, transition:dragging.current?'none':'transform .25s', touchAction:'pan-y'}}
      >
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>{plan.name}</div>
          <div style={{fontSize:11,color:'#4A90B8',marginTop:2}}>{plan.sessions} {plan.sessions===1?'тренування':'тренувань'}</div>
        </div>
        <div style={{fontFamily:'Oswald',fontSize:18,color:'#00F5FF'}}>{Number(plan.price).toLocaleString('uk')} ₴</div>
      </div>
    </div>
  )
}

function ProfileTab({ sessions, clients, finance, setFinance, pricePlans, setPricePlans }) {
  const [section, setSection] = useState('freetime')
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [np, setNp] = useState({name:'',sessions:1,price:''})
  const [expanded, setExpanded] = useState(false)
  const [editFinance, setEditFinance] = useState(null)
  const [ef, setEf] = useState({name:'',amount:'',date:''})
  const [showAllFinance, setShowAllFinance] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [incomePercent, setIncomePercent] = useState(100)

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
  const incomeMonth = finance.filter(f=>f.type==='in' && f.date>=monthStartStr).reduce((a,f)=>a+Number(f.amount),0)
  const income      = finance.filter(f=>f.type==='in').reduce((a,f)=>a+Number(f.amount),0)

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

  // ── Тижневий прогноз (аналогічно місячному) ──
  const weekEndStr = (() => {
    const d = new Date(weekStartDate); d.setDate(weekStartDate.getDate()+6); return dateToStr(d)
  })()
  const weekIncomeFactual = finance
    .filter(f=>f.type==='in' && f.date>=weekStartStr && f.date<=today)
    .reduce((a,f)=>a+Number(f.amount),0)
  const futureSessionsWeek = sessions.filter(s=>s.date>today && s.date<=weekEndStr)
  const forecastAmountWeek = clients.reduce((total, client) => {
    if (!client.active_plan_id) return total
    const plan = pricePlans.find(p=>p.id===client.active_plan_id)
    if (!plan || plan.sessions < 1) return total
    const clientFuture = futureSessionsWeek.filter(s=>s.client_id===client.id).length
    if (clientFuture === 0) return total
    const remaining = Math.max(0, (client.clip_total||0) - (client.clip_used||0))
    if (clientFuture < remaining) return total
    const renewals = Math.floor((clientFuture - remaining) / plan.sessions) + 1
    return total + renewals * plan.price
  }, 0)
  const weekForecastTotal = weekIncomeFactual + forecastAmountWeek
  const weekDayNum = getMondayFirst(now) + 1   // 1..7 (Пн=1)
  const weekProgress = Math.min(Math.round((weekIncomeFactual / (weekForecastTotal||1)) * 100), 100)

  // обрана вкладка прогнозу: false=місяць, true=тиждень
  const [forecastWeek, setForecastWeek] = useState(false)
  const F = forecastWeek
    ? { label:'на тиждень', total:weekForecastTotal, factual:weekIncomeFactual, progress:weekProgress, expect:forecastAmountWeek, future:futureSessionsWeek.length, dayNow:weekDayNum, dayMax:7, dayWord:'День', tailWord:'до кінця тижня' }
    : { label:`на ${MONTHS_UK[now.getMonth()]}`, total:monthForecastTotal, factual:monthIncomeFactual, progress:forecastProgress, expect:forecastAmount, future:futureSessions.length, dayNow:daysPassed, dayMax:daysInMonth, dayWord:'День', tailWord:'до кінця місяця' }


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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email || ''))
  }, [])

  useEffect(() => {
    const loadPercent = async () => {
      const user_id = await getUserId()
      if (!user_id) return
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key','income_percent')
        .eq('user_id', user_id)
      if (error) { console.error('income_percent load error:', error); return }
      const row = data?.[0]
      if (row?.value) {
        const v = Number(row.value)
        if (v>=1 && v<=100) setIncomePercent(v)
      }
    }
    loadPercent()
  }, [])

  const saveIncomePercent = async (v) => {
    const clamped = Math.min(100, Math.max(1, Number(v)||100))
    setIncomePercent(clamped)
    const user_id = await getUserId()
    if (!user_id) return
    const { error } = await supabase.from('settings').upsert({ key:'income_percent', value:String(clamped), user_id }, { onConflict:'key,user_id' })
    if (error) console.error('income_percent save error:', error)
  }

  const pct = incomePercent / 100

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:'Oswald',fontSize:26,letterSpacing:0.5,color:'#00F5FF'}}>COACH<span style={{color:'#E8EAF0'}}>PRO</span></div>
        <div style={{fontSize:12,color:'#4A90B8',marginTop:2}}>{DAYS_FULL[now.getDay()]}, {now.getDate()} {MONTHS_UK2[now.getMonth()]}</div>
      </div>

      {/* Section tabs */}
      <div style={{display:'flex',gap:4,background:'#0D0D16',borderRadius:12,padding:4,marginBottom:20}}>
        {[['freetime','Free Time'],['finance','Фінанси'],['stats','Статистика'],['settings','Налаштування']].map(([id,label])=>(
          <div key={id} onClick={()=>setSection(id)}
            style={{flex:1,textAlign:'center',padding:'9px 4px',borderRadius:8,
              fontSize:12,fontWeight:section===id?700:400,
              background:section===id?'#111118':'transparent',
              color:section===id?'#E8EAF0':'#3A4A5A',cursor:'pointer'}}>
            {label}
          </div>
        ))}
      </div>

      {/* ── FREE TIME ── */}
      {section==='freetime' && (
        <FreeTimeTab sessions={sessions} clients={clients}/>
      )}

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
          <div style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:'#EAECEF'}}>Активність — 7 днів</div>
            <div style={{display:'flex',alignItems:'flex-end',gap:8,height:100,marginBottom:8}}>
              {counts.map((c,i)=>{
                const isToday = days[i].ds===today
                const intensity = 0.3 + (c/maxC)*0.55
                return (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:3}}>
                    <span style={{fontSize:10,fontWeight:600,color:c>0?'#5EE0CE':'#3A4A5A'}}>{c>0?c:''}</span>
                    <div style={{
                      width:'100%',borderRadius:'4px 4px 2px 2px',minHeight:4,
                      height:`${Math.max(4,(c/maxC)*85)}px`,
                      background: isToday ? 'linear-gradient(135deg,#5EE0CE,#3FA9F0)' : `rgba(94,224,206,${intensity})`,
                      boxShadow: isToday ? '0 0 14px rgba(94,224,206,.5)' : 'none',
                    }}/>
                  </div>
                )
              })}
            </div>
            <div style={{display:'flex',gap:8}}>
              {days.map((d,i)=>{
                const isToday = d.ds===today
                return (
                  <div key={i} style={{flex:1,display:'flex',justifyContent:'center'}}>
                    {isToday ? (
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,background:'rgba(94,224,206,.16)',borderRadius:10,padding:'3px 9px'}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#5EE0CE'}}>{d.day}</div>
                        <div style={{fontSize:10,fontWeight:600,color:'#5EE0CE'}}>{d.lbl}</div>
                      </div>
                    ) : (
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:10,color:'#3A4A5A'}}>{d.day}</div>
                        <div style={{fontSize:10,color:'#3A4A5A'}}>{d.lbl}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCE ── */}
      {section==='finance' && (
        <div>
          {/* Прогноз місяця / тижня — клік перемикає */}
          <div onClick={()=>setForecastWeek(w=>!w)} style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,marginBottom:12,cursor:'pointer',userSelect:'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:'#4A90B8',marginBottom:4,textTransform:'uppercase',letterSpacing:.5,display:'flex',alignItems:'center',gap:6}}>
                  Прогноз {F.label}
                  <span style={{fontSize:9,padding:'1px 7px',borderRadius:10,background:'rgba(94,224,206,.12)',color:'#5EE0CE',textTransform:'none',letterSpacing:0}}>{forecastWeek?'тиждень':'місяць'} ⇄</span>
                  {incomePercent<100 && <span style={{fontSize:9,padding:'1px 7px',borderRadius:10,background:'rgba(255,255,255,.06)',color:'#878F9B',textTransform:'none',letterSpacing:0}}>{incomePercent}%</span>}
                </div>
                <div key={F.label} style={{fontFamily:'Oswald',fontSize:30,color:'#00FF88',lineHeight:1,animation:'fadeUp .25s ease-out both'}}>{Math.round(F.total*pct).toLocaleString('uk')} ₴</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'#4A90B8',marginBottom:4}}>Вже зароблено</div>
                <div key={F.label+'f'} style={{fontFamily:'Oswald',fontSize:20,color:'#00F5FF',animation:'fadeUp .25s ease-out both'}}>{Math.round(F.factual*pct).toLocaleString('uk')} ₴</div>
              </div>
            </div>
            {/* Прогрес-бар */}
            <div style={{height:6,background:'#08080F',borderRadius:3,overflow:'hidden',marginBottom:8}}>
              <div style={{height:'100%',borderRadius:3,width:`${F.progress}%`,background:'linear-gradient(90deg,#00F5FF,#00FF88)',transition:'width .4s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#3A4A5A'}}>
              <span>{F.dayWord} {F.dayNow} з {F.dayMax}</span>
              <span style={{color:'#4A90B8'}}>+{Math.round(F.expect*pct).toLocaleString('uk')} ₴ очікується</span>
            </div>
            {F.future > 0 && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #1A2E4A',fontSize:11,color:'#4A90B8'}}>
                {F.future} тренувань заплановано {F.tailWord}
              </div>
            )}
          </div>

          {/* Загальний дохід */}
          <div style={{marginBottom:12}}>
            <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                <div style={{fontSize:11,color:'#4A90B8'}}>Дохід за місяць</div>
                <div style={{fontSize:10,color:'#4A5568'}}>Всього: {Math.round(income*pct).toLocaleString('uk')} ₴</div>
              </div>
              <div style={{fontFamily:'Oswald',fontSize:32,color:'#00FF88'}}>{Math.round(incomeMonth*pct).toLocaleString('uk')} ₴</div>
            </div>
          </div>
          {/* Модал редагування транзакції */}
          <Modal open={!!editFinance} onClose={()=>setEditFinance(null)} zIndex={300}>
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
          </Modal>

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

          {/* ── Прайс-листи (згорнутий блок всередині Фінансів) ── */}
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,marginTop:12}}>
            <div onClick={()=>setPriceOpen(o=>!o)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{fontWeight:700,fontSize:14}}>Прайс-листи</div>
                <span style={{fontSize:11,color:'#4A90B8',background:'rgba(74,144,184,.12)',padding:'2px 8px',borderRadius:7}}>{pricePlans.length}</span>
              </div>
              <span style={{color:'#4A90B8',fontSize:13,transform:priceOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
            </div>

            {priceOpen && (
              <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #1A2E4A'}}>
                <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                  <button onClick={()=>{setEditPlan(null);setNp({name:'',sessions:1,price:''});setShowAddPlan(true)}}
                    style={{background:'#00F5FF',color:'#111',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    + Додати
                  </button>
                </div>
                {pricePlans.length===0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px',gap:8,textAlign:'center'}}><span style={{fontSize:36}}>📋</span><div style={{fontSize:13,fontWeight:600,color:'#E8EAF0'}}>Прайс-листів ще немає</div><div style={{fontSize:11,color:'#4A90B8'}}>Додайте тарифи для клієнтів</div></div>}
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {visiblePlans.map(p=>(
                    <PriceRow key={p.id} plan={p}
                      onEdit={()=>{setEditPlan(p);setNp({name:p.name,sessions:p.sessions,price:p.price});setShowAddPlan(true)}}
                      onDelete={()=>deletePlan(p.id)}
                    />
                  ))}
                </div>
                {pricePlans.length > 3 && (
                  <button onClick={()=>setExpanded(!expanded)}
                    style={{width:'100%',marginTop:10,padding:'10px',borderRadius:10,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontSize:13,cursor:'pointer'}}>
                    {expanded?'▲ Згорнути':`▼ Показати всі (${pricePlans.length})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── НАЛАШТУВАННЯ ── */}
      {section==='settings' && (
        <div>
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#5EE0CE,#3FA9F0)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:20,fontWeight:600,color:'#06243B',flexShrink:0}}>Т</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:700,color:'#E8EAF0'}}>Тренер</div>
              <div style={{fontSize:12,color:'#4A90B8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{userEmail}</div>
            </div>
          </div>

          {/* ── Відсоток доходу ── */}
          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>Відсоток доходу</div>
            <div style={{fontSize:12,color:'#4A90B8',marginBottom:14,lineHeight:1.5}}>Якщо ти отримуєш не повну вартість тренування (наприклад, працюєш за комісію), вкажи свій реальний відсоток. Прогноз і дохід у Фінансах будуть рахуватись з урахуванням цього.</div>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <input type="range" min="1" max="100" value={incomePercent}
                onChange={e=>setIncomePercent(Number(e.target.value))}
                onMouseUp={e=>saveIncomePercent(e.target.value)}
                onTouchEnd={e=>saveIncomePercent(e.target.value)}
                style={{flex:1,accentColor:'#5EE0CE'}}/>
              <div style={{fontFamily:'Oswald',fontSize:22,color:'#5EE0CE',minWidth:54,textAlign:'right'}}>{incomePercent}%</div>
            </div>
          </div>

          <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:14,padding:16}}>
            <button onClick={()=>supabase.auth.signOut()}
              style={{width:'100%',padding:'13px',borderRadius:12,border:'1px solid rgba(255,68,102,.3)',background:'rgba(255,68,102,.08)',color:'#FF4466',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              Вийти з акаунту
            </button>
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
