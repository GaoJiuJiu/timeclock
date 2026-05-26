import { useState, useEffect, useRef } from 'react'
import { getContents, getSettings, saveSettings, addContent, deleteContent, getWorkers, getRecords, exportData, importData, clearAll, loadMockData, subscribe, fetchAll, logout } from '../utils/storage'
import { getMonthRange } from '../utils/format'
import { exportSalaryExcel } from '../utils/excel'
import Modal from '../components/Modal'

function Settings() {
  const [contents, setContents] = useState([])
  const [settings, setSettings] = useState({})
  const [workers, setWorkers] = useState([])
  const [showContentModal, setShowContentModal] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [newRate, setNewRate] = useState('')
  const [newContent, setNewContent] = useState('')
  const [toast, setToast] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchAll()
    return subscribe(() => {
      setContents(getContents())
      setSettings(getSettings())
      setWorkers(getWorkers())
    })
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const handleAddContent = async () => {
    if (!newContent.trim()) return
    await addContent(newContent.trim())
    setNewContent('')
  }

  const handleRemoveContent = async (content) => {
    if (window.confirm(`删除工作内容「${content}」？`)) await deleteContent(content)
  }

  const exportCurrentMonthExcel = async () => {
    const now = new Date()
    const range = getMonthRange(now)
    const label = `${now.getFullYear()}年${now.getMonth() + 1}月`
    await exportSalaryExcel(range, label)
  }

  const exportJSON = () => {
    const data = exportData()
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
          showToast('数据导入成功！')
        } else {
          alert('文件格式不正确')
        }
      } catch { alert('文件解析失败') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const doLoadMockData = async () => {
    if (workers.length > 0) {
      if (!window.confirm('已有数据了，加载示例会覆盖掉哦～确定继续吗？')) return
    }
    await loadMockData()
    showToast('示例数据已加载！')
  }

  const doClear = async () => {
    if (window.confirm('要清除所有数据吗？慎重哦～')) {
      if (window.confirm('真的要清空吗？清了就回不来啦')) {
        await clearAll()
        showToast('已清空，重新开始吧～')
      }
    }
  }

  const handleSaveRate = async () => {
    if (!newRate || Number(newRate) <= 0) {
      alert('请输入有效的时薪')
      return
    }
    await saveSettings({ ...settings, defaultHourlyRate: Number(newRate) })
    setShowRateModal(false)
    showToast('默认时薪已更新～')
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
        <div className="setting-item" onClick={() => { setNewRate(settings.defaultHourlyRate || 10); setShowRateModal(true) }}>
          <span className="setting-label">默认时薪</span>
          <span className="setting-value">¥{settings.defaultHourlyRate || 10}/小时 ✏️</span>
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-group-title">数据</div>
        <div className="setting-item" onClick={doLoadMockData}>
          <span className="setting-label">加载示例数据</span>
          <span className="setting-value">用于测试</span>
        </div>
        <div className="setting-item" onClick={exportCurrentMonthExcel}>
          <span className="setting-label">导出Excel</span>
          <span className="setting-value">本月工资表</span>
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
          <span className="setting-label" style={{ color: 'var(--red)' }}>清空所有数据</span>
          <span className="setting-value" style={{ color: 'var(--red)' }}>重新开始</span>
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-group-title">账号</div>
<div className="setting-item" onClick={() => { if (window.confirm('要退出登录吗？')) logout() }} style={{ color: 'var(--red)' }}>
          <span className="setting-label" style={{ color: 'var(--red)' }}>退出登录</span>
          <span className="setting-value">换个账号试试</span>
        </div>
      </div>

      <div className="version">天天幸运 · 记录每一份美好 💫</div>

      {toast && <div className="toast">{toast}</div>}

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onFileSelected} />

      <Modal show={showContentModal} onClose={() => setShowContentModal(false)} title="工作内容管理">
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
      </Modal>

      <Modal show={showRateModal} onClose={() => setShowRateModal(false)} title="修改默认时薪">
        <div className="form-group">
          <label className="form-label">默认时薪（元/小时）</label>
          <input 
            type="number" 
            step="0.5"
            className="form-input" 
            placeholder="10" 
            value={newRate} 
            onChange={e => setNewRate(e.target.value)} 
          />
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
          此为新建人员时的默认时薪，已有人员的时薪不受影响～
        </p>
        <div className="modal-btns" style={{ marginTop: 24 }}>
          <button className="modal-btn cancel" onClick={() => setShowRateModal(false)}>取消</button>
          <button className="modal-btn confirm" onClick={handleSaveRate}>保存</button>
        </div>
      </Modal>
    </div>
  )
}

export default Settings