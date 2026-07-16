import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, CheckCircle, Infinity } from 'lucide-react';
import authService from '../services/authService';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !newPassword) {
      setError('Username and new password are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(username, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-page">
        <div className="forgot-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="grid-pattern"></div>
        </div>
        <div className="forgot-success">
          <CheckCircle size={64} className="success-icon" />
          <h2>Password Reset!</h2>
          <p>Your password has been updated successfully.</p>
          <p className="redirect-text">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-page">
      <div className="forgot-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="grid-pattern"></div>
      </div>
      <div className="forgot-container">
        <div className="forgot-branding">
          <div className="brand-header">
            <div className="logo-container">
              <Infinity size={28} className="logo-icon" />
              <span className="logo-text">Infinite</span>
            </div>
          </div>
          <div className="brand-content">
            <h1>Reset Password</h1>
            <p className="brand-subtitle">
              Forgot your password? Enter your username and a new password to regain access
              to the Infinite Report Intelligence Platform.
            </p>
          </div>
        </div>
        <div className="forgot-form-panel">
          <button className="back-btn" onClick={() => navigate('/login')}>
            <ArrowLeft size={18} />Back to Login
          </button>
          <div className="form-header">
            <div className="form-icon"><KeyRound size={28} /></div>
            <h2>Reset Password</h2>
            <p>Enter your details to reset your password</p>
          </div>
          {error && (
            <div className="error-banner">
              <span className="error-icon">!</span>{error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="forgot-form">
            <div className="input-group">
              <label>Username</label>
              <div className="input-wrapper">
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username" disabled={loading} autoComplete="username" />
              </div>
            </div>
            <div className="input-group">
              <label>New Password</label>
              <div className="input-wrapper">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password" disabled={loading} autoComplete="new-password" />
              </div>
            </div>
            <div className="input-group">
              <label>Confirm New Password</label>
              <div className="input-wrapper">
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password" disabled={loading} autoComplete="new-password" />
              </div>
            </div>
            <button type="submit" className="reset-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading"><span className="spinner"></span>Resetting...</span>
              ) : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
