import { API_BASE, USE_CLOUD } from './config'

const KEYS = {
  WORKERS: 'tc_workers',
  RECORDS: 'tc_records',
  CONTENTS: 'tc_contents',
  SETTINGS: 'tc_settings',
  AUTH_TOKEN: 'tc_auth_token'
}

const defaultContents = ['剥辣条', '打料', '晾晒', '包装', '搬运']

// 本地缓存
let _workers = []
let _records = []
let _contents = defaultContents
let _settings = { defaultHourlyRate: 25 }
let _isAuthenticated = false

// 订阅回调
const listeners = new Set()
const authListeners = new Set()

function notify() {
  listeners.forEach(fn => fn())
}

function notifyAuth() {
  authListeners.forEach(fn => fn(_isAuthenticated))
}

// ========== 认证 ==========

export function isAuthenticated() {
  return _isAuthenticated
}

export function subscribeAuth(fn) {
  authListeners.add(fn)
  return () => authListeners.delete(fn)
}

export async function login(password) {
  if (!USE_CLOUD) {
    _isAuthenticated = true
    notifyAuth()
    return { success: true }
  }
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await res.json()
    if (data.success) {
      localStorage.setItem(KEYS.AUTH_TOKEN, password)
      _isAuthenticated = true
      notifyAuth()
    }
    return data
  } catch (e) {
    return { error: '网络错误' }
  }
}

export function logout() {
  localStorage.removeItem(KEYS.AUTH_TOKEN)
  _isAuthenticated = false
  notifyAuth()
}

function getAuthToken() {
  return localStorage.getItem(KEYS.AUTH_TOKEN) || ''
}

function initAuth() {
  const token = localStorage.getItem(KEYS.AUTH_TOKEN)
  if (token) {
    _isAuthenticated = true
  }
}

// ========== API 调用（带认证） ==========

async function apiGet(path) {
  const headers = {}
  if (_isAuthenticated) {
    headers['Authorization'] = `Bearer ${getAuthToken()}`
  }
  const res = await fetch(`${API_BASE}${path}`, { headers })
  return res.json()
}

async function apiPost(path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (_isAuthenticated) {
    headers['Authorization'] = `Bearer ${getAuthToken()}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const data = await res.json()
  // 如果返回认证错误，标记为未认证
  if (data.error === '需要认证' || data.error === '认证失败') {
    logout()
  }
  return data
}

async function apiDelete(path) {
  const headers = {}
  if (_isAuthenticated) {
    headers['Authorization'] = `Bearer ${getAuthToken()}`
  }
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers })
  const data = await res.json()
  if (data.error === '需要认证' || data.error === '认证失败') {
    logout()
  }
  return data
}

async function apiPut(path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (_isAuthenticated) {
    headers['Authorization'] = `Bearer ${getAuthToken()}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (data.error === '需要认证' || data.error === '认证失败') {
    logout()
  }
  return data
}

// ========== Workers ==========

export function getWorkers() {
  return _workers
}

export async function fetchWorkers() {
  if (USE_CLOUD) {
    _workers = await apiGet('/api/workers')
  } else {
    const w = localStorage.getItem(KEYS.WORKERS)
    _workers = w ? JSON.parse(w) : []
  }
  notify()
}

export async function saveWorker(worker) {
  if (USE_CLOUD) {
    await apiPost('/api/workers', worker)
    await fetchWorkers()
  } else {
    const idx = _workers.findIndex(w => w.id === worker.id)
    if (idx > -1) _workers[idx] = worker
    else _workers.push(worker)
    localStorage.setItem(KEYS.WORKERS, JSON.stringify(_workers))
    notify()
  }
}

export async function deleteWorker(id) {
  if (USE_CLOUD) {
    await apiDelete(`/api/workers/${id}`)
    await fetchWorkers()
  } else {
    _workers = _workers.filter(w => w.id !== id)
    localStorage.setItem(KEYS.WORKERS, JSON.stringify(_workers))
    notify()
  }
}

// ========== Contents ==========

export function getContents() {
  return _contents
}

export async function fetchContents() {
  if (USE_CLOUD) {
    _contents = await apiGet('/api/contents')
  } else {
    const c = localStorage.getItem(KEYS.CONTENTS)
    _contents = c ? JSON.parse(c) : defaultContents
  }
  notify()
}

export async function addContent(content) {
  if (USE_CLOUD) {
    await apiPost('/api/contents', { content })
    await fetchContents()
  } else {
    if (!_contents.includes(content)) {
      _contents.push(content)
      localStorage.setItem(KEYS.CONTENTS, JSON.stringify(_contents))
      notify()
    }
  }
}

export async function deleteContent(content) {
  if (USE_CLOUD) {
    await apiDelete(`/api/contents/${encodeURIComponent(content)}`)
    await fetchContents()
  } else {
    _contents = _contents.filter(c => c !== content)
    localStorage.setItem(KEYS.CONTENTS, JSON.stringify(_contents))
    notify()
  }
}

// ========== Records ==========

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
  if (USE_CLOUD) {
    const params = new URLSearchParams()
    if (filters.workerId) params.set('workerId', filters.workerId)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    _records = await apiGet(`/api/records?${params}`)
  } else {
    const r = localStorage.getItem(KEYS.RECORDS)
    _records = r ? JSON.parse(r) : []
  }
  notify()
}

export async function addRecord(record) {
  if (USE_CLOUD) {
    await apiPost('/api/records', record)
    await fetchRecords()
  } else {
    _records.push(record)
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(_records))
    notify()
  }
}

