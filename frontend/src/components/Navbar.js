import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService';
import { BarChart3, Search, LayoutDashboard, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const user = getCurrentUser();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/search', label: 'Search', icon: Search },
  ];

  return (
    <nav style={{
      background: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <BarChart3 size={20} color="#FFFFFF" />
          </div>
          <span style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#1E293B',
            letterSpacing: '-0.3px',
          }}>Reports AI</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isActive ? '#2563EB' : '#64748B',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: '#F1F5F9',
            borderRadius: '20px',
          }}>
            <User size={16} color="#64748B" />
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>
              {user.username || 'User'}
            </span>
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.background = '#FEF2F2'; e.target.style.color = '#DC2626'; e.target.style.borderColor = '#FECACA'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#64748B'; e.target.style.borderColor = '#E2E8F0'; }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
