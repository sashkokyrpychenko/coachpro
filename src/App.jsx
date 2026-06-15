import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'
import ScheduleTab from './components/ScheduleTab'
import ClientsTab from './components/ClientsTab'
import ProfileTab from './components/ProfileTab'
import { SkeletonLoader } from './components/SkeletonLoader'
import { DAYS_FULL, MONTHS_UK2 } from './constants'

// Dark theme global override
const _fontLink = document.createElement('link')
_fontLink.rel = 'stylesheet'
_fontLink.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap'
document.head.appendChild(_fontLink)

const _darkStyle = document.createElement('style')
_darkStyle.textContent = `
  html { background: #111118 !important; }
  body { background: #0A0A12 !important; color: #E8EAF0 !important; font-variant-emoji: text; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(0.6) sepia(1) hue-rotate(150deg); }
  select option { background: #0D0D16; color: #E8EAF0; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #08080F; }
  ::-webkit-scrollbar-thumb { background: #1A2E4A; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #00F5FF44; }
  * { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  button:active { opacity: 0.75; transform: scale(0.97); }
  button { transition: opacity 0.1s, transform 0.1s; }
  #root {
    padding-top: env(safe-area-inset-top);
    box-sizing: border-box;
    height: 100dvh;
  }
`
document.head.appendChild(_darkStyle)

export default function App() {
  const [tab, setTab] = useState('schedule')
  const [openClientId, setOpenClientId] = useState(null)
  const [clients, setClients] = useState([])
  const [sessions, setSessions] = useState([])
  const [finance, setFinance] = useState([])
  const [records, setRecords] = useState([])
  const [pricePlans, setPricePlans] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [c,s,f,r,pp,pr] = await Promise.all([
        supabase.from('clients').select('*').order('created_at'),
        supabase.from('sessions').select('*')
          .gte('date', '2026-01-01')
          .lte('date', (() => { const d = new Date(); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10) })())
          .order('created_at'),
        supabase.from('finance').select('*').order('created_at'),
        supabase.from('records').select('*').order('created_at'),
        supabase.from('price_plans').select('*').order('name'),
        supabase.from('programs').select('*').order('created_at'),
      ])
      if (c.data) setClients(c.data.sort((a,b) => a.name.localeCompare(b.name, 'uk')))
      if (s.data) setSessions(s.data)
      if (f.data) setFinance(f.data)
      if (r.data) setRecords(r.data)
      if (pp.data) setPricePlans(pp.data)
      if (pr.data) setPrograms(pr.data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const dateStr = `${DAYS_FULL[now.getDay()]}, ${now.getDate()} ${MONTHS_UK2[now.getMonth()]}`
  const TABS = [['schedule','📅','Графік'],['clients','👥','Клієнти'],['profile','⚡','Профіль']]

  return (
    <div style={{display:'flex',height:'100%',background:'#0A0A12',color:'#E8EAF0',fontFamily:'DM Sans'}}>
      <div className="desktop-sidebar" style={{width:220,background:'#111118',borderRight:'1px solid #1A2E4A',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100%'}}>
        <div style={{padding:'24px 20px 20px',borderBottom:'1px solid #162038'}}>
          <div style={{fontFamily:'Oswald',fontSize:26,letterSpacing:0.5,color:'#00F5FF'}}>COACH<span style={{color:'#E8EAF0'}}>PRO</span></div>
          <div style={{fontSize:12,color:'#3A7A9A',marginTop:4}}>{dateStr}</div>
        </div>
        <nav style={{flex:1,padding:'12px 0'}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 20px',cursor:'pointer',border:'none',fontFamily:'DM Sans',fontSize:14,fontWeight:500,textAlign:'left',borderLeft:tab===id?'3px solid #00F5FF':'3px solid transparent',background:tab===id?'rgba(0,245,255,.06)':'none',color:tab===id?'#00F5FF':'#3A4A5A',transition:'all .18s'}}>
              <span style={{fontSize:18}}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{padding:'16px 20px',borderTop:'1px solid #162038'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#00F5FF,#0080CC)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:16,color:'#111'}}>Т</div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Тренер</div>
              <div style={{fontSize:11,color:'#4A90B8'}}>CoachPro</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
        <div style={{flex:1,overflowY:'auto',padding:24,minHeight:0}}>
          {loading ? <SkeletonLoader tab={tab}/> : (
            <>
              {tab==='schedule'&&<ScheduleTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} onClientClick={id=>{setOpenClientId(id);setTab('clients')}}/>}
              {tab==='clients'&&<ClientsTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} records={records} setRecords={setRecords} pricePlans={pricePlans} setFinance={setFinance} programs={programs} setPrograms={setPrograms} openClientId={openClientId} clearOpenClientId={()=>setOpenClientId(null)}/>}
              {tab==='profile'&&<ProfileTab sessions={sessions} clients={clients} finance={finance} setFinance={setFinance} pricePlans={pricePlans} setPricePlans={setPricePlans}/>}
            </>
          )}
        </div>
        <div className="mobile-tabs" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',background:'#111118',borderTop:'1px solid #162038',flexShrink:0,zIndex:100}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 4px 12px',cursor:'pointer',border:'none',background:'none',color:tab===id?'#00F5FF':'#3A4A5A',fontFamily:'DM Sans',fontSize:11,fontWeight:500,gap:4,borderTop:tab===id?'2px solid #00F5FF':'2px solid transparent'}}>
              <span style={{fontSize:20}}>{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
