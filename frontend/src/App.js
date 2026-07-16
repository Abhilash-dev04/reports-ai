import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/Dashboard';
import Search from './components/Search';
import Sidebar from './components/Sidebar';
import authService from './services/authService';
import './App.css';

const AppContext = createContext();
export const useAppState = () => useContext(AppContext);

const PrivateRoute = ({ children }) => {
  return authService.isAuthenticated() ? (
    <><Sidebar />{children}</>
  ) : (<Navigate to="/login" replace />);
};

function App() {
  const [selectedState, setSelectedState] = useState('all');
  return (
    <AppContext.Provider value={{ selectedState, setSelectedState }}>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
