export function formatDate(timestamp) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatTime(timestamp) {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatDuration(ms) {
  const hours = Math.floor(ms / 1000 / 3600)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours === 0) return `${minutes}分钟`
  return `${hours}.${Math.round(minutes / 6 * 10)}h`
}

export function getDateLabel(timestamp) {
  const d = new Date(timestamp)
  const today = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  if (d.toDateString() === today.toDateString()) {
    return `今天 · ${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return `昨天 · ${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
  }

  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
}

export function getWeekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() || 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#2563EB', '#DB2777', '#4F46E5']

export function getAvatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function getInitial(name) {
  return name ? name.charAt(0) : '?'
}