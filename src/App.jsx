import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'
import ScheduleTab from './components/ScheduleTab'
import ClientsTab from './components/ClientsTab'
import ProfileTab from './components/ProfileTab'
import { SkeletonLoader } from './components/SkeletonLoader'
import { DAYS_FULL, MONTHS_UK2 } from './constants'
import { getThemeCSS } from './constants-theme'


// Dark theme global override — now dynamic based on isDark state
const _fontLink = document.createElement('link')
_fontLink.rel = 'stylesheet'
_fontLink.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap'
document.head.appendChild(_fontLink)

const _darkStyle = document.createElement('style')
// Примусово темна тема (світла ще не дороблена) — уникаємо білого спалаху
_darkStyle.textContent = getThemeCSS(true)
document.head.appendChild(_darkStyle)

// ── SVG іконки нижнього меню ──────────────────────────
const NAV_ICONS = {
  schedule: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2.5"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <rect x="7" y="13" width="2.5" height="2.5" rx=".5" fill={c} stroke="none"/>
      <rect x="11" y="13" width="2.5" height="2.5" rx=".5" fill={c} stroke="none"/>
    </svg>
  ),
  clients: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.2"/>
      <path d="M2.5 21v-1.5A4.5 4.5 0 0 1 7 15h4a4.5 4.5 0 0 1 4.5 4.5V21"/>
      <circle cx="17.5" cy="7.5" r="2.4" opacity=".55"/>
      <path d="M21.5 21v-1a3.2 3.2 0 0 0-2-3" opacity=".55"/>
    </svg>
  ),
  profile: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c} stroke="none">
      <path d="M13 2 4.5 13.5H11L10 22 19.5 10.5H13Z"/>
    </svg>
  ),
}

const TAB_ORDER = ['schedule','clients','profile']

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
  const [isDark, setIsDark] = useState(true)  // примусово темна поки світла не дороблена
  const [selectedClientId, setSelectedClientId] = useState(null)
  const scrollRef = useRef(null)
  const prevTabRef = useRef('schedule')
  const [tabKey, setTabKey] = useState(0)

  const switchTab = (id) => {
    prevTabRef.current = tab
    setTab(id)
    setTabKey(k => k + 1)
  }

  // ── Dynamic theme CSS update ──
  useEffect(() => {
    _darkStyle.textContent = getThemeCSS(isDark)
  }, [isDark])

  // Слухач системної теми вимкнено поки світла тема не дороблена

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
  const TABS = [['schedule','Графік'],['clients','Клієнти'],['profile','Профіль']]
  const slideDir = TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(prevTabRef.current) ? 'R' : 'L'

  return (
    <div style={{display:'flex',height:'100dvh',background:'#0A0B0F',color:'#EAECEF',fontFamily:'DM Sans',position:'relative'}}>
      {/* ambient depth glows */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,background:'radial-gradient(640px 380px at 92% -4%, rgba(78,215,201,.10), transparent 62%), radial-gradient(680px 460px at -8% 58%, rgba(63,150,240,.075), transparent 62%)'}}/>
      <div className="desktop-sidebar" style={{width:220,background:'#0E1016',borderRight:'1px solid rgba(255,255,255,.06)',display:'flex',flexDirection:'column',flexShrink:0,position:'relative',zIndex:1,top:0,height:'100%'}}>
        <div style={{padding:'24px 20px 20px',borderBottom:'1px solid #162038'}}>
          <div style={{fontFamily:'Oswald',fontSize:26,letterSpacing:0.5,color:'#00F5FF'}}>COACH<span style={{color:'#E8EAF0'}}>PRO</span></div>
          <div style={{fontSize:12,color:'#3A7A9A',marginTop:4}}>{dateStr}</div>
        </div>
        <nav style={{flex:1,padding:'12px 0'}}>
          {TABS.map(([id,label])=>(
            <button key={id} onClick={()=>switchTab(id)} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 20px',cursor:'pointer',border:'none',fontFamily:'DM Sans',fontSize:14,fontWeight:500,textAlign:'left',borderLeft:tab===id?'3px solid #00F5FF':'3px solid transparent',background:tab===id?'rgba(0,245,255,.06)':'none',color:tab===id?'#00F5FF':'#3A4A5A',transition:'all .18s'}}>
              {NAV_ICONS[id](tab===id?'#00F5FF':'#3A4A5A')}{label}
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
        <div ref={scrollRef} className="pg-scroll" style={{flex:1,overflowY:'auto',minHeight:0,overscrollBehavior:'none'}}>
          {loading ? <SkeletonLoader tab={tab}/> : (
            /* Tab slide: key змінюється при кожному переключенні → перемонтується з анімацією */
            <div key={tabKey} style={{animation:`tabSlide${slideDir} .28s ease-out both`}}>
              {tab==='schedule'&&<ScheduleTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} onClientClick={id=>{setSelectedClientId(id);switchTab('clients')}}/>}
              {tab==='clients'&&<ClientsTab clients={clients} setClients={setClients} sessions={sessions} setSessions={setSessions} records={records} setRecords={setRecords} pricePlans={pricePlans} setFinance={setFinance} programs={programs} setPrograms={setPrograms} openClientId={openClientId} clearOpenClientId={()=>setOpenClientId(null)} selectedClientId={selectedClientId} clearSelectedClientId={()=>setSelectedClientId(null)}/>}
              {tab==='profile'&&<ProfileTab sessions={sessions} clients={clients} finance={finance} setFinance={setFinance} pricePlans={pricePlans} setPricePlans={setPricePlans}/>}
            </div>
          )}
        </div>
        {/* Mobile bottom nav — плаваюча світла капсула (Instagram-стиль) */}
        <div className="mobile-tabs pg-nav" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',zIndex:100}}>
          {TABS.map(([id,label])=>{
            const active = tab===id
            const ic = active ? '#3FA9F0' : '#8A94A6'
            return (
              <button key={id} onClick={()=>switchTab(id)} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none',background:'none',fontFamily:'DM Sans',fontSize:11,fontWeight:600,gap:3}}>
                {active && <div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',width:44,height:3,borderRadius:3,background:'linear-gradient(135deg,#2B9B7A,#0066CC)',boxShadow:'0 0 12px rgba(43,155,122,.5)'}}/>}
                <div style={{filter:active?'drop-shadow(0 0 6px rgba(63,169,240,.4))':'none',marginTop:active?6:0,transition:'all .25s'}}>
                  {NAV_ICONS[id](ic)}
                </div>
                <span style={active?{background:'linear-gradient(135deg,#2B9B7A,#0066CC)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}:{color:'#8A94A6'}}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
