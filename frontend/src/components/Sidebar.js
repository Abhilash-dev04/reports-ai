import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  ClipboardCheck,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Globe,
  Menu,
  X,
} from 'lucide-react';
import { useAppState } from '../App';
import authService from '../services/authService';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedState, setSelectedState } = useAppState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const user = authService.getCurrentUser();

  const normalizedRole = String(user?.role || 'user').toLowerCase();
  const isReviewer = ['reviewer', 'admin'].includes(normalizedRole);

  const closeSidebar = () => {
    setSidebarOpen(false);
    setProfileOpen(false);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const handleNavigation = (path) => {
    navigate(path);
    closeSidebar();
  };

  const handleStateChange = (stateValue) => {
    setSelectedState(stateValue);
    closeSidebar();
  };

  const handleLogout = () => {
    authService.logout();
    closeSidebar();
    navigate('/login');
  };

  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const states = [
    { value: 'all', label: 'All States', icon: Globe },
    { value: 'CA', label: 'California', icon: null },
    { value: 'TX', label: 'Texas', icon: null },
    { value: 'FL', label: 'Florida', icon: null },
  ];

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/search', label: 'Search Reports', icon: Search },
    ...(isReviewer
      ? [{ path: '/review-requests', label: 'Review Requests', icon: ClipboardCheck }]
      : []),
  ];

  return (
    <>
      <button
        type="button"
        className={`sidebar-menu-button ${sidebarOpen ? 'hidden' : ''}`}
        onClick={openSidebar}
        aria-label="Open navigation menu"
        aria-expanded={sidebarOpen}
      >
        <Menu size={22} />
      </button>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-hidden={!sidebarOpen}>
        <div className="sidebar-top-row">
          <button
            type="button"
            className="sidebar-brand"
            onClick={() => handleNavigation('/dashboard')}
          >
            <img
              src="/images/portfolio-logo.svg"
              alt="Infinite"
              className="brand-logo"
            />
            <span className="brand-name">
              AI Report Metadata Explorer
            </span>
          </button>

          <button
            type="button"
            className="sidebar-close-button"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-scroll-area">
          <div className="sidebar-section">
            <span className="section-label">Navigation</span>
            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                  >
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
                  <button
                    key={state.value}
                    type="button"
                    className={`state-toggle-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleStateChange(state.value)}
                  >
                    {Icon && <Icon size={14} />}
                    <span>{state.label}</span>
                    {isActive && <span className="state-indicator" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="profile-dropdown-container">
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setProfileOpen((current) => !current)}
              aria-expanded={profileOpen}
            >
              <div className="profile-avatar">
                <User size={16} />
              </div>
              <div className="profile-info">
                <span className="profile-name">{user?.username || 'User'}</span>
                <span className="profile-role">{normalizedRole}</span>
              </div>
              <ChevronDown
                size={14}
                className={`dropdown-chevron ${profileOpen ? 'open' : ''}`}
              />
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="profile-avatar large">
                    <User size={20} />
                  </div>
                  <div className="dropdown-user-details">
                    <span className="dropdown-name">{user?.username || 'User'}</span>
                    <span className="dropdown-email">
                      {user?.email || `${user?.username || 'user'}@example.com`}
                    </span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
