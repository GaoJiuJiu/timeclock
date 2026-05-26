import { useState } from 'react'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) return
    
    setLoading(true)
    setError('')
    
    try {
      await onLogin(password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">☀️</div>
        <h1 className="login-title">美好的一天从这里开始</h1>
        <p className="login-wish">✨ 希望姐姐每天开心 ✨</p>
        <p className="login-subtitle">请输入密码，开启今日的小美好～</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            className="login-input"
            placeholder="输入密码就好啦"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          
          {error && <div className="login-error">密码不太对哦，再试试～</div>}
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={loading || !password}
          >
            {loading ? '努力加载中...' : '进入我的小天地 💫'}
          </button>
        </form>
        
        <p className="login-hint">💡 忘记密码？找那个懂技术的人问问吧</p>
      </div>
    </div>
  )
}

export default Login
