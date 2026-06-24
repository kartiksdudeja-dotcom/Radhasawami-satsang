import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config/apiConfig';
import '../styles/Notification.css';

// Type icon map
const TYPE_ICONS = {
  attendance: '📋',
  seva: '🙏',
  store: '🛒',
  event: '📅',
  upcoming_event: '📅',
  general: '📢',
};

const Notification = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [secureContext, setSecureContext] = useState({ secure: true, reason: '' });

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [sendToUserId, setSendToUserId] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messageType, setMessageType] = useState('general');
  const [sendPush, setSendPush] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendStatus, setSendStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      setSecureContext({ secure: true, reason: 'localhost' });
    } else if (protocol === 'https:') {
      setSecureContext({ secure: true, reason: 'https' });
    } else {
      setSecureContext({ secure: false, reason: `Push notifications require HTTPS` });
    }

    loadNotifications();
    checkPushSupport();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(user.is_admin === true || user.is_admin === 'true');
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await apiFetch('/api/notifications');
      if (result && result.data) {
        setNotifications(Array.isArray(result.data) ? result.data : []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
        setPushEnabled(!!sub);
        setPermissionStatus(window.Notification?.permission || 'default');
      } else if ('Notification' in window) {
        setPermissionStatus(window.Notification.permission);
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error checking push:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i);
    return arr;
  };

  const sendSubscriptionToServer = async (sub) => {
    try {
      await apiFetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    } catch (error) {
      console.error('❌ Error saving subscription:', error);
    }
  };

  const subscribeUserToNotifications = async () => {
    try {
      if (!secureContext.secure) { alert(`⚠️ ${secureContext.reason}`); return; }
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
      if (!vapidPublicKey) { alert('⚠️ VAPID key not configured'); return; }
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await sendSubscriptionToServer(sub);
      setSubscription(sub);
      setPushEnabled(true);
    } catch (error) {
      console.error('❌ Subscribe error:', error);
      alert('Failed to enable push: ' + error.message);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) { alert('⚠️ Not supported in this browser'); return; }
    const permission = await window.Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        await subscribeUserToNotifications();
      }
    } else if (permission === 'denied') {
      alert('⚠️ Notification permission denied. Enable it in browser settings.');
    }
  };

  const unsubscribeFromNotifications = async () => {
    if (!subscription) return;
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setPushEnabled(false);
    } catch (error) {
      alert('Failed to disable: ' + error.message);
    }
  };

  const markAsRead = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: 1 } : n))
      );
    } catch (error) {
      console.error('❌ Mark read error:', error);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('❌ Delete error:', error);
    }
  };

  const sendNotificationMessage = async (e) => {
    e.preventDefault();
    if (!messageTitle.trim() || !messageBody.trim()) return;
    try {
      setSendingMessage(true);
      setSendStatus({ type: '', message: '' });
      const result = await apiFetch('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          uid: sendToAll ? null : sendToUserId || null,
          title: messageTitle,
          message: messageBody,
          type: messageType,
          sendPush,
          send_to_all: sendToAll,
        }),
      });
      if (result && result.success) {
        setSendStatus({ type: 'success', message: '✅ Notification sent successfully!' });
        setMessageTitle('');
        setMessageBody('');
        setSendToUserId('');
        loadNotifications();
      } else {
        setSendStatus({ type: 'error', message: '❌ ' + (result?.error || 'Failed to send') });
      }
    } catch (error) {
      setSendStatus({ type: 'error', message: '❌ ' + error.message });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!onNavigate) return;
    if (!notification.read) markAsRead(notification.id);
    const type = notification.type || notification.message_type;
    if (['event', 'upcoming_event'].includes(type)) onNavigate('home');
    else if (['store', 'attendance', 'seva', 'profile'].includes(type)) onNavigate(type);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-avatar" />
      <div className="skeleton-content">
        <div className="skeleton-line title" />
        <div className="skeleton-line" style={{ width: '80%' }} />
        <div className="skeleton-line" style={{ width: '50%' }} />
      </div>
    </div>
  );

  return (
    <div className="notification-container">
      {/* Insecure Context Warning */}
      {!secureContext.secure && (
        <div className="insecure-context-warning">
          <div className="warning-icon">⚠️</div>
          <div>
            <h3>Push Notifications Unavailable</h3>
            <p>{secureContext.reason}. Use localhost or HTTPS.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="notification-header">
        <div className="header-content">
          <h1>🔔 Notifications</h1>
          <p className="header-subtitle">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="notification-controls">
          <button
            className={`push-notify-btn ${pushEnabled ? 'enabled' : ''}`}
            onClick={pushEnabled ? unsubscribeFromNotifications : requestNotificationPermission}
            disabled={!secureContext.secure}
          >
            {pushEnabled ? '🔔 Push ON' : '🔕 Enable Push'}
          </button>
          <button className="refresh-btn" onClick={loadNotifications} disabled={loading}>
            {loading ? '⏳' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Permission Status Card */}
      {permissionStatus === 'denied' && (
        <div className="permission-card denied">
          <div className="permission-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <div className="permission-content">
            <p className="permission-title">Notifications Blocked</p>
            <p className="permission-desc">You've blocked notifications. Go to browser Settings → Site Permissions → Notifications to allow them.</p>
          </div>
        </div>
      )}

      {/* Admin Broadcast Panel */}
      {isAdmin && (
        <div className="admin-card">
          <div className="admin-header">
            <div className="admin-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.25 9.09 19.79 19.79 0 01.21 .45 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <div>
              <h2 className="admin-title">📢 Broadcast Center</h2>
              <p className="admin-subtitle">Send notifications to members</p>
            </div>
          </div>

          <form onSubmit={sendNotificationMessage} className="admin-form">
            {/* Send to All Toggle */}
            <div className={`send-to-all-toggle ${sendToAll ? 'active' : ''}`}>
              <label className="toggle-label">
                <div className="toggle-info">
                  <span className="toggle-text">Send to All Members</span>
                  <span className="toggle-desc">
                    {sendToAll ? '📡 Broadcasting to every member' : 'Enter a User ID to target one person'}
                  </span>
                </div>
                <div className="switch-wrapper">
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={sendToAll}
                    onChange={(e) => setSendToAll(e.target.checked)}
                  />
                  <span className="switch-slider" />
                </div>
              </label>
            </div>

            <div className="form-grid">
              {!sendToAll && (
                <div className="form-group">
                  <label>Target User ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 123"
                    value={sendToUserId}
                    onChange={(e) => setSendToUserId(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Type</label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="form-select"
                >
                  <option value="general">📢 General</option>
                  <option value="attendance">📋 Attendance</option>
                  <option value="seva">🙏 Seva</option>
                  <option value="store">🛒 Store</option>
                  <option value="event">📅 Event</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="Notification title"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Message *</label>
                <textarea
                  placeholder="Write your message here..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="form-textarea"
                  rows="3"
                  required
                />
                <span className="char-count">{messageBody.length} chars</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem' }}>
                <input
                  type="checkbox"
                  checked={sendPush}
                  onChange={(e) => setSendPush(e.target.checked)}
                />
                Also send push notification
              </label>
              <button type="submit" disabled={sendingMessage} className={`submit-btn ${sendingMessage ? 'loading' : ''}`}>
                {sendingMessage ? '⏳ Sending...' : '📤 Send Notification'}
              </button>
            </div>

            {sendStatus.message && (
              <div className={`status-message status-${sendStatus.type}`}>
                {sendStatus.message}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Notifications List */}
      <div className="notifications-list-container">
        <div className="list-header">
          <h2 className="list-title">📬 Recent Activity</h2>
          <span className="badge">{notifications.length} total</span>
          {unreadCount > 0 && (
            <span className="badge" style={{ background: '#eef2ff', color: '#6366f1' }}>
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="notifications-grid">
          {loading ? (
            <div className="skeleton-container">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-wrapper">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <h3 className="empty-title">All clear!</h3>
              <p className="empty-desc">No notifications yet. Check back later.</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const type = notification.type || 'general';
              const icon = TYPE_ICONS[type] || '📢';
              const isUnread = !notification.read;
              return (
                <div
                  key={notification.id}
                  className={`notification-card ${isUnread ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`notification-icon-badge type-${type}`}>
                    <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                  </div>

                  <div className="notification-details">
                    <div className="notification-card-header">
                      <h3 className="notif-title">{notification.title}</h3>
                      <span className="notif-time">
                        {new Date(notification.created_at || notification.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="notif-message">{notification.message}</p>
                  </div>

                  <div className="notification-actions">
                    {isUnread && (
                      <button
                        className="action-btn mark-read"
                        onClick={(e) => markAsRead(notification.id, e)}
                        title="Mark as read"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    )}
                    <button
                      className="action-btn delete"
                      onClick={(e) => deleteNotification(notification.id, e)}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m5 0V4h4v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reset Push */}
      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <button
          onClick={async () => {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (let r of regs) await r.unregister();
              alert('Push system reset. Refresh and re-enable notifications.');
              window.location.reload();
            }
          }}
          style={{
            color: '#ef4444', background: 'none', border: '1px solid #ef4444',
            padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem'
          }}
        >
          🔄 Reset Push Notification System
        </button>
      </div>
    </div>
  );
};

export default Notification;
