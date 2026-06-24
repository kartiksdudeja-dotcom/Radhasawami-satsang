import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar';
import AaglaSatsang from './AaglaSatsang';
import Attendance from './Attendance';
import Members from './Members';
import Branch from './Branch';
import Seva from './Seva';
import Reports from './Reports';
import MemberMaster from './MemberMaster';
import Store from './Store';
import StoreAdmin from './StoreAdmin';
import Profile from './Profile';
import Notification from './Notification';
import SatsangOptions from './SatsangOptions';
import SevaOptions from './SevaOptions';
import SupermanPhase from './SupermanPhase';
import AdminMaster from './AdminMaster';
import SevaCategory from '../components/SevaCategory';
import SevaEntry from '../components/SevaEntry';
import { API_BASE_URL, getAuthHeaders, apiFetch } from '../config/apiConfig';

const Dashboard = ({ onLogout, user }) => {
  const [activeMenu, setActiveMenu] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Permission Logic (Moved to Top) ---
  const isActualAdmin = user?.is_admin === true || user?.is_admin == 1 || String(user?.is_admin).toLowerCase() === "true";
  const canActualManageAttendance = user?.can_manage_attendance === true || user?.can_manage_attendance == 1 || String(user?.can_manage_attendance).toLowerCase() === "true";
  const canActualManageStore = user?.can_manage_store === true || user?.can_manage_store == 1 || String(user?.can_manage_store).toLowerCase() === "true";
  
  const isUserMode = user?.loginMode === 'user';
  const isAdmin = isActualAdmin && !isUserMode;
  const canManageAttendance = canActualManageAttendance && !isUserMode;
  const canManageStore = canActualManageStore && !isUserMode;
  
  const isAdminPower = isAdmin || canManageAttendance || canManageStore;
  const isSidebarLayout = isAdminPower;
  // -----------------------------------------

  const [isProfileComplete, setIsProfileComplete] = useState(() => {
    return user?.is_profile_complete !== false; // Default to true unless explicitly false
  });
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Check profile completion status on mount
  useEffect(() => {
    // Only show loading if we don't know the status yet
    if (user?.is_profile_complete === undefined) {
      checkProfileStatus(true);
    } else {
      checkProfileStatus(false);
    }
  }, [user?.id]);

  const checkProfileStatus = async (shouldShowLoading = false) => {
    try {
      if (!user?.id) return;
      if (shouldShowLoading) setCheckingProfile(true);
      
      const result = await apiFetch(`/api/profile/${user.id}/status`);
      
      if (result && result.success) {
        setIsProfileComplete(result.is_profile_complete);
        
        // Update user object with new status
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.is_profile_complete !== result.is_profile_complete) {
          storedUser.is_profile_complete = result.is_profile_complete;
          localStorage.setItem('user', JSON.stringify(storedUser));
        }

        // If profile is not complete, force user to profile page
        if (!result.is_profile_complete && activeMenu !== 'profile') {
          setActiveMenu('profile');
        }
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
      setIsProfileComplete(true);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleProfileComplete = (complete) => {
    setIsProfileComplete(complete);
    if (complete) {
      setActiveMenu('home');
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handleMenuClick = (menu) => {
    // If profile is not complete, only allow profile page
    if (!isProfileComplete && menu !== 'profile' && menu !== 'logout') {
      alert('⚠️ Please complete your profile first to access other features.');
      setActiveMenu('profile');
      return;
    }
    setActiveMenu(menu);
  };

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  const handleNavigateToEntry = (categoryId) => {
    setActiveMenu(`seva-entry-${categoryId}`);
  };

  // Handle navigation from AaglaSatsang cards
  const handleNavigate = (page) => {
    setActiveMenu(page);
  };

  // Render different content based on active menu
  const renderContent = () => {
    // Show Home page (Aagla Satsang) - Default page
    if (activeMenu === 'home' || activeMenu === 'dashboard') {
      return <AaglaSatsang onNavigate={handleNavigate} user={user} />;
    }

    // Show Store page
    if (activeMenu === 'store') {
      return <Store />;
    }

    // Show Store Admin page (admin or store power)
    if (activeMenu === 'store-admin') {
      if (!canManageStore && !isAdmin) {
        setActiveMenu('home');
        return null;
      }
      return <StoreAdmin />;
    }

    // Show Attendance page
    if (activeMenu === 'attendance') {
      return <Attendance user={user} />;
    }

    // Show Branch page
    if (activeMenu === 'branch') {
      if (!isAdmin) {
        setActiveMenu('home');
        return null;
      }
      return <Branch />;
    }

    // Show Members page
    if (activeMenu === 'members') {
      if (!canManageAttendance) {
        setActiveMenu('home');
        return null;
      }
      return <Members />;
    }

    // Show Member Master page (admin only)
    if (activeMenu === 'member-master') {
      if (!isAdmin && !canManageAttendance) {
        setActiveMenu('home');
        return null;
      }
      try {
        return <MemberMaster />;
      } catch (error) {
        console.error('Error loading Member Master:', error);
        return <div className="error-message">Error loading Member Master: {error.message}</div>;
      }
    }

    // Show Satsang Options page (admin only)
    if (activeMenu === 'satsang-options') {
      if (!isAdmin && !canManageAttendance) {
        setActiveMenu('home');
        return null;
      }
      return <SatsangOptions />;
    }

    // Show Seva Options page (admin only)
    if (activeMenu === 'seva-options') {
      if (!isAdmin && !canManageAttendance) {
        setActiveMenu('home');
        return null;
      }
      return <SevaOptions />;
    }

    // Show Superman Phase page (admin only)
    if (activeMenu === 'superman-phase') {
      if (!isAdmin) {
        setActiveMenu('home');
        return null;
      }
      return <SupermanPhase />;
    }

    // Show Admin Master page (admin only)
    if (activeMenu === 'admin-master') {
      if (!isAdmin) {
        setActiveMenu('home');
        return null;
      }
      return <AdminMaster user={user} />;
    }

    // Show Reports page
    if (activeMenu === 'reports') {
      return <Reports />;
    }

    // Show Attendance Report page
    if (activeMenu === 'report-attendance') {
      return <Reports initialReport="attendance" />;
    }

    // Show Seva Report page
    if (activeMenu === 'report-seva') {
      return <Reports initialReport="seva" />;
    }

    // Show Seva page (accessible from home cards, not navbar)
    if (activeMenu === 'seva') {
      return <Seva />;
    }

    // Show Profile page
    if (activeMenu === 'profile') {
      return <Profile user={user} onProfileComplete={handleProfileComplete} />;
    }

    // Show Notifications page
    if (activeMenu === 'notifications') {
      return <Notification user={user} />;
    }

    // Show Seva Category pages
    if (activeMenu.startsWith('seva-') && !activeMenu.startsWith('seva-entry-')) {
      return <SevaCategory categoryId={activeMenu} onNavigateToEntry={handleNavigateToEntry} />;
    }

    // Show Seva Entry pages
    if (activeMenu.startsWith('seva-entry-')) {
      const categoryId = 'seva-' + activeMenu.replace('seva-entry-', '');
      return <SevaEntry categoryId={categoryId} />;
    }

    // Default - show home page
    return <AaglaSatsang onNavigate={handleNavigate} user={user} />;
  };


  return (
    <div className="dashboard-wrapper">
      {/* Navbar visible with sidebar only for admins */}
      <Navbar 
        onLogout={handleLogout} 
        activeMenu={activeMenu} 
        onMenuClick={handleMenuClick} 
        user={user} 
        onSidebarToggle={handleSidebarToggle}
        isProfileComplete={isProfileComplete}
      />
      
      <div className={`dashboard-container ${isSidebarLayout ? (isSidebarOpen ? 'sidebar-open' : 'sidebar-closed') : 'user-layout-full'} ${activeMenu === 'home' || activeMenu === 'dashboard' ? 'aagla-satsang-active' : ''}`}>
        {checkingProfile ? (
          <div className="profile-checking">
            <div className="loading-spinner"></div>
            <p>Checking profile status...</p>
          </div>
        ) : (
          <div className="dashboard-content">
            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;