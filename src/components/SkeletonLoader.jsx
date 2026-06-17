export { SkeletonBox, SkeletonLoader }
function SkeletonBox({ w='100%', h=16, r=8, mb=0 }) {
  return (
    <div style={{
      width:w, height:h, borderRadius:r,
      background:'linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.10) 50%,rgba(255,255,255,.03) 75%)',
      backgroundSize:'200% 100%',
      animation:'shimmer 1.4s infinite',
      marginBottom:mb, flexShrink:0,
    }}/>
  )
}

function SkeletonLoader({ tab }) {
  return (
    <div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Заголовок */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <SkeletonBox w={180} h={28} r={10}/>
        <div style={{display:'flex',gap:8}}>
          <SkeletonBox w={80} h={32} r={10}/>
          <SkeletonBox w={80} h={32} r={10}/>
          <SkeletonBox w={80} h={32} r={10}/>
        </div>
      </div>

      {tab === 'schedule' && (
        <>
          {/* Тижневий календар */}
          <div style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
              {Array.from({length:7}).map((_,i)=>(
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'8px 4px'}}>
                  <SkeletonBox w={24} h={10} r={4}/>
                  <SkeletonBox w={36} h={36} r={10}/>
                </div>
              ))}
            </div>
          </div>
          {/* Список сесій */}
          <div style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16,marginBottom:16}}>
            {Array.from({length:3}).map((_,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:i<2?'1px solid rgba(255,255,255,.06)':'none'}}>
                <SkeletonBox w={40} h={40} r={20}/>
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                  <SkeletonBox w='60%' h={13} r={6}/>
                  <SkeletonBox w='35%' h={10} r={6}/>
                </div>
                <SkeletonBox w={32} h={32} r={8}/>
              </div>
            ))}
          </div>
          {/* Таймлайн */}
          <div style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16}}>
            <SkeletonBox w={120} h={11} r={6} mb={16}/>
            {Array.from({length:6}).map((_,i)=>(
              <div key={i} style={{display:'flex',gap:12,marginBottom:16}}>
                <SkeletonBox w={36} h={10} r={4}/>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,.06)',marginTop:4}}/>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'clients' && (
        <>
          {/* Пошук */}
          <SkeletonBox w='100%' h={44} r={12} mb={16}/>
          {/* Картки клієнтів */}
          {Array.from({length:4}).map((_,i)=>(
            <div key={i} style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16,marginBottom:12,display:'flex',alignItems:'center',gap:14}}>
              <SkeletonBox w={48} h={48} r={24}/>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                <SkeletonBox w='50%' h={14} r={6}/>
                <SkeletonBox w='75%' h={10} r={6}/>
              </div>
              <SkeletonBox w={60} h={24} r={12}/>
            </div>
          ))}
        </>
      )}

      {tab === 'profile' && (
        <>
          {/* Статистика */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {Array.from({length:3}).map((_,i)=>(
              <div key={i} style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16,display:'flex',flexDirection:'column',gap:8}}>
                <SkeletonBox w='50%' h={10} r={4}/>
                <SkeletonBox w='70%' h={28} r={8}/>
              </div>
            ))}
          </div>
          {/* Графік */}
          <div style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16,marginBottom:16}}>
            <SkeletonBox w={140} h={12} r={6} mb={16}/>
            <div style={{display:'flex',alignItems:'flex-end',gap:8,height:80}}>
              {Array.from({length:7}).map((_,i)=>(
                <SkeletonBox key={i} w='100%' h={20+Math.random()*50} r={6}/>
              ))}
            </div>
          </div>
          {/* Фінанси */}
          <div style={{background:'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:16}}>
            <SkeletonBox w={100} h={12} r={6} mb={14}/>
            {Array.from({length:3}).map((_,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<2?'1px solid rgba(255,255,255,.06)':'none'}}>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <SkeletonBox w={140} h={12} r={6}/>
                  <SkeletonBox w={80} h={10} r={6}/>
                </div>
                <SkeletonBox w={80} h={20} r={6}/>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
