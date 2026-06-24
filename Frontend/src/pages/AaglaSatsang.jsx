import React, { useState, useEffect, useRef } from "react";
import "../styles/AaglaSatsang.css";
import MGRSALogo from "../assests/WhatsApp Image 2025-12-20 at 16.55.36.jpeg";
import { API_BASE_URL, getAuthHeaders, apiFetch } from "../config/apiConfig";

const AaglaSatsang = ({ onNavigate, user }) => {
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [latestEvent, setLatestEvent] = useState(null);
  const [announcementKey, setAnnouncementKey] = useState(0);
  const [eventKey, setEventKey] = useState(0);
  const prevAnnouncementId = useRef(null);
  const prevEventId = useRef(null);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    thisMonth: 0,
    lastSatsang: null,
  });

  useEffect(() => {
    fetchEventsAndAnnouncements();
    fetchAttendanceStats();

    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(() => {
      fetchEventsAndAnnouncements();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchEventsAndAnnouncements = async () => {
    try {
      setLoading(true);
      const userId =
        user?.id || JSON.parse(localStorage.getItem("user") || "{}").id;

      // Fetch notifications - events and announcements
      const result = await apiFetch(`/api/notifications?user_id=${userId || ""}`);

      if (result) {
        const notificationsList = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];

        // Separate events and announcements by type
        const eventsList = notificationsList.filter(
          (n) => n.type === "event" || n.message_type === "event" || n.type === "upcoming_event" || n.message_type === "upcoming_event",
        );
        
        // Announcements are everything that isn't an event
        const announcementsList = notificationsList.filter(
          (n) => {
            const isEvent = n.type === "event" || n.message_type === "event" || n.type === "upcoming_event" || n.message_type === "upcoming_event";
            return !isEvent;
          }
        );

        setEvents(eventsList.slice(0, 20));
        setAnnouncements(announcementsList.slice(0, 20));

        // Set latest announcement (only the newest one)
        if (announcementsList.length > 0) {
          const newest = announcementsList[0];
          if (prevAnnouncementId.current !== (newest.id || newest.title)) {
            prevAnnouncementId.current = newest.id || newest.title;
            setAnnouncementKey((k) => k + 1);
          }
          setLatestAnnouncement(newest);
        } else {
          setLatestAnnouncement(null);
        }

        // Set latest event (only the newest one)
        if (eventsList.length > 0) {
          const newestEvent = eventsList[0];
          if (prevEventId.current !== (newestEvent.id || newestEvent.title)) {
            prevEventId.current = newestEvent.id || newestEvent.title;
            setEventKey((k) => k + 1);
          }
          setLatestEvent(newestEvent);
        } else {
          setLatestEvent(null);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const userId =
        user?.id || JSON.parse(localStorage.getItem("user") || "{}").id;
      if (!userId) return;

      const result = await apiFetch(`/api/attendance/member-stats/${userId}`);

      if (result && result.success) {
        setAttendanceStats({
          total: result.data?.total || 0,
          thisMonth: result.data?.thisMonth || 0,
          lastSatsang: result.data?.lastSatsang || null,
        });
      }
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    }
  };

  const handleCardClick = (page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("hi-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return "";
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "अभी अभी";
    if (diffMins < 60) return `${diffMins} मिनट पहले`;
    if (diffHours < 24) return `${diffHours} घंटे पहले`;
    if (diffDays < 7) return `${diffDays} दिन पहले`;
    return formatDate(dateString);
  };

  return (
    <div className="satsang-page-wrapper">

      {/* Live Announcement Banner - Shows latest admin notification */}
      <header className="satsang-header announcement-live-banner" key={`ann-${announcementKey}`}>
        <div className="live-banner-badge">
          <span className="live-dot"></span>
          <span>📢 सूचना</span>
        </div>
        {loading && !latestAnnouncement ? (
          <div className="live-banner-loading">
            <div className="shimmer-line"></div>
            <div className="shimmer-line short"></div>
          </div>
        ) : latestAnnouncement ? (
          <div className="live-banner-content">
            <h2 className="live-banner-title">{latestAnnouncement.title}</h2>
            <p className="live-banner-message">
              {latestAnnouncement.body || latestAnnouncement.message}
            </p>
            <div className="live-banner-meta">
              <span className="live-banner-author">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {latestAnnouncement.author || "प्रशासक"}
              </span>
              <span className="live-banner-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {getTimeAgo(latestAnnouncement.created_at || latestAnnouncement.sent_at)}
              </span>
            </div>
          </div>
        ) : (
          <div className="live-banner-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p>कोई नई सूचना नहीं है</p>
          </div>
        )}
      </header>

      {/* Live Upcoming Event Banner */}
      <div className="event-live-banner" key={`evt-${eventKey}`}>
        <div className="live-banner-badge event-badge">
          <span className="live-dot event-dot"></span>
          <span>📅 अगला सत्संग</span>
        </div>
        {loading && !latestEvent ? (
          <div className="live-banner-loading">
            <div className="shimmer-line"></div>
            <div className="shimmer-line short"></div>
          </div>
        ) : latestEvent ? (
          <div className="live-banner-content">
            <h2 className="live-banner-title">{latestEvent.title}</h2>
            <p className="live-banner-message">
              {latestEvent.body || latestEvent.message}
            </p>
            <div className="live-banner-meta">
              <span className="live-banner-author">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDate(latestEvent.event_date || latestEvent.created_at || latestEvent.sent_at)}
              </span>
              <span className="live-banner-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatTime(latestEvent.event_date || latestEvent.created_at || latestEvent.sent_at)}
              </span>
            </div>
          </div>
        ) : (
          <div className="live-banner-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>कोई आगामी कार्यक्रम नहीं</p>
          </div>
        )}
      </div>

      {/* Section Divider */}
      <div className="section-divider">
        <div className="section-divider-line"></div>
        <span className="section-divider-label">रा–धा / धः–स्व–आ–मी एवं सूचनाएं</span>
        <div className="section-divider-line"></div>
      </div>

      {/* Informational Feed Section - Upcoming Events & Announcements */}
      <section className="content-split-section">
        {/* Upcoming Events Panel */}
        <div className="content-panel">
          <div className="panel-header">
            <span role="img" aria-label="calendar">📅</span>
            <h2 className="panel-title">रा–धा / धः–स्व–आ–मी</h2>
          </div>
          <div className="panel-body">
            {loading ? (
              <div style={{padding: '40px', textAlign: 'center'}}>लोड हो रहा है...</div>
            ) : events.length > 0 ? (
              events.map((event, idx) => (
                <div key={event.id || idx} className="feed-item">
                  <div className="feed-avatar">{event.title?.[0] || "E"}</div>
                  <div className="feed-content-wrapper">
                    <div className="feed-header">
                      <span className="feed-author">सत्संग प्रबंधक</span>
                      <span className="feed-time">{formatDate(event.created_at || event.sent_at)}</span>
                    </div>
                    <div className="feed-title">{event.title}</div>
                    {event.message && <p className="feed-desc" style={{marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>{event.message}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-illustration">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>
                  </svg>
                </div>
                <h3 style={{fontSize: '1.2rem'}}>कोई आगामी कार्यक्रम नहीं</h3>
                <p className="empty-state-text">आने वाले कार्यक्रमों के लिए आप शीघ्र ही अधिसूचनाएं प्राप्त करेंगे।</p>
              </div>
            )}
          </div>
        </div>

        {/* Announcements Panel */}
        <div className="content-panel">
          <div className="panel-header">
            <span role="img" aria-label="announcement">📢</span>
            <h2 className="panel-title">घोषणाएं (Announcements)</h2>
          </div>
          <div className="panel-body">
            {loading ? (
              <div style={{padding: '40px', textAlign: 'center'}}>लोड हो रहा है...</div>
            ) : announcements.length > 0 ? (
              announcements.map((ann, idx) => (
                <div key={ann.id || idx} className="feed-item">
                  <div className="feed-avatar" style={{background: 'var(--primary-gradient)', color: 'white'}}>
                    {ann.author?.[0] || ann.title?.[0] || "A"}
                  </div>
                  <div className="feed-content-wrapper">
                    <div className="feed-header">
                      <span className="feed-author">{ann.author || "प्रशासक"}</span>
                      <span className="feed-time">{formatDate(ann.created_at || ann.sent_at)}</span>
                    </div>
                    <div className="feed-title">{ann.title}</div>
                    {(ann.body || ann.message) && (
                       <div style={{marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                         {ann.body || ann.message}
                       </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-illustration">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8Z"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M6 12h.01"/>
                  </svg>
                </div>
                <p className="empty-state-text">फिलहाल कोई नई घोषणा नहीं है।</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Action Banners - Store & Attendance Cards (below panels) */}
      <section className="action-banners">
        <div className="banner-card action-store-card" onClick={() => handleCardClick("store")}>
          <div className="banner-content">
            <h3>सत्संग स्टोर</h3>
            <p>आध्यात्मिक पुस्तकें, ऑडियो और अन्य प्रामाणिक सामग्री प्राप्त करें।</p>
            <button className="banner-btn">अभी देखें</button>
          </div>
          <div className="banner-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
        </div>

        <div className="banner-card action-attendance-card" onClick={() => handleCardClick("attendance")}>
          <div className="banner-content">
            <h3>आपकी उपस्थिति</h3>
            <p>अपनी उपस्थिति दर्ज करें और अपनी उपस्थिति का विवरण देखें।</p>
            <button className="banner-btn">उपस्थिति देखें</button>
          </div>
          <div className="banner-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
          </div>
        </div>
      </section>

      <footer className="satsang-footer" role="contentinfo">
        🙏 राधा स्वामी दयाल की दया राधा स्वामी सहाय 🙏
      </footer>
    </div>
  );
};

export default AaglaSatsang;

