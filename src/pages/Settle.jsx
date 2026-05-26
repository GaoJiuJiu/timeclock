import { useState, useEffect } from 'react'
import { getWorkers, getAuthToken } from '../utils/storage'
import { useNavigate } from 'react-router-dom'

const API_BASE = ''

function Settle() {
  const navigate = useNavigate()
  const [workers, setWorkers] = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [unsettledDays, setUnsettledDays] = useState([])
  const [settlements, setSettlements] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('settle')
  const [selectedDays, setSelectedDays] = useState([])
  const [note, setNote] = useState('')
  const [currentReceipt, setCurrentReceipt] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchWorkers()
  }, [])

  useEffect(() => {
    if (selectedWorker) {
      fetchUnsettledDays(selectedWorker.id)
      fetchSettlements(selectedWorker.id)
    }
  }, [selectedWorker])

  const fetchWorkers = async () => {
    const res = await fetch(`${API_BASE}/api/workers`)
    const data = await res.json()
    setWorkers(data)
    if (data.length > 0) {
      setSelectedWorker(data[0])
    }
  }

  const fetchUnsettledDays = async (workerId) => {
    const res = await fetch(`${API_BASE}/api/settlements/unsettled/${workerId}`)
    const data = await res.json()
    setUnsettledDays(data)
  }

  const fetchSettlements = async (workerId) => {
    const res = await fetch(`${API_BASE}/api/settlements?workerId=${workerId}`)
    const data = await res.json()
    setSettlements(data)
  }

  // 计算未结汇总
  const unsettledSummary = unsettledDays.reduce((acc, day) => {
    acc.days += 1
    acc.hours += day.hours
    acc.amount += day.hours * (selectedWorker?.rate || 10)
    return acc
  }, { days: 0, hours: 0, amount: 0 })

  // 打开结算弹窗
  const openSettleModal = (days) => {
    setSelectedDays(days)
    setNote('')
    setModalType('settle')
    setShowModal(true)
  }

  // 执行结算
  const doSettle = async () => {
    if (selectedDays.length === 0) return
    
    setLoading(true)
    const startDate = selectedDays[selectedDays.length - 1].date + 'T00:00:00'
    const endDate = selectedDays[0].date + 'T23:59:59'
    
    const res = await fetch(`${API_BASE}/api/settlements`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        workerId: selectedWorker.id,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        note
      })
    })
    
    const data = await res.json()
    setLoading(false)
    
    if (data.error) {
      alert(data.error)
      return
    }
    
    // 生成单据
    setCurrentReceipt(generateReceipt(data))
    setShowModal(false)
    setModalType('receipt')
    setShowModal(true)
    
    // 刷新数据
    fetchUnsettledDays(selectedWorker.id)
    fetchSettlements(selectedWorker.id)
  }

  // 生成单据文本
  const generateReceipt = (settlement) => {
    const lines = []
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push('      天天幸运')
    lines.push('     工资结算单')
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`工人：${settlement.workerName}`)
    
    if (settlement.records && settlement.records.length > 0) {
      // 按日期分组显示
      const grouped = {}
      settlement.records.forEach(r => {
        const d = new Date(r.startTime)
        const dateKey = `${d.getMonth()+1}月${d.getDate()}日`
        if (!grouped[dateKey]) grouped[dateKey] = []
        grouped[dateKey].push(r)
      })
      
      Object.entries(grouped).forEach(([date, records]) => {
        lines.push(`【${date}】`)
        records.forEach(r => {
          const dur = r.endTime ? (r.endTime - r.startTime) / 3600000 : 0
          lines.push(`  ${formatTimeRange(r.startTime, r.endTime)} ${r.content || '未填写'} ${dur.toFixed(1)}h`)
        })
      })
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`合计工时：${settlement.hours.toFixed(1)}h`)
    const payType = settlement.payType || 'hourly'
    if (payType === 'daily') {
      lines.push(`日薪：¥${settlement.rate}/天`)
    } else {
      lines.push(`时薪：¥${settlement.rate}/h`)
    }
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`应发工资：¥${settlement.amount.toFixed(1)}`)
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`结算时间：${new Date(settlement.createdAt).toLocaleString('zh-CN')}`)
    if (settlement.note) lines.push(`备注：${settlement.note}`)
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    
    return lines.join('\n')
  }

  // 查看历史单据
  const viewReceipt = async (settlementId) => {
    const res = await fetch(`${API_BASE}/api/settlements/${settlementId}`)
    const data = await res.json()
    setCurrentReceipt(generateReceipt(data))
    setModalType('receipt')
    setShowModal(true)
  }

  // 撤销结算
  const undoSettlement = async (settlementId) => {
    if (!confirm('确定要撤销这条结算记录吗？')) return
    
    await fetch(`${API_BASE}/api/settlements/${settlementId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
    fetchSettlements(selectedWorker.id)
    fetchUnsettledDays(selectedWorker.id)
  }

  // 复制单据
  const copyReceipt = () => {
    navigator.clipboard.writeText(currentReceipt)
    alert('已复制到剪贴板')
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <h1 className="topbar-title">工资结算</h1>
      </div>

      {/* 工人选择 */}
      <section className="card-section">
        <div className="worker-tabs">
          {workers.map(w => (
            <button
              key={w.id}
              className={`worker-tab ${selectedWorker?.id === w.id ? 'active' : ''}`}
              onClick={() => setSelectedWorker(w)}
            >
              {w.name}
            </button>
          ))}
        </div>
      </section>

      {selectedWorker && (
        <>
          {/* 未结汇总 */}
          {unsettledDays.length > 0 && (
            <section className="card-section">
              <div className="summary-card unsettled">
                <div className="summary-header">
                  <span className="summary-label">待结算</span>
                  <span className="summary-badge">{unsettledSummary.days}天</span>
                </div>
                <div className="summary-body">
                  <div className="summary-row">
                    <span>工时：{unsettledSummary.hours.toFixed(1)}h</span>
                    <span className="summary-amount">¥{unsettledSummary.amount.toFixed(1)}</span>
                  </div>
                  <button className="settle-btn" onClick={() => openSettleModal(unsettledDays)}>
                    结算 →
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 未结明细 */}
          {unsettledDays.length > 0 && (
            <section className="card-section">
              <h2 className="section-title">未结明细</h2>
              {unsettledDays.map(day => (
                <div key={day.date} className="day-card unsettled">
                  <div className="day-header">
                    <div className="day-date">{formatDateCN(day.date)}</div>
                    <div className="day-stats">{day.hours.toFixed(1)}h · ¥{(day.hours * (selectedWorker.rate || 10)).toFixed(1)}</div>
                  </div>
                  <div className="day-records">
                    {day.records.map(r => (
                      <div key={r.id} className="record-mini">
                        <span>{formatTimeRange(r.startTime, r.endTime)}</span>
                        <span className="record-content">{r.content || '未填写'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="day-action">
                    <button className="settle-day-btn" onClick={() => openSettleModal([day])}>
                      结算此天
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 已结记录（只显示最近3条） */}
          {settlements.length > 0 && (
            <section className="card-section">
              <h2 className="section-title">已结记录</h2>
              {settlements.slice(0, 3).map(s => (
                <div key={s.id} className="day-card settled">
                  <div className="day-header">
                    <div className="day-date">{formatDateCN(s.startDate)} - {formatDateCN(s.endDate)}</div>
                    <div className="day-stats settled">✓ 已结</div>
                  </div>
                  <div className="day-records">
                    <div className="summary-row">
                      <span>工时：{s.hours.toFixed(1)}h</span>
                      <span className="summary-amount settled">¥{s.amount.toFixed(1)}</span>
                    </div>
                    {s.note && <div className="settlement-note">备注：{s.note}</div>}
                  </div>
                  <div className="day-action">
                    <button className="view-btn" onClick={() => viewReceipt(s.id)}>查看单据</button>
                    <button className="undo-btn" onClick={() => undoSettlement(s.id)}>撤销</button>
                  </div>
                </div>
              ))}
              
              {/* 查看全部历史按钮 */}
              {settlements.length > 3 && (
                <button className="view-all-btn" onClick={() => navigate('/settle-history')}>
                  查看全部结算记录 ({settlements.length}条) →
                </button>
              )}
            </section>
          )}

          {/* 无数据提示 */}
          {unsettledDays.length === 0 && settlements.length === 0 && (
            <section className="card-section empty">
              <p>暂无记录</p>
            </section>
          )}
        </>
      )}

      {/* 弹窗 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {modalType === 'settle' && (
              <>
                <h3 className="modal-title">结算 {selectedWorker?.name}</h3>
                
                <div className="modal-body">
                  <div className="settle-preview">
                    <div className="preview-label">将结算以下天数：</div>
                    {selectedDays.map(day => (
                      <div key={day.date} className="preview-row">
                        <span>{formatDateCN(day.date)}</span>
                        <span>{day.hours.toFixed(1)}h · ¥{(day.hours * (selectedWorker.rate || 10)).toFixed(1)}</span>
                      </div>
                    ))}
                    <div className="preview-total">
                      <span>合计</span>
                      <span className="total-amount">
                        {selectedDays.reduce((sum, d) => sum + d.hours, 0).toFixed(1)}h · 
                        ¥{(selectedDays.reduce((sum, d) => sum + d.hours * (selectedWorker.rate || 10), 0)).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="note-input">
                    <label>结算备注</label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="如：微信转账、现金"
                    />
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowModal(false)}>取消</button>
                  <button className="btn-confirm" onClick={doSettle} disabled={loading}>
                    {loading ? '结算中...' : '确认结算'}
                  </button>
                </div>
              </>
            )}
            
            {modalType === 'receipt' && (
              <>
                <h3 className="modal-title success">✓ 结算成功</h3>
                <div className="receipt-content">{currentReceipt}</div>
                <div className="modal-actions">
                  <button className="btn-copy" onClick={copyReceipt}>复制单据</button>
                  <button className="btn-confirm" onClick={() => setShowModal(false)}>完成</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 格式化日期为中文（支持日期字符串和时间戳）
function formatDateCN(input) {
  let d
  if (typeof input === 'number') {
    // 时间戳
    d = new Date(input)
  } else if (typeof input === 'string') {
    // 日期字符串 YYYY-MM-DD 或 YYYY/M/D
    if (input.includes('T')) {
      d = new Date(input)
    } else {
      // 处理 YYYY/M/D 格式
      const parts = input.split(/[/-]/)
      d = new Date(parts[0], parts[1] - 1, parts[2])
    }
  } else {
    d = new Date(input)
  }
  
  if (isNaN(d.getTime())) {
    return '日期错误'
  }
  
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
}

// 格式化时间范围
function formatTimeRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return `${fmt(s)}-${fmt(e)}`
}

export default Settle