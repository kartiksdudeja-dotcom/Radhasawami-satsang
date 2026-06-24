import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css'

function App() {
  // State to manage authentication and page navigation
  // Initialize from localStorage immediately to prevent race conditions
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('is_admin');
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!user);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenjwt');
    localStorage.removeItem('userID');
    localStorage.removeItem('satsangCategories'); // Optional: Clear recent config too
  };

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} user={user} />
      ) : (
        <Login onLoginSuccess={handleLogin} />
      )}
    </div>
  );
}

export default App;
