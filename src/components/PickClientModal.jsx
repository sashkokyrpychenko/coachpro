export default function PickClientModal({ sessions, clients, onPick, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}} onClick={onClose}>
      <div style={{background:'#111118',border:'1px solid #1A2E4A',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 36px'}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:'#1E2A3A',borderRadius:2,margin:'0 auto 18px'}}/>
        <div style={{fontFamily:'Oswald',fontSize:22,marginBottom:16}}>Кого редагувати?</div>
        {sessions.map(s => {
          const c = clients.find(x => x.id === s.client_id)
          return (
            <div key={s.id} onClick={() => onPick(s)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',background:'#0D0D16',borderRadius:12,marginBottom:8,cursor:'pointer',border:'1px solid #1A2E4A'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:c?.color||'#888',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Oswald',fontSize:14,color:'#111'}}>{c?.ava||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{c?.name||'Гість'}</div>
                <div style={{fontSize:12,color:'#4A90B8'}}>{s.time} · {s.type}</div>
              </div>
              <span style={{color:'#111118',fontSize:20}}>›</span>
            </div>
          )
        })}
        <button onClick={onClose} style={{width:'100%',marginTop:4,padding:11,borderRadius:12,border:'1px solid #1A2E4A',background:'transparent',color:'#4A90B8',fontFamily:'DM Sans',fontSize:13,cursor:'pointer'}}>Скасувати</button>
      </div>
    </div>
  )
}
