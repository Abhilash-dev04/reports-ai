import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Infinity, Star } from 'lucide-react';
import authService from '../services/authService';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="grid-pattern"></div>
      </div>
      <div className="login-container">
        <div className="login-branding">
          <div className="brand-header">
            <div className="logo-container">
              <Infinity size={32} className="logo-icon" />
              <span className="logo-text">Infinite</span>
            </div>
            <div className="gptw-badge">
              <Star size={14} className="gptw-star" />
              <span className="gptw-text">Great Place To Work</span>
            </div>
          </div>
          <div className="brand-content">
            <h1>Report Intelligence Platform</h1>
            <p className="brand-subtitle">
              AI-powered analytics and search across Medicaid reporting systems.
              Access reports from Alaska, New Hampshire, and North Dakota in one unified platform.
            </p>
            <div className="feature-list">
              <div className="feature-item"><div className="feature-dot"></div><span>Intelligent report search across all states</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Natural language query processing</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Real-time dashboard analytics</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Executive-level data visualization</span></div>
            </div>
          </div>
          <div className="brand-footer">&copy; 2026 Infinite Healthcare Solutions. All rights reserved.</div>
        </div>
        <div className="login-form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your dashboard</p>
            </div>
            {error && (
              <div className="error-banner">
                <span className="error-icon">!</span>{error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Username</label>
                <div className="input-wrapper">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username" disabled={loading} autoComplete="username" />
                </div>
              </div>
              <div className="input-group">
                <label>Password</label>
                <div className="password-wrapper">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                    disabled={loading} autoComplete="current-password" />
                  <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-options">
                <button type="button" className="forgot-link" onClick={() => navigate('/forgot-password')}>
                  Forgot Password?
                </button>
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <span className="btn-loading"><span className="spinner"></span>Signing in...</span>
                ) : (<><LogIn size={18} />Sign In</>)}
              </button>
            </form>
            <div className="form-footer">
              <p>Don't have an account?</p>
              <button className="create-account-btn" onClick={() => navigate('/signup')}>Create Account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
