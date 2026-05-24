import React, { useState, useEffect } from 'react'
import { getWorkers, saveWorker, deleteWorker, getRecords, subscribe } from '../utils/storage'
import { getAvatarColor, getInitial, generateId } from '../utils/format'

function People() {
  const [workers, setWorkers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState(null)
  const [form, setForm] = useState({ name: '', hourlyRate: 25, phone: '' })

  useEffect(() => {
    setWorkers(getWorkers())
    const unsubscribe = subscribe(() => setWorkers(getWorkers()))
    return unsubscribe
  }, [])

  const openAddModal = () => {
    setEditingWorker(null)
    setForm({ name: '', hourlyRate: 25, phone: '' })
    setShowModal(true)
  }

  const openEditModal = (worker) => {
    setEditingWorker(worker)
    setForm({ name: worker.name, hourlyRate: worker.hourlyRate, phone: worker.phone || '' })
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  const handleSave = () => {
    if (!form.name.trim()) return alert('请输入姓名')
    if (!form.hourlyRate) return alert('请输入时薪')

    if (editingWorker) {
      saveWorker({ ...editingWorker, name: form.name.trim(), hourlyRate: form.hourlyRate, phone: form.phone })
    } else {
      saveWorker({ id: generateId(), name: form.name.trim(), hourlyRate: form.hourlyRate, phone: form.phone, createdAt: Date.now() })
    }
    closeModal()
  }

  const handleDelete = (worker) => {
    if (window.confirm(`确定删除 ${worker.name} 吗？相关考勤记录不会删除。`)) {
      deleteWorker(worker.id)
    }
  }

  const getWorkerMonthDays = (workerId) => {
    const now = new Date()
    const records = getRecords({
      workerId,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
    })
    const days = new Set(records.map(r => new Date(r.startTime).toDateString()))
    return days.size
  }

  const getWorkerMonthHours = (workerId) => {
    const now = new Date()
    const records = getRecords({
      workerId,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
    })
    let totalMs = 0
    records.forEach(r => { if (r.endTime) totalMs += r.endTime - r.startTime })
    return totalMs / 1000 / 3600
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <h1 className="topbar-title">人员管理</h1>
        <button className="topbar-btn" onClick={openAddModal}>＋</button>
      </div>

      {workers.map((worker, idx) => (
        <div key={worker.id} className="person-card">
          <div className="person-avatar-lg" style={{ background: getAvatarColor(idx) }}>
            {getInitial(worker.name)}
          </div>
          <div className="person-info">
            <div className="person-name-lg">{worker.name}</div>
            <div className="person-meta">
              时薪 ¥{worker.hourlyRate} · 本月 {getWorkerMonthDays(worker.id)}天 · {getWorkerMonthHours(worker.id).toFixed(1)}h
            </div>
          </div>
          <div className="person-actions-row">
            <button className="person-act-btn" onClick={() => openEditModal(worker)}>✏️</button>
            <button className="person-act-btn" onClick={() => handleDelete(worker)}>🗑</button>
          </div>
        </div>
      ))}

      {workers.length === 0 && (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <div className="empty-text">还没有工人，点击右上角添加</div>
        </div>
      )}

      {workers.length > 0 && <button className="export-btn" onClick={openAddModal}>+ 添加工人</button>}

      {showModal && (
        <div className="overlay show" onClick={(e) => e.target.classList.contains('overlay') && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingWorker ? '编辑工人' : '添加工人'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">姓名</label>
              <input className="form-input" placeholder="输入姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">时薪（元/小时）</label>
              <input type="number" className="form-input" placeholder="25" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: Number(e.target.value) })} />
            </div>

            <div className="form-group">
              <label className="form-label">手机号（可选）</label>
              <input type="tel" className="form-input" placeholder="138xxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div className="modal-btns">
              <button className="modal-btn cancel" onClick={closeModal}>取消</button>
              <button className="modal-btn confirm" onClick={handleSave}>{editingWorker ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default People