export async function updateRecord(record) {
  if (USE_CLOUD) {
    await apiPost('/api/records', record)
    await fetchRecords()
  } else {
    const idx = _records.findIndex(r => r.id === record.id)
    if (idx > -1) {
      _records[idx] = record
      localStorage.setItem(KEYS.RECORDS, JSON.stringify(_records))
      notify()
    }
  }
}

export async function deleteRecord(id) {
  if (USE_CLOUD) {
    await apiDelete(`/api/records/${id}`)
    await fetchRecords()
  } else {
    _records = _records.filter(r => r.id !== id)
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(_records))
    notify()
  }
}

// ========== Settings ==========

export function getSettings() {
  return _settings
}

export async function fetchSettings() {
  if (USE_CLOUD) {
    _settings = await apiGet('/api/settings')
  } else {
    const s = localStorage.getItem(KEYS.SETTINGS)
    _settings = s ? JSON.parse(s) : { defaultHourlyRate: 25 }
  }
  notify()
}

export async function saveSettings(settings) {
  if (USE_CLOUD) {
    await apiPut('/api/settings', settings)
    await fetchSettings()
  } else {
    _settings = settings
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(_settings))
    notify()
  }
}

// ========== Export / Import ==========

export async function exportData() {
  if (USE_CLOUD) {
    return await apiGet('/api/export')
  }
  return {
    version: '1.0',
    exportedAt: Date.now(),
    workers: _workers,
    records: _records,
    contents: _contents,
    settings: _settings
  }
}

export async function importData(data) {
  if (USE_CLOUD) {
    await apiPost('/api/import', data)
  } else {
    if (data.workers) { _workers = data.workers; localStorage.setItem(KEYS.WORKERS, JSON.stringify(_workers)) }
    if (data.records) { _records = data.records; localStorage.setItem(KEYS.RECORDS, JSON.stringify(_records)) }
    if (data.contents) { _contents = data.contents; localStorage.setItem(KEYS.CONTENTS, JSON.stringify(_contents)) }
    if (data.settings) { _settings = data.settings; localStorage.setItem(KEYS.SETTINGS, JSON.stringify(_settings)) }
  }
  await fetchAll()
}

export async function clearAll() {
  if (USE_CLOUD) {
    await apiPost('/api/clear', { confirm: 'CONFIRM_CLEAR_ALL_DATA' })
  } else {
    _workers = []; _records = []; _contents = defaultContents; _settings = { defaultHourlyRate: 25 }
    localStorage.setItem(KEYS.WORKERS, JSON.stringify(_workers))
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(_records))
    localStorage.setItem(KEYS.CONTENTS, JSON.stringify(_contents))
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(_settings))
  }
  await fetchAll()
}

export async function loadMockData() {
  if (USE_CLOUD) {
    await apiPost('/api/mock', {})
    await fetchAll()
  } else {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    _workers = [
      { id: 'w1', name: '张三', hourlyRate: 25, createdAt: now - 30 * dayMs },
      { id: 'w2', name: '李四', hourlyRate: 20, createdAt: now - 25 * dayMs },
      { id: 'w3', name: '王五', hourlyRate: 30, createdAt: now - 20 * dayMs },
      { id: 'w4', name: '赵六', hourlyRate: 22, createdAt: now - 15 * dayMs },
    ]

    _records = []
    const contents = ['剥辣条', '打料', '晾晒', '包装', '搬运']

    for (let d = 0; d < 30; d++) {
      const date = new Date(now - d * dayMs)
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0) continue

      _workers.forEach((w, wIdx) => {
        if (Math.random() > 0.8) return

        const morningStart = new Date(date)
        morningStart.setHours(8 + Math.floor(Math.random() * 1), Math.floor(Math.random() * 30), 0)
        const morningEnd = new Date(morningStart)
        morningEnd.setHours(12, Math.floor(Math.random() * 30), 0)

        _records.push({
          id: `r${d}-${wIdx}-1`,
          workerId: w.id,
          workerName: w.name,
          content: contents[Math.floor(Math.random() * contents.length)],
          startTime: morningStart.getTime(),
          endTime: morningEnd.getTime(),
          createdAt: morningStart.getTime()
        })

        if (Math.random() > 0.7) return

        const afternoonStart = new Date(date)
        afternoonStart.setHours(13 + Math.floor(Math.random() * 1), Math.floor(Math.random() * 30), 0)
        const afternoonEnd = new Date(afternoonStart)
        afternoonEnd.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0)

        _records.push({
          id: `r${d}-${wIdx}-2`,
          workerId: w.id,
          workerName: w.name,
          content: contents[Math.floor(Math.random() * contents.length)],
          startTime: afternoonStart.getTime(),
          endTime: afternoonEnd.getTime(),
          createdAt: afternoonStart.getTime()
        })
      })
    }

    localStorage.setItem(KEYS.WORKERS, JSON.stringify(_workers))
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(_records))
    notify()
  }
}

// ========== 初始化与订阅 ==========

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// 初始化加载所有数据
export async function fetchAll() {
  await Promise.all([
    fetchWorkers(),
    fetchRecords(),
    fetchContents(),
    fetchSettings()
  ])
}

// 非云端模式时从 localStorage 加载
function loadFromStorage() {
  if (!USE_CLOUD) {
    const w = localStorage.getItem(KEYS.WORKERS)
    _workers = w ? JSON.parse(w) : []

    const r = localStorage.getItem(KEYS.RECORDS)
    _records = r ? JSON.parse(r) : []

    const c = localStorage.getItem(KEYS.CONTENTS)
    _contents = c ? JSON.parse(c) : defaultContents

    const s = localStorage.getItem(KEYS.SETTINGS)
    _settings = s ? JSON.parse(s) : { defaultHourlyRate: 25 }
  }
}

// 自动初始化
loadFromStorage()
initAuth()