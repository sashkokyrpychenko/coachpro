import { useState, useEffect, useRef } from 'react'
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
  html { background: #0B0C10 !important; height: 100%; overflow: hidden; }
  body { background: #0B0C10 !important; color: #EAECEF !important; font-variant-emoji: text; position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
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
    height: 100%;
  }
  .safe-bottom-fill {
    position: fixed;
    left: 0; right: 0;
    bottom: calc(-1 * env(safe-area-inset-bottom));
    height: calc(env(safe-area-inset-bottom) + 2px);
    background: #0B0C10;
    z-index: 90;
    pointer-events: none;
  }
  /* ── Premium Glass ── */
  .pg-glass {
    background: linear-gradient(160deg, rgba(255,255,255,.065), rgba(255,255,255,.022)) !important;
    border: 1px solid rgba(255,255,255,.08) !important;
    -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
    box-shadow: 0 1px 0 rgba(255,255,255,.05) inset, 0 10px 26px rgba(0,0,0,.28) !important;
  }
  .pg-time {
    background: linear-gradient(135deg,#5EE0CE,#3FA9F0) !important;
    -webkit-background-clip: text !important; background-clip: text !important;
    color: transparent !important;
  }
  .pg-nav {
    background: linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,.018)) !important;
    -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
    border-top: 1px solid rgba(255,255,255,.08) !important;
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
  const scrollRef = useRef(null)

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
    <div style={{display:'flex',height:'100%',background:'#0A0B0F',color:'#EAECEF',fontFamily:'DM Sans',position:'relative'}}>
      {/* ambient depth glows */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,background:'radial-gradient(640px 380px at 92% -4%, rgba(78,215,201,.10), transparent 62%), radial-gradient(680px 460px at -8% 58%, rgba(63,150,240,.075), transparent 62%)'}}/>
      <div className="desktop-sidebar" style={{width:220,background:'#0E1016',borderRight:'1px solid rgba(255,255,255,.06)',display:'flex',flexDirection:'column',flexShrink:0,position:'relative',zIndex:1,top:0,height:'100%'}}>
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

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0,position:'relative',zIndex:1}}>
        <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:24,minHeight:0,overscrollBehavior:'none'}}>
          {loading ? <SkeletonLoader tab={tab}/> : (
            <>
              {tab==='schedule'&&<ScheduleTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} onClientClick={id=>{setOpenClientId(id);setTab('clients')}}/>}
              {tab==='clients'&&<ClientsTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} records={records} setRecords={setRecords} pricePlans={pricePlans} setFinance={setFinance} programs={programs} setPrograms={setPrograms} openClientId={openClientId} clearOpenClientId={()=>setOpenClientId(null)}/>}
              {tab==='profile'&&<ProfileTab sessions={sessions} clients={clients} finance={finance} setFinance={setFinance} pricePlans={pricePlans} setPricePlans={setPricePlans}/>}
            </>
          )}
        </div>
        <div className="mobile-tabs pg-nav" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',flexShrink:0,zIndex:100}}>
          {TABS.map(([id,icon,label])=>{
            const active = tab===id
            return (
              <button key={id} onClick={()=>setTab(id)} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'8px 4px 0px',cursor:'pointer',border:'none',background:'none',fontFamily:'DM Sans',fontSize:11,fontWeight:600,gap:3}}>
                {active && <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:54,height:3,borderRadius:3,background:'linear-gradient(135deg,#5EE0CE,#3FA9F0)',boxShadow:'0 0 12px rgba(79,200,220,.8)'}}/>}
                <span style={{fontSize:20,filter:active?'drop-shadow(0 0 8px rgba(79,200,220,.5))':'none'}}>{icon}</span>
                <span style={active?{background:'linear-gradient(135deg,#5EE0CE,#3FA9F0)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}:{color:'#6B7280'}}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* iOS PWA: замальовує зону home indicator */}
      <div className="safe-bottom-fill"/>
    </div>
  )
}
