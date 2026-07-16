import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Infinity, LayoutDashboard, Search, LogOut, ChevronDown } from 'lucide-react';
import { useAppState } from '../App';
import authService from '../services/authService';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedState, setSelectedState } = useAppState();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const states = [
    { value: 'all', label: 'All States' },
    { value: 'AK', label: 'Alaska' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'ND', label: 'North Dakota' }
  ];

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/search', label: 'Search', icon: Search }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
          <Infinity size={24} className="brand-icon" />
          <span className="brand-name">Infinite</span>
        </div>
        <div className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path} className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}>
                <Icon size={18} /><span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="navbar-right">
        <div className="state-selector">
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="state-dropdown">
            {states.map((state) => (
              <option key={state.value} value={state.value}>{state.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="dropdown-arrow" />
        </div>
        <div className="user-menu">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} /><span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
