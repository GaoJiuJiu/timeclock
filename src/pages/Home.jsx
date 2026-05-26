import { useState, useEffect, useCallback } from 'react'
import { getWorkers, getContents, getRecords, addRecord, deleteRecord, subscribe, fetchAll } from '../utils/storage'
import { formatTime, getDateLabel, getAvatarColor, getInitial, generateId } from '../utils/format'
import Modal from '../components/Modal'

function Home() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workers, setWorkers] = useState([])
  const [contents, setContents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
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
    fetchAll()
    return subscribe(() => {
      setWorkers(getWorkers())
      setContents(getContents())
    })
  }, [])

  // toast
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const dateLabel = getDateLabel(currentDate.getTime())

  const changeDate = (delta) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  const toDateString = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const getCurrentTime = () => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  const openAddModal = () => {
    const now = new Date()
    const endTime = new Date(now.getTime() + 4 * 3600 * 1000)
    setForm({
      workerId: '',
      date: toDateString(currentDate),
      startTime: getCurrentTime(),
      endTime: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
      content: '',
      customContent: '',
      note: ''
    })
    setShowModal(true)
  }

  const openAddModalFor = (worker) => {
    const now = new Date()
    const endTime = new Date(now.getTime() + 4 * 3600 * 1000)
    setForm({
      workerId: worker.id,
      date: toDateString(currentDate),
      startTime: getCurrentTime(),
      endTime: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
      content: '',
      customContent: '',
      note: ''
    })
    setShowModal(true)
  }

  // 缓存每天每个工人的记录，避免重复计算
  const dayRecordsMap = {}
  const dayHoursMap = {}
  workers.forEach((w) => {
    const recs = getRecords({ workerId: w.id, date: currentDate })
    dayRecordsMap[w.id] = recs
    let totalMs = 0
    recs.forEach(r => { if (r.endTime) totalMs += r.endTime - r.startTime })
    dayHoursMap[w.id] = totalMs / 1000 / 3600
  })

  const getDuration = (record) => {
    if (record.endTime) return ((record.endTime - record.startTime) / 1000 / 3600).toFixed(1)
    return '0.0'
  }

  const handleDeleteRecord = async (id) => {
    if (window.confirm('确定删除这条记录吗？')) await deleteRecord(id)
  }

  const handleSubmit = async () => {
    if (!form.workerId) return alert('请选择工人')
    if (!form.date) return alert('请选择日期')
    if (!form.startTime) return alert('请填写开始时间')
    if (!form.endTime) return alert('请填写结束时间')

    const startTimestamp = new Date(`${form.date}T${form.startTime}`).getTime()
    const endTimestamp = new Date(`${form.date}T${form.endTime}`).getTime()

    if (endTimestamp <= startTimestamp) return alert('结束时间必须大于开始时间')

    const worker = workers.find(w => w.id === form.workerId)
    const content = form.customContent || form.content || '未填写'

    await addRecord({
      id: generateId(),
      workerId: form.workerId,
      workerName: worker?.name || '',
      content,
      startTime: startTimestamp,
      endTime: endTimestamp,
      note: form.note,
      createdAt: Date.now()
    })
    setShowModal(false)
    showToast('添加成功！')
  }

  const updateForm = (patch) => setForm(prev => ({ ...prev, ...patch }))

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
        {workers.map((worker, idx) => {
          const records = dayRecordsMap[worker.id] || []
          const hours = dayHoursMap[worker.id] || 0

          return (
            <div key={worker.id} className="worker-card">
              <div className="worker-top">
                <div className="worker-name-row">
                  <div className="worker-avatar" style={{ background: getAvatarColor(idx) }}>
                    {getInitial(worker.name)}
                  </div>
                  <span className="worker-name">{worker.name}</span>
                </div>
              </div>

              {records.length > 0 && (
                <div className="segments">
                  {records.map(rec => (
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

              {records.length > 0 && (
                <div className="day-total">
                  <span>合计</span>
                  <span className="day-total-hours">{hours.toFixed(1)}h</span>
                </div>
              )}
            </div>
          )
        })}

        {workers.length === 0 && (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <div className="empty-text">还没有工人<br/>去「人员」页面添加吧</div>
          </div>
        )}
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} title="添加工时记录">
        <div className="form-group">
          <label className="form-label">工人</label>
          <select className="form-input" value={form.workerId} onChange={e => updateForm({ workerId: e.target.value })}>
            <option value="">请选择工人</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">日期</label>
          <input type="date" className="form-input" value={form.date} onChange={e => updateForm({ date: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">开始时间</label>
            <input
              type="time"
              className="form-input"
              value={form.startTime}
              onChange={e => updateForm({ startTime: e.target.value })}
              onTouchStart={e => e.target.focus()}
              inputMode="numeric"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">结束时间</label>
            <input
              type="time"
              className="form-input"
              value={form.endTime}
              onChange={e => updateForm({ endTime: e.target.value })}
              onTouchStart={e => e.target.focus()}
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">工作内容</label>
          <div className="content-tags">
            {contents.map(c => (
              <span key={c} className={`content-tag ${form.content === c ? 'selected' : ''}`} onClick={() => updateForm({ content: c, customContent: '' })}>
                {c}
              </span>
            ))}
          </div>
          <input className="form-input" placeholder="或输入其他内容..." value={form.customContent} onChange={e => updateForm({ customContent: e.target.value, content: '' })} />
        </div>

        <div className="form-group">
          <label className="form-label">备注（可选）</label>
          <input className="form-input" placeholder="备注..." value={form.note} onChange={e => updateForm({ note: e.target.value })} />
        </div>

        <div className="modal-btns">
          <button className="modal-btn cancel" onClick={() => setShowModal(false)}>取消</button>
          <button className="modal-btn confirm" onClick={handleSubmit}>确认添加</button>
        </div>
      </Modal>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default Home