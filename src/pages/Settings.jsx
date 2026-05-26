import React, { useState, useEffect, useRef } from 'react'
import { getContents, getSettings, addContent, deleteContent, getWorkers, getRecords, exportData, importData, clearAll, subscribe } from '../utils/storage'
import * as XLSX from 'xlsx'

function Settings({ onLogout }) {
  const [contents, setContents] = useState([])
  const [settings, setSettings] = useState({})
  const [workers, setWorkers] = useState([])
  const [showContentModal, setShowContentModal] = useState(false)
  const [newContent, setNewContent] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    setContents(getContents())
    setSettings(getSettings())
    setWorkers(getWorkers())
    const unsubscribe = subscribe(() => {
      setContents(getContents())
      setSettings(getSettings())
      setWorkers(getWorkers())
    })
    return unsubscribe
  }, [])

  const handleAddContent = async () => {
    if (!newContent.trim()) return
    await addContent(newContent.trim())
    setNewContent('')
  }

  const handleRemoveContent = async (content) => {
    if (window.confirm(`删除工作内容「${content}」？`)) {
      await deleteContent(content)
    }
  }

  const exportExcel = () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const rows = []
    let totalHours = 0, totalAmount = 0

    workers.forEach((w, idx) => {
      const records = getRecords({ workerId: w.id, startDate: monthStart.getTime(), endDate: monthEnd.getTime() })
      let hours = 0
      const days = new Set()
      records.forEach(r => {
        if (r.endTime) {
          hours += (r.endTime - r.startTime) / 1000 / 3600
          days.add(new Date(r.startTime).toDateString())
        }
      })
      const amount = hours * w.hourlyRate
      totalHours += hours
      totalAmount += amount
      rows.push({ '序号': idx + 1, '姓名': w.name, '出勤天数': days.size, '工时(小时)': hours.toFixed(1), '时薪(元)': w.hourlyRate, '应发工资(元)': amount.toFixed(0) })
    })

    rows.push({ '序号': '', '姓名': '合计', '出勤天数': '', '工时(小时)': totalHours.toFixed(1), '时薪(元)': '', '应发工资(元)': totalAmount.toFixed(0) })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '工资表')
    const filename = `工资表_${now.getFullYear()}年${now.getMonth() + 1}月.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const exportJSON = async () => {
    const data = await exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `考勤数据备份_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const triggerImport = () => fileInputRef.current.click()

  const onFileSelected = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.version) {
          await importData(data)
          alert('数据导入成功！')
        } else {
          alert('文件格式不正确')
        }
      } catch { alert('文件解析失败') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const doClear = async () => {
    if (window.confirm('确定清除所有数据吗？此操作不可恢复！')) {
      if (window.confirm('再次确认：真的要清除吗？')) {
        await clearAll()
        alert('数据已清除')
      }
    }
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <h1 className="topbar-title">设置</h1>
      </div>

      <div className="setting-group">
        <div className="setting-group-title">工作内容</div>
        <div className="setting-item" onClick={() => setShowContentModal(true)}>
          <span className="setting-label">管理工作内容</span>
          <span className="setting-value">{contents.join('、')}</span>
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-group-title">计薪方式</div>
        <div className="setting-item">
          <span className="setting-label">默认时薪</span>
          <span className="setting-value">¥{settings.defaultHourlyRate}/小时</span>
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-group-title">账户</div>
        <div className="setting-item" onClick={onLogout} style={{ color: 'var(--red)' }}>
          <span className="setting-label" style={{ color: 'var(--red)' }}>退出登录</span>
          <span className="setting-value">切换账户</span>
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-group-title">数据</div>
        <div className="setting-item" onClick={exportExcel}>
          <span className="setting-label">导出Excel</span>
          <span className="setting-value">工资表</span>
        </div>
        <div className="setting-item" onClick={exportJSON}>
          <span className="setting-label">导出数据</span>
          <span className="setting-value">JSON 备份</span>
        </div>
        <div className="setting-item" onClick={triggerImport}>
          <span className="setting-label">导入数据</span>
          <span className="setting-value">从文件恢复</span>
        </div>
        <div className="setting-item" onClick={doClear} style={{ color: 'var(--red)' }}>
          <span className="setting-label" style={{ color: 'var(--red)' }}>清除所有数据</span>
          <span className="setting-value" style={{ color: 'var(--red)' }}>⚠ 不可恢复</span>
        </div>
      </div>

      <div className="version">厂里考勤 v1.0 · 让每一分工都算数</div>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onFileSelected} />

      {showContentModal && (
        <div className="overlay show" onClick={(e) => e.target.classList.contains('overlay') && setShowContentModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">工作内容管理</h2>
              <button className="modal-close" onClick={() => setShowContentModal(false)}>✕</button>
            </div>

            <div className="content-tags">
              {contents.map(c => (
                <span key={c} className="content-tag selected" style={{ fontSize: 15, padding: '10px 18px', position: 'relative' }} onClick={() => handleRemoveContent(c)}>
                  {c}
                  <span style={{ marginLeft: 6, opacity: 0.6 }}>✕</span>
                </span>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">添加新内容</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="输入工作内容" style={{ flex: 1 }} value={newContent} onChange={e => setNewContent(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddContent()} />
                <button className="modal-btn confirm" style={{ flex: 0, padding: '12px 20px' }} onClick={handleAddContent}>添加</button>
              </div>
            </div>

            <div className="modal-btns" style={{ marginTop: 24 }}>
              <button className="modal-btn cancel" onClick={() => setShowContentModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
