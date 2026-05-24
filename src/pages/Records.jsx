import React, { useState, useEffect, useMemo } from 'react'
import { getWorkers, getRecords, subscribe } from '../utils/storage'
import { formatTime, getDateLabel, getAvatarColor, getInitial } from '../utils/format'

function Records() {
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState('all')
  const [records, setRecords] = useState([])

  useEffect(() => {
    setWorkers(getWorkers())
    setRecords(getRecords())
    const unsubscribe = subscribe(() => {
      setWorkers(getWorkers())
      setRecords(getRecords())
    })
    return unsubscribe
  }, [])

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return records
    return records.filter(r => r.workerId === filter)
  }, [records, filter])

  const groupedRecords = useMemo(() => {
    const groups = {}
    filteredRecords.forEach(rec => {
      const dateStr = new Date(rec.startTime).toDateString()
      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr, label: getDateLabel(rec.startTime), records: [], totalMs: 0 }
      }
      groups[dateStr].records.push(rec)
      const duration = rec.endTime ? rec.endTime - rec.startTime : 0
      groups[dateStr].totalMs += duration
    })
    return Object.values(groups).map(g => ({ ...g, totalHours: g.totalMs / 1000 / 3600 }))
  }, [filteredRecords])

  const getDuration = (rec) => {
    const ms = rec.endTime ? rec.endTime - rec.startTime : 0
    return (ms / 1000 / 3600).toFixed(1)
  }

  const getWorkerColor = (workerId) => {
    const idx = workers.findIndex(w => w.id === workerId)
    return getAvatarColor(idx >= 0 ? idx : 0)
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <h1 className="topbar-title">考勤记录</h1>
      </div>

      <div className="stat-tabs" style={{ marginBottom: 16 }}>
        <button className={`stat-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全部</button>
        {workers.slice(0, 3).map(w => (
          <button key={w.id} className={`stat-tab ${filter === w.id ? 'active' : ''}`} onClick={() => setFilter(w.id)}>
            {w.name}
          </button>
        ))}
      </div>

      {groupedRecords.map(group => (
        <div key={group.date} className="record-day-group">
          <div className="record-day-header">
            <span>{group.label}</span>
            <span className="record-day-total">{group.totalHours.toFixed(1)}h</span>
          </div>
          {group.records.map(rec => (
            <div key={rec.id} className="record-item">
              <div className="record-avatar" style={{ background: getWorkerColor(rec.workerId) }}>
                {getInitial(rec.workerName)}
              </div>
              <div className="record-info">
                <div className="record-name">{rec.workerName}</div>
                <div className="record-detail">
                  {formatTime(rec.startTime)} — {rec.endTime ? formatTime(rec.endTime) : '进行中'}
                  · <span className="record-content-tag">{rec.content || '未填写'}</span>
                </div>
              </div>
              <div className="record-right">
                <div className="record-time-range">{getDuration(rec)}h</div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {filteredRecords.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div className="empty-text">暂无考勤记录</div>
        </div>
      )}
    </div>
  )
}

export default Records