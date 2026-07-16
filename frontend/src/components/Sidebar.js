import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Infinity, LayoutDashboard, Search, LogOut, User, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { useAppState } from '../App';
import authService from '../services/authService';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedState, setSelectedState } = useAppState();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const states = [
    { value: 'all', label: 'All States', icon: Globe },
    { value: 'AK', label: 'Alaska', icon: null },
    { value: 'NH', label: 'New Hampshire', icon: null },
    { value: 'ND', label: 'North Dakota', icon: null }
  ];

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/search', label: 'Search Reports', icon: Search }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" onClick={() => navigate('/dashboard')}>
        <Infinity size={22} className="brand-icon" />
        <span className="brand-name">Infinite</span>
      </div>

      <div className="sidebar-section">
        <span className="section-label">Navigation</span>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path} className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}>
                <Icon size={18} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={14} className="active-arrow" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-section">
        <span className="section-label">State Filter</span>
        <div className="state-toggle-list">
          {states.map((state) => {
            const Icon = state.icon;
            const isActive = selectedState === state.value;
            return (
              <button key={state.value}
                className={`state-toggle-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedState(state.value)}>
                {Icon && <Icon size={14} />}
                <span>{state.label}</span>
                {isActive && <div className="state-indicator"></div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="profile-dropdown-container">
          <button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)}>
            <div className="profile-avatar">
              <User size={16} />
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.username || 'User'}</span>
              <span className="profile-role">{user?.role || 'Member'}</span>
            </div>
            <ChevronDown size={14} className={`dropdown-chevron ${profileOpen ? 'open' : ''}`} />
          </button>
          {profileOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="profile-avatar large">
                  <User size={20} />
                </div>
                <div>
                  <span className="dropdown-name">{user?.username || 'User'}</span>
                  <span className="dropdown-email">{user?.username || 'user'}@infinite.com</span>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item danger" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
