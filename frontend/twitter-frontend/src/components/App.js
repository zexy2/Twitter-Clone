import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Home from './Home';
import Profile from './Profile';
import Explore from './Explore';
import Login from './Login';
import Register from './Register';
import '../styles/common.css';

function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const userId = localStorage.getItem('user_id');

  const fetchUserInfo = async () => {
    if (userId) {
      try {
        const response = await axios.get(`http://localhost:5000/user/${userId}`);
        if (response.data.success) {
          setUserInfo(response.data.user);
        } else {
          localStorage.removeItem('user_id');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        localStorage.removeItem('user_id');
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUserInfo();
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    window.location.href = '/login';
  };

  const Navigation = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    return (
      <nav className="main-nav">
        <div className="nav-left">
          <Link 
            to="/home" 
            className={`nav-link ${currentPath === '/home' ? 'active' : ''}`}
          >
            <i className="fas fa-home"></i> Home
          </Link>
          <Link 
            to="/explore" 
            className={`nav-link ${currentPath === '/explore' ? 'active' : ''}`}
          >
            <i className="fas fa-hashtag"></i> Explore
          </Link>
        </div>
        <div className="nav-right">
          {userInfo && (
            <>
              <div className="nav-profile">
                <Link 
                  to="/profile" 
                  className={`profile-link ${currentPath === '/profile' ? 'active' : ''}`}
                >
                  <img 
                    src={userInfo.profile_picture 
                      ? `http://localhost:5000/uploads/profile_pictures/${userInfo.profile_picture}`
                      : `https://ui-avatars.com/api/?name=${userInfo.first_name}+${userInfo.last_name}&background=random`
                    }
                    alt="Profile"
                    className="nav-profile-image"
                  />
                </Link>
              </div>
              <button onClick={handleLogout} className="logout-button">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </>
          )}
        </div>
      </nav>
    );
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        {userId && userInfo && <Navigation />}
        <main className="main-content">
          <Routes>
            <Route 
              path="/login" 
              element={!userId ? <Login /> : <Navigate to="/home" replace />} 
            />
            <Route 
              path="/register" 
              element={!userId ? <Register /> : <Navigate to="/home" replace />} 
            />
            <Route 
              path="/home" 
              element={userId ? <Home /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/profile" 
              element={userId ? <Profile /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/user/:userId" 
              element={userId ? <Profile /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/explore" 
              element={userId ? <Explore /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/" 
              element={<Navigate to={userId ? "/home" : "/login"} replace />} 
            />
            <Route 
              path="*" 
              element={<Navigate to={userId ? "/home" : "/login"} replace />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 