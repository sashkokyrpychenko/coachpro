import { useState, useEffect, useRef } from 'react'

export default function DurationPicker({ value, onChange }) {
  const OPTIONS = [15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180]
  const ITEM_H = 40
  const VISIBLE = 3
  const containerH = ITEM_H * VISIBLE
  const scrollRef = useRef(null)

  useEffect(() => {
    const idx = OPTIONS.indexOf(value)
    if (scrollRef.current && idx >= 0) {
      scrollRef.current.scrollTop = idx * ITEM_H
    }
  }, [])

  const onScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(scrollRef.current.scrollTop / ITEM_H)
    const snapped = Math.max(0, Math.min(idx, OPTIONS.length - 1))
    onChange(OPTIONS[snapped])
  }

  return (
    <div style={{position:'relative', height:containerH, overflow:'hidden', borderRadius:12, background:'#0D0D16', border:'1px solid #1A2E4A'}}>
      <div style={{position:'absolute', left:0, right:0, top: ITEM_H, height: ITEM_H, background:'rgba(0,245,255,.08)', borderTop:'1px solid rgba(0,245,255,.2)', borderBottom:'1px solid rgba(0,245,255,.2)', pointerEvents:'none', zIndex:2}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:ITEM_H,background:'linear-gradient(to bottom, #0D0D16, transparent)',pointerEvents:'none',zIndex:3}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:ITEM_H,background:'linear-gradient(to top, #0D0D16, transparent)',pointerEvents:'none',zIndex:3}}/>
      <div ref={scrollRef} onScroll={onScroll} style={{height:'100%', overflowY:'scroll', scrollSnapType:'y mandatory', scrollbarWidth:'none', msOverflowStyle:'none', paddingTop: ITEM_H, paddingBottom: ITEM_H}}>
        <style>{`.dp-hide::-webkit-scrollbar{display:none}`}</style>
        {OPTIONS.map(opt => (
          <div key={opt}
            onClick={() => { onChange(opt); if(scrollRef.current) scrollRef.current.scrollTop = OPTIONS.indexOf(opt)*ITEM_H }}
            style={{height: ITEM_H, display:'flex', alignItems:'center', justifyContent:'center', scrollSnapAlign:'start', cursor:'pointer', fontSize: value===opt ? 18 : 14, fontWeight: value===opt ? 700 : 400, color: value===opt ? '#00F5FF' : '#3A4A5A', transition:'all 0.15s'}}>
            {opt} хв
          </div>
        ))}
      </div>
    </div>
  )
}
