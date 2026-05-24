const KEYS = {
  WORKERS: 'tc_workers',
  RECORDS: 'tc_records',
  CONTENTS: 'tc_contents',
  SETTINGS: 'tc_settings'
}

const defaultContents = ['剥辣条', '打料', '晾晒', '包装', '搬运']

let _workers = []
let _records = []
let _contents = defaultContents
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

function loadFromStorage() {
  const w = localStorage.getItem(KEYS.WORKERS)
  _workers = w ? JSON.parse(w) : []

  const r = localStorage.getItem(KEYS.RECORDS)
  _records = r ? JSON.parse(r) : []

  const c = localStorage.getItem(KEYS.CONTENTS)
  _contents = c ? JSON.parse(c) : defaultContents

  const s = localStorage.getItem(KEYS.SETTINGS)
  _settings = s ? JSON.parse(s) : { defaultHourlyRate: 25 }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

loadFromStorage()

// Workers
export function getWorkers() { return _workers }

export function saveWorker(worker) {
  const idx = _workers.findIndex(w => w.id === worker.id)
  if (idx > -1) _workers[idx] = worker
  else _workers.push(worker)
  save(KEYS.WORKERS, _workers)
  notify()
}

export function deleteWorker(id) {
  _workers = _workers.filter(w => w.id !== id)
  save(KEYS.WORKERS, _workers)
  notify()
}

// Contents
export function getContents() { return _contents }

export function addContent(content) {
  if (!_contents.includes(content)) {
    _contents.push(content)
    save(KEYS.CONTENTS, _contents)
    notify()
  }
}

export function deleteContent(content) {
  _contents = _contents.filter(c => c !== content)
  save(KEYS.CONTENTS, _contents)
  notify()
}

// Records
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

export function addRecord(record) {
  _records.push(record)
  save(KEYS.RECORDS, _records)
  notify()
}

export function updateRecord(record) {
  const idx = _records.findIndex(r => r.id === record.id)
  if (idx > -1) {
    _records[idx] = record
    save(KEYS.RECORDS, _records)
    notify()
  }
}

export function deleteRecord(id) {
  _records = _records.filter(r => r.id !== id)
  save(KEYS.RECORDS, _records)
  notify()
}

// Settings
export function getSettings() { return _settings }

export function saveSettings(settings) {
  _settings = settings
  save(KEYS.SETTINGS, _settings)
  notify()
}

// Export / Import
export function exportData() {
  return {
    version: '1.0',
    exportedAt: Date.now(),
    workers: _workers,
    records: _records,
    contents: _contents,
    settings: _settings
  }
}

export function importData(data) {
  if (data.workers) { _workers = data.workers; save(KEYS.WORKERS, _workers) }
  if (data.records) { _records = data.records; save(KEYS.RECORDS, _records) }
  if (data.contents) { _contents = data.contents; save(KEYS.CONTENTS, _contents) }
  if (data.settings) { _settings = data.settings; save(KEYS.SETTINGS, _settings) }
  notify()
}

export function clearAll() {
  _workers = []; _records = []; _contents = defaultContents; _settings = { defaultHourlyRate: 25 }
  save(KEYS.WORKERS, _workers)
  save(KEYS.RECORDS, _records)
  save(KEYS.CONTENTS, _contents)
  save(KEYS.SETTINGS, _settings)
  notify()
}