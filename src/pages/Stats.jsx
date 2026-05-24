import React, { useState, useEffect, useMemo } from 'react'
import { getWorkers, getRecords, subscribe } from '../utils/storage'
import { getWeekRange, getMonthRange } from '../utils/format'
import * as XLSX from 'xlsx'

function Stats() {
  const [workers, setWorkers] = useState([])
  const [period, setPeriod] = useState('month')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    setWorkers(getWorkers())
    const now = new Date()
    setCustomStartDate(formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)))
    setCustomEndDate(formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
    const unsubscribe = subscribe(() => setWorkers(getWorkers()))
    return unsubscribe
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
      return { workerId: w.id, name: w.name, days: days.size, hours, amount: hours * w.hourlyRate }
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

  const exportExcel = () => {
    const data = tableData.map((row, idx) => ({
      '序号': idx + 1,
      '姓名': row.name,
      '出勤天数': row.days,
      '工时(小时)': row.hours.toFixed(1),
      '时薪(元)': workers.find(w => w.id === row.workerId)?.hourlyRate || 0,
      '应发工资(元)': row.amount.toFixed(0)
    }))
    data.push({ '序号': '', '姓名': '合计', '出勤天数': '', '工时(小时)': totalHours.toFixed(1), '时薪(元)': '', '应发工资(元)': totalAmount.toFixed(0) })

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '工资表')
    const filename = `工资表_${periodLabel.replace(/[年月日\s—]+/g, '_')}.xlsx`
    XLSX.writeFile(wb, filename)
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

      <button className="export-btn" onClick={exportExcel}>📥 导出Excel工资表</button>
    </div>
  )
}

export default Stats