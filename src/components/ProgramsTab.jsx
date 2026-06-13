import { useState } from 'react'
import { supabase } from '../supabase'

export default function ProgramsTab({ clientId, programs, setPrograms }) {
  const clientPrograms = programs.filter(p => p.client_id === clientId)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [openId, setOpenId] = useState(null)

  const addProgram = async () => {
    if (!newName.trim() || clientPrograms.length >= 5) return
    const { data, error } = await supabase.from('programs').insert({
      client_id: clientId, name: newName.trim(), exercises: []
    }).select().single()
    if (!error && data) {
      setPrograms(prev => [...prev, data])
      setNewName('')
      setShowAdd(false)
      setOpenId(data.id)
    }
  }

  const deleteProgram = async (id) => {
    await supabase.from('programs').delete().eq('id', id)
    setPrograms(prev => prev.filter(p => p.id !== id))
    if (openId === id) setOpenId(null)
  }

  const updateExercises = async (id, exercises) => {
    await supabase.from('programs').update({ exercises }).eq('id', id)
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, exercises } : p))
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        {clientPrograms.length < 5 && (
          <button onClick={() => setShowAdd(o=>!o)} style={{padding:'8px 16px',borderRadius:10,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            + Програма
          </button>
        )}
      </div>

      {showAdd && (
        <div style={{background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:12,padding:12,marginBottom:12,display:'flex',gap:8}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addProgram()} placeholder="Назва програми (напр. Ноги, Спина...)" autoFocus
            style={{flex:1,background:'#08080F',border:'1px solid #1A2E4A',borderRadius:8,padding:'8px 10px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:13,outline:'none'}}/>
          <button onClick={addProgram} style={{padding:'8px 14px',borderRadius:8,border:'none',background:'#00F5FF',color:'#111',fontFamily:'DM Sans',fontSize:12,fontWeight:700,cursor:'pointer'}}>OK</button>
        </div>
      )}

      {clientPrograms.length === 0 && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'36px 24px',gap:10,textAlign:'center'}}>
          <span style={{fontSize:44}}>🏋️</span>
          <div style={{fontSize:14,fontWeight:700,color:'#E8EAF0'}}>Програм ще немає</div>
          <div style={{fontSize:12,color:'#4A90B8'}}>Додайте першу програму тренувань</div>
        </div>
      )}

      {clientPrograms.map(prog => (
        <div key={prog.id} style={{background:'#0D0D16',border:'1px solid #1A2E4A',borderRadius:12,overflow:'hidden',marginBottom:10}}>
          <div onClick={()=>setOpenId(openId===prog.id?null:prog.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:20}}>🏋️</span>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{prog.name}</div>
                <div style={{fontSize:11,color:'#4A90B8',marginTop:1}}>{(prog.exercises||[]).length} вправ</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={e=>{e.stopPropagation();deleteProgram(prog.id)}} style={{background:'rgba(255,68,102,.1)',border:'1px solid rgba(255,68,102,.2)',borderRadius:8,padding:'4px 10px',color:'#FF4466',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans'}}>Видалити</button>
              <span style={{color:'#4A90B8',fontSize:14,display:'inline-block',transform:openId===prog.id?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}>▾</span>
            </div>
          </div>

          {openId === prog.id && (
            <div style={{padding:'0 10px 14px'}}>
              <div style={{display:'flex',gap:4,padding:'4px 0 8px',borderBottom:'1px solid #1A2E4A',marginBottom:4}}>
                <div style={{flex:2,fontSize:10,color:'#4A90B8',textTransform:'uppercase',letterSpacing:.4}}>Вправа</div>
                <div style={{width:36,fontSize:10,color:'#4A90B8',textAlign:'center'}}>Підх.</div>
                <div style={{width:10}}/>
                <div style={{width:36,fontSize:10,color:'#4A90B8',textAlign:'center'}}>Повт.</div>
                <div style={{width:44,fontSize:10,color:'#4A90B8',textAlign:'center'}}>Вага кг</div>
                <div style={{width:20}}/>
              </div>
              {(prog.exercises||[]).map((ex, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 0',borderBottom:'1px solid #1A2E4A'}}>
                  <input value={ex.name} onChange={e=>{const exs=[...(prog.exercises||[])];exs[i]={...ex,name:e.target.value};updateExercises(prog.id,exs)}} placeholder="Вправа" style={{flex:2,minWidth:0,background:'#08080F',border:'1px solid #1A2E4A',borderRadius:8,padding:'6px 6px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,outline:'none'}}/>
                  <input value={ex.sets} type="number" onChange={e=>{const exs=[...(prog.exercises||[])];exs[i]={...ex,sets:Number(e.target.value)};updateExercises(prog.id,exs)}} style={{width:36,background:'#08080F',border:'1px solid #1A2E4A',borderRadius:8,padding:'6px 2px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,outline:'none',textAlign:'center'}}/>
                  <span style={{color:'#4A90B8',fontSize:10,flexShrink:0}}>×</span>
                  <input value={ex.reps} type="number" onChange={e=>{const exs=[...(prog.exercises||[])];exs[i]={...ex,reps:Number(e.target.value)};updateExercises(prog.id,exs)}} style={{width:36,background:'#08080F',border:'1px solid #1A2E4A',borderRadius:8,padding:'6px 2px',color:'#E8EAF0',fontFamily:'DM Sans',fontSize:12,outline:'none',textAlign:'center'}}/>
                  <input value={ex.weight} type="number" onChange={e=>{const exs=[...(prog.exercises||[])];exs[i]={...ex,weight:Number(e.target.value)};updateExercises(prog.id,exs)}} style={{width:44,background:'#08080F',border:'1px solid #1A2E4A',borderRadius:8,padding:'6px 2px',color:'#00F5FF',fontFamily:'DM Sans',fontSize:12,outline:'none',textAlign:'center'}}/>
                  <button onClick={()=>{const exs=(prog.exercises||[]).filter((_,j)=>j!==i);updateExercises(prog.id,exs)}} style={{background:'none',border:'none',color:'#3A4A5A',fontSize:13,cursor:'pointer',padding:'0',flexShrink:0}}>✕</button>
                </div>
              ))}
              <button onClick={()=>{const exs=[...(prog.exercises||[]),{name:'',sets:3,reps:10,weight:0}];updateExercises(prog.id,exs)}} style={{marginTop:10,width:'100%',padding:'8px',borderRadius:8,border:'1px dashed #1A2E4A',background:'none',color:'#4A90B8',fontFamily:'DM Sans',fontSize:12,cursor:'pointer'}}>
                + Додати вправу
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
