import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import People from './pages/People'
import Records from './pages/Records'
import Stats from './pages/Stats'
import Settings from './pages/Settings'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/people" element={<People />} />
        <Route path="/records" element={<Records />} />
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