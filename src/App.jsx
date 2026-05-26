import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import People from './pages/People'
import Records from './pages/Records'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Login from './components/Login'
import { login, logout, isLoggedIn, init, subscribe } from './utils/storage'

function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初始化数据
    init().finally(() => setLoading(false))
    
    // 监听登录状态变化
    const unsubscribe = subscribe(() => {
      setLoggedIn(isLoggedIn())
    })
    return unsubscribe
  }, [])

  const handleLogin = async (password) => {
    await login(password)
    setLoggedIn(true)
    await init()
  }

  const handleLogout = () => {
    logout()
    setLoggedIn(false)
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">⏳</div>
        <div>加载中...</div>
      </div>
    )
  }

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/people" element={<People />} />
        <Route path="/records" element={<Records />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings onLogout={handleLogout} />} />
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
        <NavLink to="/stats" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span className="nav-text">统计</span>
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
