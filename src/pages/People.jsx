import { useState, useEffect } from 'react'
import { getWorkers, saveWorker, deleteWorker, getRecords, subscribe, fetchAll } from '../utils/storage'
import { getAvatarColor, getInitial, generateId } from '../utils/format'
import Modal from '../components/Modal'

function People() {
  const [workers, setWorkers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState(null)
  const [form, setForm] = useState({ name: '', hourlyRate: 25, phone: '' })

  useEffect(() => {
    fetchAll()
    return subscribe(() => setWorkers(getWorkers()))
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

  const handleSave = async () => {
    if (!form.name.trim()) return alert('请输入姓名')
    if (!form.hourlyRate) return alert('请输入时薪')

    if (editingWorker) {
      await saveWorker({ ...editingWorker, name: form.name.trim(), hourlyRate: form.hourlyRate, phone: form.phone })
    } else {
      await saveWorker({ id: generateId(), name: form.name.trim(), hourlyRate: form.hourlyRate, phone: form.phone, createdAt: Date.now() })
    }
    setShowModal(false)
  }

  const handleDelete = async (worker) => {
    if (window.confirm(`确定删除 ${worker.name} 吗？相关考勤记录不会删除。`)) {
      await deleteWorker(worker.id)
    }
  }

  // 计算 本月统计，缓存优化
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

  const statsMap = {}
  workers.forEach((w) => {
    const records = getRecords({ workerId: w.id, startDate: monthStart, endDate: monthEnd })
    let hours = 0
    const days = new Set()
    records.forEach(r => {
      if (r.endTime) {
        hours += (r.endTime - r.startTime) / 1000 / 3600
        days.add(new Date(r.startTime).toDateString())
      }
    })
    statsMap[w.id] = { days: days.size, hours }
  })

  const updateForm = (patch) => setForm(prev => ({ ...prev, ...patch }))

  return (
    <div className="page-content">
      <div className="topbar">
        <h1 className="topbar-title">人员管理</h1>
        <button className="topbar-btn" onClick={openAddModal}>＋</button>
      </div>

      {workers.map((worker, idx) => {
        const stats = statsMap[worker.id] || { days: 0, hours: 0 }

        return (
          <div key={worker.id} className="person-card">
            <div className="person-avatar-lg" style={{ background: getAvatarColor(idx) }}>
              {getInitial(worker.name)}
            </div>
            <div className="person-info">
              <div className="person-name-lg">{worker.name}</div>
              <div className="person-meta">
                时薪 ¥{worker.hourlyRate} · 本月 {stats.days}天 · {stats.hours.toFixed(1)}h
              </div>
            </div>
            <div className="person-actions-row">
              <button className="person-act-btn" onClick={() => openEditModal(worker)}>✏️</button>
              <button className="person-act-btn" onClick={() => handleDelete(worker)}>🗑</button>
            </div>
          </div>
        )
      })}

      {workers.length === 0 && (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <div className="empty-text">还没有工人，点击右上角添加</div>
        </div>
      )}

      {workers.length > 0 && <button className="export-btn" onClick={openAddModal}>+ 添加工人</button>}

      <Modal show={showModal} onClose={() => setShowModal(false)} title={editingWorker ? '编辑工人' : '添加工人'}>
        <div className="form-group">
          <label className="form-label">姓名</label>
          <input className="form-input" placeholder="输入姓名" value={form.name} onChange={e => updateForm({ name: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">时薪（元/小时）</label>
          <input type="number" className="form-input" placeholder="25" value={form.hourlyRate} onChange={e => updateForm({ hourlyRate: Number(e.target.value) })} />
        </div>

        <div className="form-group">
          <label className="form-label">手机号（可选）</label>
          <input type="tel" className="form-input" placeholder="138xxxx" value={form.phone} onChange={e => updateForm({ phone: e.target.value })} />
        </div>

        <div className="modal-btns">
          <button className="modal-btn cancel" onClick={() => setShowModal(false)}>取消</button>
          <button className="modal-btn confirm" onClick={handleSave}>{editingWorker ? '保存' : '添加'}</button>
        </div>
      </Modal>
    </div>
  )
}

export default People