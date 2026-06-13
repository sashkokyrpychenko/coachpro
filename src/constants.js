export const COLORS = ['#00F5FF','#47d4ff','#ff6b9d','#ffa347','#00FF88','#c47aff','#FF4466']
export const MONTHS_UK = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']
export const MONTHS_UK2 = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']
export const DAYS_SHORT = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД']
export const DAYS_FULL = ['Неділя','Понеділок','Вівторок','Середа','Четвер','Пятниця','Субота']

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function getMondayFirst(date) {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}
export function getWeekDates(refDate) {
  const monday = new Date(refDate)
  monday.setDate(refDate.getDate() - getMondayFirst(refDate))
  return Array.from({length:7}, (_,i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}
export function getMonthDates(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month+1, 0)
  const startOffset = getMondayFirst(first)
  const days = []
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, -startOffset+1+i)
    days.push({date:d, current:false})
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push({date:new Date(year, month, i), current:true})
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({date:new Date(year, month+1, i), current:false})
  }
  return days
}
export function dateToStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
