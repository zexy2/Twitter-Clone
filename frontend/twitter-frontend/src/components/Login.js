// src/components/Login.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      console.log('Attempting login with:', { email, password }); // Debug için

      const response = await axios.post("http://localhost:5000/login", {
        email: email,
        password: password
      });

      console.log('Login response:', response.data); // Debug için

      if (response.data.success) {
        localStorage.setItem("user_id", response.data.user_id);
        // Önce localStorage'a kaydet, sonra yönlendir
        setTimeout(() => {
          window.location.href = '/home';
        }, 100);
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.response) {
        // Server'dan gelen hata mesajı
        setError(error.response.data.message || "Invalid email or password");
      } else if (error.request) {
        // Server'a ulaşılamadı
        setError("Network error - please check your connection");
      } else {
        // Diğer hatalar
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome Back</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
        <div className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
