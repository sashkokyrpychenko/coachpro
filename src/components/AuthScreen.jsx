import { supabase } from '../supabase'

const GRD = 'linear-gradient(135deg,#5EE0CE,#3FA9F0)'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
    </svg>
  )
}

function AuthScreen() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{minHeight:'100dvh',background:'#0A0B0F',display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 26px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(420px 280px at 85% 6%, rgba(94,224,206,.13), transparent 60%), radial-gradient(460px 340px at -8% 72%, rgba(63,150,240,.09), transparent 60%)'}}/>
      <div style={{position:'relative',zIndex:1,textAlign:'center',maxWidth:380,margin:'0 auto',width:'100%'}}>
        <div style={{width:72,height:72,margin:'0 auto 22px',borderRadius:20,background:GRD,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 12px 32px rgba(94,224,206,.3)'}}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="#06243B"><path d="M13 2 4.5 13.5H11L10 22 19.5 10.5H13Z"/></svg>
        </div>
        <div style={{fontFamily:'Oswald,sans-serif',fontSize:34,fontWeight:700,letterSpacing:1}}>
          <span style={{color:'#5EE0CE'}}>COACH</span><span style={{color:'#EAECEF'}}>PRO</span>
        </div>
        <div style={{fontSize:14,color:'#878F9B',marginTop:8,marginBottom:44}}>Твій тренерський простір</div>

        <button onClick={signInWithGoogle} style={{width:'100%',padding:16,borderRadius:14,border:'none',background:'#fff',color:'#1A1A1A',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans',display:'flex',alignItems:'center',justifyContent:'center',gap:12,boxShadow:'0 8px 24px rgba(0,0,0,.25)'}}>
          <GoogleIcon/> Продовжити з Google
        </button>

        <div style={{fontSize:12,color:'#6B7280',marginTop:24,lineHeight:1.6}}>
          Входячи, ти погоджуєшся з умовами<br/>використання CoachPro
        </div>
      </div>
    </div>
  )
}

export default AuthScreen
