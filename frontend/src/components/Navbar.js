import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Search, LogOut } from "lucide-react";
import { logout } from "./services/authService";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Reports AI</div>
      <div className="navbar-links">
        <Link
          to="/dashboard"
          className={location.pathname === "/dashboard" ? "active" : ""}
        >
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        <Link
          to="/search"
          className={location.pathname === "/search" ? "active" : ""}
        >
          <Search size={16} /> Search
        </Link>
      </div>
      <div className="navbar-user">
        <button onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
