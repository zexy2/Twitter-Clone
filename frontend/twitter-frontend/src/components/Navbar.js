// src/components/Navbar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const userInfo = {
    userId: localStorage.getItem("user_id"),
    firstName: localStorage.getItem("first_name"),
    lastName: localStorage.getItem("last_name")
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <button onClick={() => navigate('/home')} className="nav-button">
          <i className="fas fa-home"></i>
          <span>Home</span>
        </button>
        <button onClick={() => navigate('/explore')} className="nav-button">
          <i className="fas fa-hashtag"></i>
          <span>Explore</span>
        </button>
      </div>
      <div className="nav-right">
        <button onClick={() => navigate('/profile')} className="nav-button profile-button">
          <img 
            src={`https://ui-avatars.com/api/?name=${userInfo.firstName}+${userInfo.lastName}`}
            alt="profile"
            className="profile-pic"
          />
          <span>Profile</span>
        </button>
        <button onClick={handleLogout} className="nav-button logout-button">
          <i className="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
