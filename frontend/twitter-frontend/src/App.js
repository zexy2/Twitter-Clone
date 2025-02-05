// src/App.js
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Navbar from "./components/Navbar";
import Explore from "./components/Explore";
import PrivateRoute from "./components/PrivateRoute";
import TweetDetail from "./components/TweetDetail";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("user_id");
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        {isAuthenticated && <Navbar setIsAuthenticated={setIsAuthenticated} />}
        <Routes>
          <Route
            path="/tweet/:tweetId"
            element={
              <PrivateRoute>
                <div className="main-content">
                  <TweetDetail />
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/home" />
              )
            }
          />
          <Route
            path="/register"
            element={
              !isAuthenticated ? (
                <Register setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/home" />
              )
            }
          />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <PrivateRoute>
                <Explore />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/user/:userId"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/home" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
