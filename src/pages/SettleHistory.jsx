import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAuthToken } from '../utils/storage'

const API_BASE = ''

function SettleHistory() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [settlements, setSettlements] = useState([])
  const [workers, setWorkers] = useState([])
  const [selectedWorker, setSelectedWorker] = useState('all')
  const [currentReceipt, setCurrentReceipt] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [summary, setSummary] = useState({ total: 0, count: 0 })

  useEffect(() => {
    fetchWorkers()
    fetchSettlements()
  }, [selectedWorker])

  const fetchWorkers = async () => {
    const res = await fetch(`${API_BASE}/api/workers`)
    const data = await res.json()
    setWorkers(data)
  }

  const fetchSettlements = async () => {
    const url = selectedWorker === 'all' 
      ? `${API_BASE}/api/settlements`
      : `${API_BASE}/api/settlements?workerId=${selectedWorker}`
    const res = await fetch(url)
    const data = await res.json()
    setSettlements(data)
    
    // 计算汇总
    const total = data.reduce((sum, s) => sum + s.amount, 0)
    setSummary({ total, count: data.length })
  }

  const viewReceipt = async (settlementId) => {
    const res = await fetch(`${API_BASE}/api/settlements/${settlementId}`)
    const data = await res.json()
    setCurrentReceipt(generateReceipt(data))
    setShowReceipt(true)
  }

  const undoSettlement = async (settlementId) => {
    if (!confirm('确定要撤销这条结算记录吗？')) return
    
    await fetch(`${API_BASE}/api/settlements/${settlementId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
    fetchSettlements()
  }

  const copyReceipt = () => {
    navigator.clipboard.writeText(currentReceipt)
    alert('已复制到剪贴板')
  }

  const generateReceipt = (settlement) => {
    const lines = []
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push('      天天幸运')
    lines.push('     工资结算单')
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`工人：${settlement.workerName}`)
    
    if (settlement.records && settlement.records.length > 0) {
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
          const s = new Date(r.startTime), e = new Date(r.endTime)
          const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
          lines.push(`  ${fmt(s)}-${fmt(e)} ${r.content || '未填写'} ${dur.toFixed(1)}h`)
        })
      })
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`合计工时：${settlement.hours.toFixed(1)}h`)
    lines.push(`时薪：¥${settlement.rate}/h`)
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`应发工资：¥${settlement.amount.toFixed(1)}`)
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push(`结算时间：${new Date(settlement.createdAt).toLocaleString('zh-CN')}`)
    if (settlement.note) lines.push(`备注：${settlement.note}`)
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    
    return lines.join('\n')
  }

  const formatDateCN = (ts) => {
    const d = new Date(ts)
    return `${d.getMonth()+1}月${d.getDate()}日`
  }

  // 按月份分组
  const groupedByMonth = settlements.reduce((acc, s) => {
    const d = new Date(s.createdAt)
    const monthKey = `${d.getFullYear()}年${d.getMonth()+1}月`
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(s)
    return acc
  }, {})

  return (
    <div className="page-content">
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/settle')}>←</button>
        <h1 className="topbar-title">结算历史</h1>
      </div>

      {/* 统计汇总 */}
      <section className="card-section">
        <div className="history-summary">
          <div className="summary-stat">
            <div className="stat-value">¥{summary.total.toFixed(1)}</div>
            <div className="stat-label">已结算总额</div>
          </div>
          <div className="summary-stat">
            <div className="stat-value">{summary.count}</div>
            <div className="stat-label">结算笔数</div>
          </div>
        </div>
      </section>

      {/* 筛选 */}
      <section className="card-section">
        <div className="worker-tabs">
          <button 
            className={`worker-tab ${selectedWorker === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedWorker('all')}
          >
            全部
          </button>
          {workers.map(w => (
            <button
              key={w.id}
              className={`worker-tab ${selectedWorker === w.id ? 'active' : ''}`}
              onClick={() => setSelectedWorker(w.id)}
            >
              {w.name}
            </button>
          ))}
        </div>
      </section>

      {/* 按月份分组显示 */}
      {Object.entries(groupedByMonth).map(([month, items]) => (
        <section className="card-section" key={month}>
          <h2 className="section-title">{month}</h2>
          {items.map(s => (
            <div key={s.id} className="history-item">
              <div className="history-header">
                <div className="history-worker">
                  <div className="worker-avatar-sm" style={{ background: getAvatarColor(s.workerName) }}>
                    {s.workerName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="worker-name">{s.workerName}</div>
                    <div className="history-date">{formatDateCN(s.startDate)} - {formatDateCN(s.endDate)}</div>
                  </div>
                </div>
                <div className="history-amount">¥{s.amount.toFixed(1)}</div>
              </div>
              <div className="history-meta">
                <span>{s.hours.toFixed(1)}h</span>
                <span className="history-time">{new Date(s.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              {s.note && <div className="history-note">备注：{s.note}</div>}
              <div className="history-actions">
                <button className="view-btn" onClick={() => viewReceipt(s.id)}>查看单据</button>
                <button className="undo-btn" onClick={() => undoSettlement(s.id)}>撤销</button>
              </div>
            </div>
          ))}
        </section>
      ))}

      {settlements.length === 0 && (
        <section className="card-section empty">
          <p>暂无结算记录</p>
        </section>
      )}

      {/* 单据弹窗 */}
      {showReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">结算单据</h3>
            <div className="receipt-content">{currentReceipt}</div>
            <div className="modal-actions">
              <button className="btn-copy" onClick={copyReceipt}>复制</button>
              <button className="btn-confirm" onClick={() => setShowReceipt(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getAvatarColor(name) {
  const colors = ['#FFB5BA', '#B5DEFF', '#C5F0AD', '#FFE5B4', '#E0BBE4', '#B5EAD7']
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return colors[idx]
}

export default SettleHistory