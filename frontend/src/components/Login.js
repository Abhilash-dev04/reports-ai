import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Star } from 'lucide-react';
import authService from '../services/authService';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login({ username, password });
      navigate('/dashboard');
    } catch (loginError) {
      setError(
        loginError.response?.data?.detail ||
          loginError.message ||
          'Unable to sign in',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
        <div className="grid-pattern" />
      </div>

      <div className="login-container">
        <section className="login-branding">
          <div className="brand-header">
            <div className="login-brand">
              <div className="brand-mark" aria-hidden="true">AI</div>

              <span className="login-brand-name">
                AI Report Metadata Explorer
              </span>
            </div>

            <div className="gptw-badge">
              <Star size={14} className="gptw-star" />
              <span className="gptw-text">Great Place To Work</span>
            </div>
          </div>

          <div className="brand-content">
            <h1>Report Intelligence Platform</h1>

            <p className="brand-subtitle">
              An AI-powered Enterprise Report Intelligence Platform for
              discovering report metadata, dependencies, packages, data
              sources, and technical details across California, Texas,
              and Florida.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-dot" />
                <span>Intelligent report search across all states</span>
              </div>

              <div className="feature-item">
                <div className="feature-dot" />
                <span>Natural language query processing</span>
              </div>

              <div className="feature-item">
                <div className="feature-dot" />
                <span>Real-time dashboard analytics</span>
              </div>

              <div className="feature-item">
                <div className="feature-dot" />
                <span>Executive-level data visualization</span>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            &copy; 2026 AI Report Metadata Explorer. All rights reserved.
          </div>
        </section>

        <section className="login-form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your dashboard</p>
              {process.env.REACT_APP_DEMO_MODE === 'true' && (
                <div className="demo-login-notice">
                  <p>Public demo accounts:</p>
                  <ul>
                    <li>demo / any password — Standard User</li>
                    <li>reviewer / any password — Reviewer</li>
                    <li>admin / any password — Administrator</li>
                  </ul>
                  <p>Use any non-empty password for the frontend demonstration.</p>
                </div>
              )}
            </div>

            {error && (
              <div className="error-banner" role="alert">
                <span className="error-icon">!</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label htmlFor="login-username">Username</label>
                <div className="input-wrapper">
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter your username"
                    disabled={loading}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-password">Password</label>
                <div className="password-wrapper">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="form-footer">
              <p>Don't have an account?</p>
              <button
                type="button"
                className="create-account-btn"
                onClick={() => navigate('/signup')}
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
