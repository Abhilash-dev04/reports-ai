import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Infinity, ArrowLeft, CheckCircle } from 'lucide-react';
import authService from '../services/authService';
import './SignUp.css';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.username || !formData.password) { setError('All fields are required'); return; }
    if (formData.username.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authService.signUp({ username: formData.username, password: formData.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="signup-page">
        <div className="signup-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="grid-pattern"></div>
        </div>
        <div className="signup-success">
          <CheckCircle size={64} className="success-icon" />
          <h2>Account Created!</h2>
          <p>Your account has been successfully created.</p>
          <p className="redirect-text">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="grid-pattern"></div>
      </div>
      <div className="signup-container">
        <div className="signup-branding">
          <div className="brand-header">
            <div className="logo-container">
              <Infinity size={28} className="logo-icon" />
              <span className="logo-text">Infinite</span>
            </div>
          </div>
          <div className="brand-content">
            <h1>Join the Platform</h1>
            <p className="brand-subtitle">
              Create your account to access the Infinite Report Intelligence Platform
              and explore Medicaid reporting analytics.
            </p>
          </div>
        </div>
        <div className="signup-form-panel">
          <button className="back-btn" onClick={() => navigate('/login')}>
            <ArrowLeft size={18} />Back to Login
          </button>
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>
          </div>
          {error && (
            <div className="error-banner">
              <span className="error-icon">!</span>{error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="input-group">
              <label>Username</label>
              <div className="input-wrapper">
                <input type="text" name="username" value={formData.username} onChange={handleChange}
                  placeholder="Choose a username" disabled={loading} autoComplete="username" />
              </div>
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                  onChange={handleChange} placeholder="Create a password" disabled={loading} autoComplete="new-password" />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="password-wrapper">
                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword}
                  onChange={handleChange} placeholder="Confirm your password" disabled={loading} autoComplete="new-password" />
                <button type="button" className="toggle-password" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="signup-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading"><span className="spinner"></span>Creating Account...</span>
              ) : (<><UserPlus size={18} />Create Account</>)}
            </button>
          </form>
          <div className="form-footer">
            <p>Already have an account?</p>
            <button className="login-link-btn" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
