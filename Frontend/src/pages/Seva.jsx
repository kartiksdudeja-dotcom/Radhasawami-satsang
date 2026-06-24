import React, { useState, useEffect, useMemo } from "react";
import "../styles/Attendance.css";
import { API_ENDPOINTS, apiFetch } from "../config/apiConfig";

const MEMBERS_API = API_ENDPOINTS.MEMBERS;
const SEVA_API = API_ENDPOINTS.SEVA;
const SEVA_MASTER_API = API_ENDPOINTS.SEVA_MASTER || `${API_ENDPOINTS.SEVA}-master`;

const Seva = ({ user }) => {
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  
  // Respect selected login mode (User or Admin)
  const isUserMode = currentUser?.loginMode === 'user' || localStorage.getItem('loginMode') === 'user';
  
  // Strict admin check (Respecting chosen mode)
  const isAdmin = !isUserMode && (
    currentUser?.is_admin === true || 
    currentUser?.is_admin == 1 || 
    String(currentUser?.is_admin).toLowerCase() === "true" ||
    currentUser?.can_manage_attendance === true ||
    currentUser?.can_manage_attendance == 1
  );
  
  const [members, setMembers] = useState([]);
  const [sevaMasterData, setSevaMasterData] = useState([]);
  const [associations, setAssociations] = useState(["Mahila Association", "Youth Association", "Bag Unit", "Copy Unit"]);
  const [currentAssociation, setCurrentAssociation] = useState("Mahila Association");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  
  // Seva specific inputs
  const [hours, setHours] = useState("");
  const [cost, setCost] = useState("");
  const [currentSevaName, setCurrentSevaName] = useState("");

  const [selectedMembers, setSelectedMembers] = useState([]);
  const [submittedRecords, setSubmittedRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [viewType, setViewType] = useState("list"); 
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "", msg: "" });

  const [calendarDate, setCalendarDate] = useState(new Date());

  const showToast = (type, msg) => {
    setToast({ show: true, type, msg });
    setTimeout(() => setToast({ show: false, type: "", msg: "" }), 3500);
  };

  useEffect(() => {
    fetchMembers();
    fetchSevaMasterData();
  }, []);

  useEffect(() => {
    fetchRecordsForRange();
  }, [selectedDate, calendarDate, viewType, members]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      let url = MEMBERS_API;
      if (!isAdmin && currentUser?.id) {
        url = `${MEMBERS_API}/family/${currentUser.id}`;
      }
      const result = await apiFetch(url);
      if (result && result.success) setMembers(result.data);
    } catch (err) {
      showToast("error", "Members load karne mein error aayi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSevaMasterData = async () => {
    try {
      const result = await apiFetch(SEVA_MASTER_API);
      if (result && result.success) {
        setSevaMasterData(result.data);
        // Extract unique associations if they exist in DB, else use defaults
        const uniqueAssoc = Array.from(new Set(result.data.map(item => item.Category))).filter(Boolean);
        if (uniqueAssoc.length > 0) {
          setAssociations(uniqueAssoc);
          setCurrentAssociation(uniqueAssoc[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch seva master data:", err);
    }
  };

  const currentSevaOptions = useMemo(() => {
    const options = sevaMasterData
      .filter(item => item.Category === currentAssociation)
      .map(item => item.SevaName);
    
    if (options.length > 0 && !options.includes(currentSevaName)) {
      setCurrentSevaName(options[0]);
    }
    return options;
  }, [currentAssociation, sevaMasterData]);

  const fetchRecordsForRange = async () => {
    setLoadingRecords(true);
    try {
      let fromDate, toDate;
      if (viewType === 'list') {
        fromDate = selectedDate;
        toDate = selectedDate;
      } else {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        fromDate = new Date(year, month, 1).toISOString().split('T')[0];
        toDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      }

      const url = `${SEVA_API}/report?fromDate=${fromDate}&toDate=${toDate}`;
      const result = await apiFetch(url);
      if (result && result.success) {
        let data = result.data;
        if (!isAdmin && members.length > 0) {
          const familyIds = members.map(m => m.id || m.UserID);
          data = data.filter(r => familyIds.includes(r.member_id || r.UserID));
        }
        setSubmittedRecords(data);
      } else {
        setSubmittedRecords([]);
      }
    } catch {
      setSubmittedRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const filteredMembersForForm = useMemo(() => {
    const lower = debouncedSearchTerm.toLowerCase();
    return members.filter(m => 
      m.name?.toLowerCase().includes(lower) || m.number?.includes(debouncedSearchTerm) || m.uid?.includes(debouncedSearchTerm)
    );
  }, [members, debouncedSearchTerm]);

  const toggleMemberSelection = (member) => {
    const mId = member.id || member.UserID;
    const isSelected = selectedMembers.some(m => (m.id || m.UserID) === mId);
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => (m.id || m.UserID) !== mId));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      showToast("error", "Pehle member chunein!");
      return;
    }
    if (!currentSevaName) {
      showToast("error", "Pehle Seva Type chunein!");
      return;
    }

    setLoading(true);
    try {
      const promises = selectedMembers.map(m => {
        return apiFetch(SEVA_API, {
          method: "POST",
          body: JSON.stringify({
            member_id: m.id || m.UserID,
            category: currentAssociation,
            seva_name: currentSevaName,
            hours: parseFloat(hours) || 0,
            cost: parseFloat(cost) || 0,
            date: selectedDate,
            time: selectedTime
          })
        });
      });
      
      const results = await Promise.all(promises);
      if (results.some(r => !r.success)) {
        throw new Error("Kuch seva records save nahi ho paaye.");
      }

      showToast("success", "✅ Seva records save ho gaye!");
      setSelectedMembers([]);
      setSearchTerm("");
      setHours("");
      setCost("");
      fetchRecordsForRange();
    } catch (err) {
      showToast("error", err.message || "Submit karne mein error aayi.");
    } finally {
      setLoading(false);
    }
  };

  const parseDateSafely = (dateVal) => {
    if (!dateVal) return new Date();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const getMemberNameFromRecord = (record) => {
    if (record.memberName) return record.memberName;
    if (record.name) return record.name;
    const rId = record.member_id || record.UserID;
    const member = members.find(m => (m.id || m.UserID) === rId);
    return member ? member.name : "Member";
  };

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: month - 1, year, currentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month, year, currentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year, currentMonth: false });
    }
    return days;
  }, [calendarDate]);

  const hasRecordOnDay = (dayObj) => {
    const dStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    return submittedRecords.some(r => r.date?.split('T')[0] === dStr || r.SevaDate?.split('T')[0] === dStr);
  };

  return (
    <div className="attendance-page">
      {toast.show && <div className={`att-toast att-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="attendance-header-section">
        <h1 style={{ color: '#047857' }}>सेवा एंट्री (Seva Entry) — <span className="month">{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span></h1>
        <p style={{ color: '#6b7280', marginTop: '-5px' }}>Seva records submit karein aur history dekhein.</p>
      </div>

      <div className="attendance-entry-grid">
        <div className="attendance-card-modern" style={{ borderTop: '4px solid #10b981' }}>
          <div className="card-header-modern">📅 Tarikh & Samay</div>
          <div className="form-group-modern">
            <label>Tarikh (Date)</label>
            <input type="date" className="input-modern" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <div className="form-group-modern">
            <label>Association / Unit</label>
            <select className="input-modern" value={currentAssociation} onChange={(e) => setCurrentAssociation(e.target.value)}>
              {associations.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="attendance-card-modern" style={{ borderTop: '4px solid #10b981' }}>
          <div className="card-header-modern">🛠️ Seva Details</div>
          <div className="form-row-compact">
            <div className="form-group-modern half">
              <label>Hours</label>
              <input type="number" step="0.5" className="input-modern" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="form-group-modern half">
              <label>Cost (if any)</label>
              <input type="number" className="input-modern" placeholder="₹ 0" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="form-group-modern">
            <label>Seva Type</label>
            <div className="category-pills">
              {currentSevaOptions.map(opt => (
                <div 
                  key={opt} 
                  className={`pill-item ${currentSevaName === opt ? 'active' : ''}`} 
                  onClick={() => setCurrentSevaName(opt)}
                  style={{ borderColor: currentSevaName === opt ? '#10b981' : '', color: currentSevaName === opt ? '#059669' : '' }}
                >
                  {opt}
                </div>
              ))}
              {currentSevaOptions.length === 0 && <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>No options for this unit.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="selection-container-fancy">
        <div className="selection-search-header">
          <div className="search-box-fancy">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder={isAdmin ? "Sabhi members mein dhoondhein..." : "Family members mein dhoondhein..."}
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="selection-list-meta">
          <span className="meta-title">{isAdmin ? "All Members" : "Family Members"}</span>
          <span className="meta-count">Showing {filteredMembersForForm.length} members</span>
        </div>

        <div className="fancy-member-list">
          {filteredMembersForForm.map(member => {
            const mId = member.id || member.UserID;
            const isSelected = selectedMembers.some(sm => (sm.id || sm.UserID) === mId);
            return (
              <div 
                key={mId} 
                className={`fancy-member-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleMemberSelection(member)}
              >
                <div className="fancy-avatar">
                  <div className="initial" style={{ color: '#059669' }}>{member.name?.charAt(0)}</div>
                </div>
                <div className="fancy-info">
                  <span className="name">{member.name}</span>
                  <span className="id">ID: {member.uid || member.number || 'N/A'}</span>
                </div>
                <div className="selection-indicator">
                  {isSelected && <span>✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="fancy-submit-bar" style={{ background: '#10b981' }}>
          <button className="btn-fancy-submit" style={{ background: '#10b981' }} onClick={handleSubmit} disabled={loading}>
            <span>➤</span>
            <span>{loading ? "Submitting..." : "Submit Seva Records"}</span>
          </button>
        </div>
      </div>

      <div className="attendance-view-switcher">
        <button className={`view-tab-btn ${viewType === 'list' ? 'active' : ''}`} onClick={() => setViewType('list')}>List View</button>
        <button className={`view-tab-btn ${viewType === 'calendar' ? 'active' : ''}`} onClick={() => setViewType('calendar')}>Calendar</button>
      </div>

      {viewType === 'list' && (
        <>
          <div className="attendance-stats-row">
            <div className="stat-card-modern">
              <span className="stat-label">Total Seva Records</span>
              <span className="stat-number">{submittedRecords.length}</span>
            </div>
          </div>
          <div className="attendance-item-list">
            {submittedRecords.map((record, idx) => {
              const dateObj = parseDateSafely(record.date || record.SevaDate);
              return (
                <div key={`${record.id || 'rec'}-${idx}`} className="attendance-item-card">
                  <div className="date-badge-modern" style={{ background: '#ecfdf5' }}>
                    <span className="month" style={{ color: '#10b981' }}>{dateObj.toLocaleString('default', { month: 'short' })}</span>
                    <span className="day" style={{ color: '#059669' }}>{dateObj.getDate()}</span>
                  </div>
                  <div className="item-content-modern">
                    <span className="shift-name">{getMemberNameFromRecord(record)}</span>
                    <span className="time-range">
                      {record.seva_name || record.SevaName || 'Seva'} • {record.category || record.SevaCategory || 'General'}
                    </span>
                    <span className="time-range" style={{ color: '#059669', fontWeight: '500' }}>
                      {record.hours || 0} Hrs {record.cost > 0 ? `• ₹${record.cost}` : ''}
                    </span>
                  </div>
                  <div className="item-right-modern">
                    <div className="status-pill-modern seva">Done</div>
                  </div>
                </div>
              );
            })}
            {submittedRecords.length === 0 && !loadingRecords && (
              <div className="no-records-message">Aaj koi seva entry nahi mili.</div>
            )}
            {loadingRecords && <div className="no-records-message">Loading records...</div>}
          </div>
        </>
      )}

      {viewType === 'calendar' && (
        <div className="calendar-card-fancy">
          <div className="calendar-header-fancy">
            <button className="calendar-nav-btn" onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))}>←</button>
            <h3>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button className="calendar-nav-btn" onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))}>→</button>
          </div>
          <div className="calendar-grid-fancy">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="calendar-day-label">{d}</div>
            ))}
            {calendarDays.map((dayObj, idx) => {
              const hasRec = hasRecordOnDay(dayObj);
              const isToday = new Date().toDateString() === new Date(dayObj.year, dayObj.month, dayObj.day).toDateString();
              return (
                <div 
                  key={idx} 
                  className={`calendar-day-cell ${!dayObj.currentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${hasRec ? 'has-record' : ''}`}
                  style={{ borderColor: isToday ? '#10b981' : '', background: hasRec ? '#f0fdf4' : '' }}
                >
                  {dayObj.day}
                  {hasRec && <div className="record-dot" style={{ background: '#10b981' }}></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Seva;
