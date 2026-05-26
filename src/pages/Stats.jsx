import { useState, useEffect, useMemo } from 'react'
import { getWorkers, getRecords, subscribe, fetchAll, getSettlementStatus, setSettlementStatus, getPeriodKey } from '../utils/storage'
import { getWeekRange, getMonthRange } from '../utils/format'
import { exportSalaryExcel } from '../utils/excel'

function Stats() {
  const [workers, setWorkers] = useState([])
  const [period, setPeriod] = useState('month')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [settlementStatus, setSettlementStatusState] = useState({ settled: false, settledAt: null })

  useEffect(() => {
    fetchAll()
    const now = new Date()
    setCustomStartDate(formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)))
    setCustomEndDate(formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
    return subscribe(() => setWorkers(getWorkers()))
  }, [])

  const formatDateInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const setPeriodWithInit = (p) => {
    setPeriod(p)
    setPeriodOffset(0)
    if (p === 'custom') {
      const now = new Date()
      setCustomStartDate(formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)))
      setCustomEndDate(formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
    }
  }

  const dateRange = useMemo(() => {
    if (period === 'custom') {
      return {
        start: new Date(customStartDate + 'T00:00:00'),
        end: new Date(customEndDate + 'T23:59:59')
      }
    }
    const now = new Date()
    if (period === 'week') {
      const range = getWeekRange(now)
      range.start.setDate(range.start.getDate() + periodOffset * 7)
      range.end.setDate(range.end.getDate() + periodOffset * 7)
      return range
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1)
      return getMonthRange(d)
    }
  }, [period, periodOffset, customStartDate, customEndDate])

  // 当 dateRange 变化时，获取结算状态
  useEffect(() => {
    const periodKey = getPeriodKey(dateRange)
    const status = getSettlementStatus(periodKey)
    setSettlementStatusState(status)
  }, [dateRange])

  // 切换结算状态
  const toggleSettlement = async () => {
    const periodKey = getPeriodKey(dateRange)
    const newStatus = !settlementStatus.settled
    await setSettlementStatus(periodKey, newStatus)
    setSettlementStatusState({ settled: newStatus, settledAt: newStatus ? Date.now() : null })
  }

  const periodLabel = useMemo(() => {
    if (period === 'custom') {
      const s = new Date(customStartDate)
      const e = new Date(customEndDate)
      return `${s.getMonth() + 1}月${s.getDate()}日 — ${e.getMonth() + 1}月${e.getDate()}日`
    }
    const s = dateRange.start
    const e = dateRange.end
    if (period === 'week') return `${s.getMonth() + 1}月${s.getDate()}日 — ${e.getMonth() + 1}月${e.getDate()}日`
    return `${s.getFullYear()}年${s.getMonth() + 1}月`
  }, [period, dateRange, customStartDate, customEndDate])

  const tableData = useMemo(() => {
    return workers.map(w => {
      const records = getRecords({
        workerId: w.id,
        startDate: dateRange.start.getTime(),
        endDate: dateRange.end.getTime()
      })

      let totalMs = 0
      const days = new Set()

      records.forEach(r => {
        const duration = r.endTime ? r.endTime - r.startTime : 0
        totalMs += duration
        days.add(new Date(r.startTime).toDateString())
      })

      const hours = totalMs / 1000 / 3600
      const payType = w.payType || 'hourly'
      const rate = w.rate || w.hourlyRate || settings.defaultHourlyRate || 10
      
      // 按天计费用天数，按时薪用工时
      const amount = payType === 'daily' ? days.size * rate : hours * rate

      return {
        workerId: w.id,
        name: w.name,
        payType,
        rate,
        days: days.size,
        hours,
        amount
      }
    })
  }, [workers, dateRange])

  const totalHours = useMemo(() => tableData.reduce((sum, r) => sum + r.hours, 0), [tableData])
  const totalAmount = useMemo(() => tableData.reduce((sum, r) => sum + r.amount, 0), [tableData])

  const shiftPeriod = (delta) => setPeriodOffset(prev => prev + delta)
  const resetPeriod = () => {
    setPeriodOffset(0)
    if (period === 'custom') {
      const now = new Date()
      setCustomStartDate(formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)))
      setCustomEndDate(formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
    }
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <h1 className="topbar-title">工资统计</h1>
      </div>

      <div className="stat-tabs">
        <button className={`stat-tab ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriodWithInit('week')}>周</button>
        <button className={`stat-tab ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriodWithInit('month')}>月</button>
        <button className={`stat-tab ${period === 'custom' ? 'active' : ''}`} onClick={() => setPeriodWithInit('custom')}>自定义</button>
      </div>

      {period === 'custom' && (
        <div className="date-range-picker">
          <div className="date-range-item">
            <label>开始日期</label>
            <input type="date" className="form-input" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
          </div>
          <div className="date-range-item">
            <label>结束日期</label>
            <input type="date" className="form-input" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
          </div>
        </div>
      )}

      {period !== 'custom' && (
        <div className="date-bar" style={{ marginBottom: 16 }}>
          <div className="date-bar-left">{periodLabel}</div>
          <div className="date-bar-right">
            <button className="date-arrow" onClick={() => shiftPeriod(-1)}>◀</button>
            <button className="date-arrow" onClick={resetPeriod}>今</button>
            <button className="date-arrow" onClick={() => shiftPeriod(1)}>▶</button>
          </div>
        </div>
      )}

      <div className="stat-summary">
        <div className="stat-box">
          <div className="stat-label">{periodLabel}总工时</div>
          <div className="stat-value">{totalHours.toFixed(1)}<span className="unit">h</span></div>
        </div>
        <div className="stat-box">
          <div className="stat-label">{periodLabel}工资总额</div>
          <div className="stat-value">¥{totalAmount.toFixed(0)}</div>
        </div>
      </div>

      <div className="stat-table">
        <div className="stat-table-header">
          <span>姓名</span>
          <span>出勤</span>
          <span>工时</span>
          <span>应发工资</span>
        </div>
        {tableData.map(row => (
          <div key={row.workerId} className="stat-table-row">
            <span className="stat-table-name">{row.name}</span>
            <span>{row.days}天</span>
            <span className="stat-table-hours">{row.hours.toFixed(1)}h</span>
            <span className="stat-table-amount">¥{row.amount.toFixed(0)}</span>
          </div>
        ))}
        {tableData.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>暂无数据</div>}
      </div>

      {/* 结算状态区域 */}
      <div className="settlement-area">
        <div className="settlement-status">
          {settlementStatus.settled ? (
            <>
              <span className="settlement-badge settled">✓ 已结</span>
              {settlementStatus.settledAt && (
                <span className="settlement-time">
                  {new Date(settlementStatus.settledAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </>
          ) : (
            <span className="settlement-badge pending">待结算</span>
          )}
        </div>
        <button 
          className={`settlement-btn ${settlementStatus.settled ? 'undo' : ''}`}
          onClick={toggleSettlement}
        >
          {settlementStatus.settled ? '撤销结算' : '标记已结'}
        </button>
      </div>

      <button className="export-btn" onClick={() => exportSalaryExcel(dateRange, periodLabel)}>📥 导出Excel工资表</button>
    </div>
  )
}

export default Stats