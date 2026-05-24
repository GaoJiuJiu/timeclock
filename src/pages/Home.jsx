import React, { useState, useEffect, useMemo } from 'react'
import { getWorkers, getContents, getRecords, addRecord, deleteRecord, subscribe } from '../utils/storage'
import { formatTime, getDateLabel, getAvatarColor, getInitial, generateId } from '../utils/format'

function Home() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workers, setWorkers] = useState([])
  const [contents, setContents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    workerId: '',
    date: '',
    startTime: '',
    endTime: '',
    content: '',
    customContent: '',
    note: ''
  })

  useEffect(() => {
    setWorkers(getWorkers())
    setContents(getContents())
    const unsubscribe = subscribe(() => {
      setWorkers(getWorkers())
      setContents(getContents())
    })
    return unsubscribe
  }, [])

  const dateLabel = useMemo(() => getDateLabel(currentDate.getTime()), [currentDate])

  const changeDate = (delta) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  const getTodayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const openAddModal = () => {
    setForm({ workerId: '', date: getTodayStr(), startTime: '', endTime: '', content: '', customContent: '', note: '' })
    setShowModal(true)
  }

  const openAddModalFor = (worker) => {
    setForm({ workerId: worker.id, date: getTodayStr(), startTime: '', endTime: '', content: '', customContent: '', note: '' })
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  const getDayRecords = (workerId) => getRecords({ workerId, date: currentDate })

  const getDayHours = (workerId) => {
    const records = getDayRecords(workerId)
    let totalMs = 0
    records.forEach(r => { if (r.endTime) totalMs += r.endTime - r.startTime })
    return totalMs / 1000 / 3600
  }

  const getDuration = (record) => {
    if (record.endTime) return ((record.endTime - record.startTime) / 1000 / 3600).toFixed(1)
    return '0.0'
  }

  const handleDeleteRecord = (id) => {
    if (window.confirm('确定删除这条记录吗？')) deleteRecord(id)
  }

  const handleSubmit = () => {
    if (!form.workerId) return alert('请选择工人')
    if (!form.date) return alert('请选择日期')
    if (!form.startTime) return alert('请填写开始时间')
    if (!form.endTime) return alert('请填写结束时间')

    const startTimestamp = new Date(`${form.date}T${form.startTime}`).getTime()
    const endTimestamp = new Date(`${form.date}T${form.endTime}`).getTime()

    if (endTimestamp <= startTimestamp) return alert('结束时间必须大于开始时间')

    const worker = workers.find(w => w.id === form.workerId)
    const content = form.customContent || form.content || '未填写'

    addRecord({
      id: generateId(),
      workerId: form.workerId,
      workerName: worker?.name || '',
      content,
      startTime: startTimestamp,
      endTime: endTimestamp,
      note: form.note,
      createdAt: Date.now()
    })
    alert('添加成功！')
    closeModal()
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <h1 className="topbar-title">厂里考勤</h1>
        <button className="topbar-btn" onClick={openAddModal}>＋</button>
      </div>

      <div className="date-bar">
        <div className="date-bar-left">{dateLabel}</div>
        <div className="date-bar-right">
          <button className="date-arrow" onClick={() => changeDate(-1)}>◀</button>
          <button className="date-arrow" onClick={goToday}>今</button>
          <button className="date-arrow" onClick={() => changeDate(1)}>▶</button>
        </div>
      </div>

      <div className="worker-list">
        {workers.map((worker, idx) => (
          <div key={worker.id} className="worker-card">
            <div className="worker-top">
              <div className="worker-name-row">
                <div className="worker-avatar" style={{ background: getAvatarColor(idx) }}>
                  {getInitial(worker.name)}
                </div>
                <span className="worker-name">{worker.name}</span>
              </div>
            </div>

            {getDayRecords(worker.id).length > 0 && (
              <div className="segments">
                {getDayRecords(worker.id).map(rec => (
                  <div key={rec.id} className="segment">
                    <span className="segment-time">
                      {formatTime(rec.startTime)} — {rec.endTime ? formatTime(rec.endTime) : '进行中'}
                    </span>
                    <span className="segment-content">{rec.content || '未填写'}</span>
                    <span className="segment-hours">{getDuration(rec)}h</span>
                    <button className="segment-delete" onClick={() => handleDeleteRecord(rec.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <button className="add-btn" onClick={() => openAddModalFor(worker)}>+ 添加工时</button>

            {getDayRecords(worker.id).length > 0 && (
              <div className="day-total">
                <span>合计</span>
                <span className="day-total-hours">{getDayHours(worker.id).toFixed(1)}h</span>
              </div>
            )}
          </div>
        ))}

        {workers.length === 0 && (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <div className="empty-text">还没有工人<br/>去「人员」页面添加吧</div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="overlay show" onClick={(e) => e.target.classList.contains('overlay') && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">添加工时记录</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">工人</label>
              <select className="form-input" value={form.workerId} onChange={e => setForm({ ...form, workerId: e.target.value })}>
                <option value="">请选择工人</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">日期</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">开始时间</label>
                <input type="time" className="form-input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">结束时间</label>
                <input type="time" className="form-input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">工作内容</label>
              <div className="content-tags">
                {contents.map(c => (
                  <span key={c} className={`content-tag ${form.content === c ? 'selected' : ''}`} onClick={() => setForm({ ...form, content: c, customContent: '' })}>
                    {c}
                  </span>
                ))}
              </div>
              <input className="form-input" placeholder="或输入其他内容..." value={form.customContent} onChange={e => setForm({ ...form, customContent: e.target.value, content: '' })} />
            </div>

            <div className="form-group">
              <label className="form-label">备注（可选）</label>
              <input className="form-input" placeholder="备注..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>

            <div className="modal-btns">
              <button className="modal-btn cancel" onClick={closeModal}>取消</button>
              <button className="modal-btn confirm" onClick={handleSubmit}>确认添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home