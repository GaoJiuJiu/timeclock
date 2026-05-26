import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import People from './pages/People'
import Records from './pages/Records'
import Stats from './pages/Stats'
import Settle from './pages/Settle'
import SettleHistory from './pages/SettleHistory'
import Settings from './pages/Settings'
import { isAuthenticated, subscribeAuth, login, logout } from './utils/storage'

function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(password)
    setLoading(false)
    if (!result.success) {
      setError(result.error || '密码错误')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '360px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{
          textAlign: 'center',
          margin: '0 0 8px',
          fontSize: '24px',
          color: '#1a1a2e'
        }}>考勤管理系统</h2>
        <p style={{
          textAlign: 'center',
          color: '#888',
          margin: '0 0 32px',
          fontSize: '14px'
        }}>请输入管理密码</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入密码"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '2px solid #e8e8e8',
            borderRadius: '10px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
        />

        {error && <p style={{
          color: '#e74c3c',
          fontSize: '14px',
          margin: '12px 0 0',
          textAlign: 'center'
        }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '20px',
            background: loading ? '#b0b0b0' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s'
          }}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}

function App() {
  const [authed, setAuthed] = useState(isAuthenticated())

  useEffect(() => {
    const unsub = subscribeAuth((val) => setAuthed(val))
    return unsub
  }, [])

  if (!authed) {
    return <LoginPage />
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/people" element={<People />} />
        <Route path="/records" element={<Records />} />
        <Route path="/settle" element={<Settle />} />
        <Route path="/settle-history" element={<SettleHistory />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>

      <nav className="navbar">
        <NavLink to="/" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🏠</span>
          <span className="nav-text">打卡</span>
        </NavLink>
        <NavLink to="/people" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">👥</span>
          <span className="nav-text">人员</span>
        </NavLink>
        <NavLink to="/records" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span className="nav-text">记录</span>
        </NavLink>
        <NavLink to="/settle" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💰</span>
          <span className="nav-text">结算</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-text">设置</span>
        </NavLink>
      </nav>
    </div>
  )
}

export default App
