// API 配置
const API_BASE = ''  // 相对路径，前后端同域

let _token = localStorage.getItem('tc_token') || ''
let _workers = []
let _records = []
let _contents = []
let _settings = { defaultHourlyRate: 25 }

// 订阅回调
const listeners = new Set()

function notify() {
  listeners.forEach(fn => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ============ 认证 ============

export function isLoggedIn() {
  return !!_token
}

export function getToken() {
  return _token
}

export async function login(password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '登录失败')
  }
  
  const data = await res.json()
  _token = data.token
  localStorage.setItem('tc_token', _token)
  return data
}

export function logout() {
  _token = ''
  localStorage.removeItem('tc_token')
  notify()
}

// ============ API 请求封装 ============

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`
  }
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '请求失败')
  }
  
  return res.json()
}

// ============ Workers ============

export function getWorkers() { return _workers }

export async function fetchWorkers() {
  _workers = await api('/api/workers')
  notify()
}

export async function saveWorker(worker) {
  await api('/api/workers', {
    method: 'POST',
    body: JSON.stringify(worker)
  })
  await fetchWorkers()
}

export async function deleteWorker(id) {
  await api(`/api/workers/${id}`, { method: 'DELETE' })
  await fetchWorkers()
}

// ============ Contents ============

export function getContents() { return _contents }

export async function fetchContents() {
  _contents = await api('/api/contents')
  notify()
}

export async function addContent(content) {
  await api('/api/contents', {
    method: 'POST',
    body: JSON.stringify({ content })
  })
  await fetchContents()
}

export async function deleteContent(content) {
  await api(`/api/contents/${encodeURIComponent(content)}`, { method: 'DELETE' })
  await fetchContents()
}

// ============ Records ============

export function getRecords(filters = {}) {
  let records = [..._records]

  if (filters.workerId) {
    records = records.filter(r => r.workerId === filters.workerId)
  }
  if (filters.date) {
    records = records.filter(r => {
      return new Date(r.startTime).toDateString() === new Date(filters.date).toDateString()
    })
  }
  if (filters.startDate && filters.endDate) {
    records = records.filter(r => r.startTime >= filters.startDate && r.startTime <= filters.endDate)
  }

  return records.sort((a, b) => b.startTime - a.startTime)
}

export async function fetchRecords(filters = {}) {
  const params = new URLSearchParams()
  if (filters.workerId) params.set('workerId', filters.workerId)
  if (filters.date) params.set('date', filters.date)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  
  const query = params.toString()
  _records = await api(`/api/records${query ? '?' + query : ''}`)
  notify()
}

export async function addRecord(record) {
  await api('/api/records', {
    method: 'POST',
    body: JSON.stringify(record)
  })
  await fetchRecords()
}

export async function updateRecord(record) {
  // 后端没有 update，用 delete + add
  await api(`/api/records/${record.id}`, { method: 'DELETE' })
  await api('/api/records', {
    method: 'POST',
    body: JSON.stringify(record)
  })
  await fetchRecords()
}

export async function deleteRecord(id) {
  await api(`/api/records/${id}`, { method: 'DELETE' })
  await fetchRecords()
}

// ============ Settings ============

export function getSettings() { return _settings }

export async function fetchSettings() {
  _settings = await api('/api/settings')
  notify()
}

export async function saveSettings(settings) {
  await api('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
  await fetchSettings()
}

// ============ Export / Import ============

export async function exportData() {
  return await api('/api/export')
}

export async function importData(data) {
  await api('/api/import', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  await Promise.all([fetchWorkers(), fetchRecords(), fetchContents(), fetchSettings()])
}

export async function clearAll() {
  await api('/api/clear', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'CONFIRM_CLEAR_ALL_DATA' })
  })
  await Promise.all([fetchWorkers(), fetchRecords(), fetchContents(), fetchSettings()])
}

// ============ 初始化 ============

export async function init() {
  try {
    await Promise.all([fetchWorkers(), fetchRecords(), fetchContents(), fetchSettings()])
  } catch (e) {
    console.error('初始化数据失败:', e)
  }
}
