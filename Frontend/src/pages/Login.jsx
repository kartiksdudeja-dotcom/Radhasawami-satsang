import React, { useState, useEffect } from "react";
import "../styles/Login.css";
import MGRSALogo from "../assests/WhatsApp Image 2025-12-20 at 16.55.36.jpeg";
import { API_ENDPOINTS, apiFetch } from "../config/apiConfig";

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginMode, setLoginMode] = useState("user");
  const [isAdminDetected, setIsAdminDetected] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [roleChecking, setRoleChecking] = useState(false);

  // 🔍 Dynamic Role check with debounce
  useEffect(() => {
    const checkRole = async () => {
      const trimmedUid = username.trim();
      if (trimmedUid.length < 1) {
        setIsAdminDetected(false);
        setRoleChecked(false);
        return;
      }

      setRoleChecking(true);
      try {
        const result = await apiFetch(API_ENDPOINTS.CHECK_ROLE, {
          method: "POST",
          body: { username: trimmedUid },
        });

        if (result && result.success) {
          // Check for any type of admin power (robust boolean check)
          const isAdmin = result.isAdmin === true || result.isAdmin === 1 || String(result.isAdmin).toLowerCase() === "true";
          const canManageAttendance = result.canManageAttendance === true || result.canManageAttendance === 1 || String(result.canManageAttendance).toLowerCase() === "true";
          const canManageStore = result.canManageStore === true || result.canManageStore === 1 || String(result.canManageStore).toLowerCase() === "true";
          
          const hasPower = isAdmin || canManageAttendance || canManageStore;
          setIsAdminDetected(hasPower);
          if (!hasPower) {
            setLoginMode("user");
          }
        } else {
          setIsAdminDetected(false);
          setLoginMode("user");
        }
        setRoleChecked(true);
      } catch (err) {
        console.error("Role check error:", err);
      } finally {
        setRoleChecking(false);
      }
    };

    const timer = setTimeout(() => {
      if (username.trim()) {
        checkRole();
      }
    }, 3000); // 500ms debounce

    return () => clearTimeout(timer);
  }, [username]);

  // 🔐 LOGIN FUNCTION
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const result = await apiFetch(API_ENDPOINTS.LOGIN, {
        method: "POST",
        body: { username, password },
      });

      if (!result || !result.success || !result.token) {
        setError(result?.error || "Login failed. Please check your credentials.");
        setLoading(false);
        
        return;
      }

      const user = { 
        ...result.user,
        loginMode: loginMode 
      };

      localStorage.clear();
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("is_admin", user.loginMode === "admin" && user.is_admin);
      localStorage.setItem("loginMode", loginMode);

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      console.error(err);
      setError("Connection failure. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      
      <div className="login-header">
        <h1 className="hindi-title">रा–धा / धः–स्व–आ–मी</h1>
        <p className="branch-subtitle">Pune Branch MGRSA</p>
         <img src={MGRSALogo} alt="Logo" className="brand-logo" />
        <h1 className="hindi-title">Log in</h1>
        <p className="signin-txt">Sign in to your account</p>
         <div>
      </div>
      

      </div>
    <div className="login-wrapper">
      <div className="login-card-v2">
          <div className="language-selector">
            <p className="language-label">Language</p>
            <div className="language-buttons">
              <button className="language-option">English</button>
              <button className="language-option">हिन्दी</button>
              <button className="language-option">मराठी</button>
            </div>
              <form onSubmit={handleLogin} className="login-form-v2">
          {error && <div className="error-message-v2">{error}</div>}

          {/* Admin Toggle */}
          {isAdminDetected && (
            <div className="login-mode-toggle-v2">
              <button
                type="button"
                className={loginMode === "user" ? "active" : ""}
                onClick={() => setLoginMode("user")}
              >
                User
              </button>
              <button
                type="button"
                className={loginMode === "admin" ? "active" : ""}
                onClick={() => setLoginMode("admin")}
              >
                Admin
              </button>
            </div>
          )}

          <div className="input-field-v2">
            <input
              type="text"
              placeholder="Unique Identifier (UID)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {roleChecking && <div className="role-checking-mini">Checking...</div>}
          </div>

          <div className="input-field-v2">
            <div className="password-wrapper-v2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-eye-v2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn-v2" disabled={loading}>
            {loading ? "Signing in..." : (
              <>
                Log in
              </>
            )}
          </button>
        </form>
          </div>
          </div>

      
      </div>
    </div>
  );
};

export default Login;