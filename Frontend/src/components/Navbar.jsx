import React, { useState, useEffect } from "react";
import "../styles/Navbar.css";
import notificationIcon from "../assests/notification.png";
import { apiFetch } from "../config/apiConfig";

const Navbar = ({
  onLogout,
  activeMenu,
  onMenuClick,
  user,
  onSidebarToggle,
  isProfileComplete = true,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sevaDropdownOpen, setSevaDropdownOpen] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const [masterTablesDropdownOpen, setMasterTablesDropdownOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showLoginAsModal, setShowLoginAsModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const isActualAdmin = user?.is_admin === true || user?.is_admin == 1 || String(user?.is_admin).toLowerCase() === "true";
  const canActualManageAttendance = user?.can_manage_attendance === true || user?.can_manage_attendance == 1 || String(user?.can_manage_attendance).toLowerCase() === "true";
  const canActualManageStore = user?.can_manage_store === true || user?.can_manage_store == 1 || String(user?.can_manage_store).toLowerCase() === "true";
  
  const isUserMode = user?.loginMode === 'user';
  const isAdmin = isActualAdmin && !isUserMode;
  const canManageAttendance = canActualManageAttendance && !isUserMode;
  const canManageStore = canActualManageStore && !isUserMode;
  
  const hasAnyAdminPower = isAdmin || canManageAttendance || canManageStore;
  const featuresLocked = !isProfileComplete;

  // PWA Install prompt handler
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowQRModal(true);
    }
  };

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    if (onSidebarToggle) {
      onSidebarToggle(newState);
    }
  };

  useEffect(() => {
    if (onSidebarToggle) {
      onSidebarToggle(isMenuOpen);
    }
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMenuClick = (menu) => {
    if (onMenuClick) {
      onMenuClick(menu);
    }
    if (menu === "logout" && onLogout) {
      onLogout();
    }
    closeMobileMenu();
  };

  const handleReportsClick = (e) => {
    e.preventDefault();
    handleMenuClick("reports");
    setReportsDropdownOpen(!reportsDropdownOpen);
    setSevaDropdownOpen(false);
    setMasterTablesDropdownOpen(false);
  };

  const handleReportItemClick = (reportType) => {
    handleMenuClick(`report-${reportType}`);
    setReportsDropdownOpen(false);
  };

  const handleMasterTablesClick = (e) => {
    e.preventDefault();
    setMasterTablesDropdownOpen(!masterTablesDropdownOpen);
    setSevaDropdownOpen(false);
    setReportsDropdownOpen(false);
  };

  const handleMasterTableItemClick = (tableType) => {
    handleMenuClick(tableType);
    setMasterTablesDropdownOpen(false);
  };

  // Load members for login-as feature
  const handleLoginAsClick = async () => {
    if (!isAdmin) return;
    setShowLoginAsModal(true);
    closeMobileMenu();
    setMemberSearch("");
    setLoadingMembers(true);
    await loadMembers();
  };

  const loadMembers = async () => {
    try {
      const result = await apiFetch("/api/members");
      let membersData = [];
      if (result.success && result.data && Array.isArray(result.data)) {
        membersData = result.data;
      } else if (Array.isArray(result)) {
        membersData = result;
      } else if (result.data) {
        membersData = Array.isArray(result.data) ? result.data : [result.data];
      }
      setMembers(membersData);
      setFilteredMembers(membersData);
    } catch (error) {
      console.error("Error loading members:", error);
      setMembers([]);
      setFilteredMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleMemberSearchChange = (e) => {
    const value = e.target.value;
    setMemberSearch(value);
    if (!value.trim()) {
      setFilteredMembers(members);
      return;
    }
    const searchLower = value.toLowerCase();
    const filtered = members.filter((m) => {
      const searchFields = [m.name, m.Name, m.username, m.UserName, m.number, m.Number, m.uid, m.UID];
      return searchFields.some((field) => field && String(field).toLowerCase().includes(searchLower));
    });
    setFilteredMembers(filtered);
  };

  const handleLoginAsMember = async (memberId, memberName) => {
    try {
      const result = await apiFetch("/api/auth/login-as-member", {
        method: "POST",
        body: JSON.stringify({
          member_id: memberId,
          admin_id: user.id,
        }),
      });

      if (result.success && result.user) {
        const originalAdmin = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("original_admin", JSON.stringify(originalAdmin));
        const impersonatedUser = {
          ...result.user,
          is_impersonating: true,
          original_user_id: originalAdmin.id,
          original_admin_name: originalAdmin.name,
        };
        localStorage.setItem("user", JSON.stringify(impersonatedUser));
        localStorage.setItem("is_impersonating", "true");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error logging in as member:", error);
    }
    setShowLoginAsModal(false);
  };

  const handleStopImpersonating = async () => {
    try {
      const result = await apiFetch("/api/auth/stop-impersonating", {
        method: "POST",
        body: JSON.stringify({
          original_user_id: user.original_user_id,
        }),
      });
      if (result.success) {
        localStorage.setItem("user", JSON.stringify(result.user));
        localStorage.removeItem("is_impersonating");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error stopping impersonation:", error);
    }
  };

  return (
    <>
      {/* Top Mobile Bar - Always show logo, show hamburger only for admins */}
      <div className={`mobile-hamburger ${!hasAnyAdminPower ? 'center-logo' : ''}`}>
        {hasAnyAdminPower && (
          <button className="mobile-hamburger-btn" onClick={toggleMobileMenu} aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        <div className="mobile-logo">रा–धा / धः–स्व–आ–मी</div>
      </div>

      {isMobileMenuOpen && hasAnyAdminPower && <div className="mobile-backdrop" onClick={closeMobileMenu}></div>}

      {hasAnyAdminPower && (
        <aside className={`sidebar ${isMenuOpen ? "open" : "closed"} ${isMobileMenuOpen ? "mobile-open" : "mobile-closed"}`}>
        <div className="sidebar-header" onClick={toggleMenu}>
          <div className="logo-container">
            <div className="logo-circle">RS</div>
            {isMenuOpen && <h2 className="logo-text">रा–धा / धः–स्व–आ–मी</h2>}
          </div>
        </div>

        <nav className="sidebar-menu">
          {featuresLocked && isMenuOpen && (
            <div className="profile-lock-warning">
              <span className="lock-icon">🔒</span>
              <span>Complete profile to unlock</span>
            </div>
          )}

          <div className="menu-group">
            <a href="#home" className={`menu-item ${activeMenu === "home" || activeMenu === "dashboard" ? "active" : ""} ${featuresLocked ? "locked" : ""}`} onClick={() => handleMenuClick("home")} title="Home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {isMenuOpen && <span>अगला सत्संग</span>}
              {featuresLocked && <span className="lock-badge">🔒</span>}
            </a>

            <a href="#store" className={`menu-item ${activeMenu === "store" ? "active" : ""} ${featuresLocked ? "locked" : ""}`} onClick={() => handleMenuClick("store")} title="Store">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {isMenuOpen && <span>Canteen Store</span>}
              {featuresLocked && <span className="lock-badge">🔒</span>}
            </a>

            {isAdmin && (
              <a href="#notifications" className={`menu-item ${activeMenu === "notifications" ? "active" : ""} ${featuresLocked ? "locked" : ""}`} onClick={() => handleMenuClick("notifications")} title="Notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {isMenuOpen && <span>Notifications</span>}
                {featuresLocked && <span className="lock-badge">🔒</span>}
              </a>
            )}
          </div>

          <div className="menu-divider" style={{height: '1px', background: 'var(--sidebar-border)', margin: '8px 16px', opacity: 0.5}}></div>

          <div className="menu-group admin-group">
            {isAdmin && (
              <a href="#branch" className={`menu-item ${activeMenu === "branch" ? "active" : ""}`} onClick={() => handleMenuClick("branch")} title="Branch Info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4 0v-3a1 1 0 011-1h2a1 1 0 011 1v3m-4 0h4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {isMenuOpen && <span>Branch Info</span>}
              </a>
            )}

            <a href="#master-tables" className={`menu-item ${["member-master", "satsang-options", "seva-options", "superman-phase", "store-admin", "admin-master"].includes(activeMenu) ? "active" : ""}`} onClick={handleMasterTablesClick} title="Master Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {isMenuOpen && <span>Master Settings</span>}
            </a>

            {masterTablesDropdownOpen && isMenuOpen && (
              <div className="seva-dropdown">
                {(isAdmin || user?.can_manage_attendance) && <a href="#member-master" className={`dropdown-item ${activeMenu === "member-master" ? "active" : ""}`} onClick={() => handleMasterTableItemClick("member-master")}>Members Database</a>}
                {(isAdmin || user?.can_manage_attendance) && <a href="#satsang-options" className={`dropdown-item ${activeMenu === "satsang-options" ? "active" : ""}`} onClick={() => handleMasterTableItemClick("satsang-options")}>Satsang Setup</a>}
                {(isAdmin || user?.can_manage_attendance) && <a href="#seva-options" className={`dropdown-item ${activeMenu === "seva-options" ? "active" : ""}`} onClick={() => handleMasterTableItemClick("seva-options")}>Seva Setup</a>}
                {(isAdmin || canManageStore) && <a href="#store-admin" className={`dropdown-item ${activeMenu === "store-admin" ? "active" : ""}`} onClick={() => handleMasterTableItemClick("store-admin")}>Canteen Setup</a>}
                {isAdmin && <a href="#superman-phase" className={`dropdown-item ${activeMenu === "superman-phase" ? "active" : ""}`} onClick={() => handleMasterTableItemClick("superman-phase")}>Superman Phase Setup</a>}
                {isAdmin && <a href="#admin-master" className={`dropdown-item ${activeMenu === "admin-master" ? "active" : ""}`} onClick={() => handleMasterTableItemClick("admin-master")}>Admin & Power Master</a>}
              </div>
            )}

            <a href="#reports" className={`menu-item ${activeMenu.startsWith("report") ? "active" : ""}`} onClick={handleReportsClick} title="Reports">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {isMenuOpen && <span>All Reports</span>}
            </a>

            {reportsDropdownOpen && isMenuOpen && (
              <div className="seva-dropdown">
                <a href="#report-attendance" className={`dropdown-item ${activeMenu === "report-attendance" ? "active" : ""}`} onClick={() => handleReportItemClick("attendance")}>Attendance Report</a>
                <a href="#report-seva" className={`dropdown-item ${activeMenu === "report-seva" ? "active" : ""}`} onClick={() => handleReportItemClick("seva")}>Seva Report</a>
              </div>
            )}

            {isAdmin && !featuresLocked && (
              <a href="#login" className="menu-item login-as-member" onClick={(e) => { e.preventDefault(); handleLoginAsClick(); }} title="Login as Member">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {isMenuOpen && <span>Login as Member</span>}
              </a>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <a href="#profile" className={`menu-item ${activeMenu === "profile" ? "active" : ""}`} onClick={() => handleMenuClick("profile")} title="Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isMenuOpen && <span>{featuresLocked ? "Complete Profile" : "Profile Settings"}</span>}
          </a>

          <a href="#logout" className="menu-item logout" onClick={() => handleMenuClick("logout")} title="Sign Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isMenuOpen && <span>Sign Out</span>}
          </a>

          {isMenuOpen && (
            <div className="footer-credits" style={{fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center', marginTop: '12px'}}>
              Portal v1.2 • Kretify Studio
            </div>
          )}
        </div>
      </aside>
      )}

      {/* QR Modal */}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <button className="qr-modal-close" onClick={() => setShowQRModal(false)}>✕</button>
            <div className="qr-modal-header">
              <h2>Install App</h2>
              <p>Add RS Portal to your home screen</p>
            </div>
            {/* Simplified PWA Modal */}
          </div>
        </div>
      )}

      {/* Login As Modal */}
      {showLoginAsModal && (
        <div className="qr-modal-overlay" onClick={() => setShowLoginAsModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h2>Login as Member</h2>
              <input type="text" placeholder="Search members..." value={memberSearch} onChange={handleMemberSearchChange} className="login-search-input" autoFocus />
            </div>
            <div className="login-modal-content">
              {loadingMembers ? <p>Loading...</p> : filteredMembers.slice(0, 10).map(member => (
                <div key={member.id} className="login-member-item" onClick={() => handleLoginAsMember(member.id, member.name || member.Name)}>
                  <div className="login-member-name">{member.name || member.Name}</div>
                  <div className="login-member-arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Only for regular users (Admins use Sidebar) */}
      {!hasAnyAdminPower && (
      <nav className="mobile-bottom-nav persistent-bottom-nav">
        <button 
          className={`nav-item ${activeMenu === 'home' || activeMenu === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleMenuClick('home')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2" strokeLinecap="round"/></svg>
          <span>अगला सत्संग</span>
        </button>
        <button 
          className={`nav-item ${activeMenu === 'store' ? 'active' : ''}`}
          onClick={() => handleMenuClick('store')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="2" strokeLinecap="round"/></svg>
          <span>Store</span>
        </button>
        {isAdmin && (
          <button 
            className={`nav-item ${activeMenu === 'notifications' ? 'active' : ''}`}
            onClick={() => handleMenuClick('notifications')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2" strokeLinecap="round"/></svg>
            <span>Inbox</span>
          </button>
        )}
        <button 
          className={`nav-item ${activeMenu === 'profile' ? 'active' : ''}`}
          onClick={() => handleMenuClick('profile')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2" strokeLinecap="round"/></svg>
          <span>Profile</span>
        </button>
        {!hasAnyAdminPower && (
          <button className="nav-item logout" onClick={() => handleMenuClick('logout')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="2" strokeLinecap="round"/></svg>
            <span>Exit</span>
          </button>
        )}
      </nav>
      )}
    </>
  );
};

export default Navbar;

