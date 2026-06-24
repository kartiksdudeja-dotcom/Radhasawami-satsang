import React, { useState, useEffect, useMemo } from "react";
import "../styles/Attendance.css";
import { API_ENDPOINTS, apiFetch } from "../config/apiConfig";

const MEMBERS_API = API_ENDPOINTS.MEMBERS;
const ATTENDANCE_API = API_ENDPOINTS.ATTENDANCE;
const SEVA_API = API_ENDPOINTS.SEVA;

const getShiftFromHour = (hour) => {
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 18) return "Evening";
  return "Night";
};

const Attendance = ({ user }) => {
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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [selectedShift, setSelectedShift] = useState(() => getShiftFromHour(new Date().getHours()));
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [submittedRecords, setSubmittedRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("attendance"); 
  const [viewType, setViewType] = useState("list"); 
  const [currentCategory, setCurrentCategory] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "", msg: "" });

  // Seva specific states
  const [sevaMasterData, setSevaMasterData] = useState([]);
  const [sevaCategories, setSevaCategories] = useState(["Mahila Association", "Youth Association", "Bag Unit", "Copy Unit"]);
  const [currentSevaCategory, setCurrentSevaCategory] = useState("Mahila Association");
  const [hours, setHours] = useState("");
  const [cost, setCost] = useState("");

  const [calendarDate, setCalendarDate] = useState(new Date());

  const showToast = (type, msg) => {
    setToast({ show: true, type, msg });
    setTimeout(() => setToast({ show: false, type: "", msg: "" }), 3500);
  };

  useEffect(() => {
    fetchMembers();
    fetchCategories();
    fetchSevaMasterData();
  }, []);

  const fetchSevaMasterData = async () => {
    try {
      const SEVA_MASTER_API = API_ENDPOINTS.SEVA_MASTER || `${API_ENDPOINTS.SEVA}-master`;
      const result = await apiFetch(SEVA_MASTER_API);
      if (result && result.success) {
        setSevaMasterData(result.data);
        const uniqueAssoc = Array.from(new Set(result.data.map(item => item.Category))).filter(Boolean);
        if (uniqueAssoc.length > 0) {
          setSevaCategories(uniqueAssoc);
          setCurrentSevaCategory(uniqueAssoc[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch seva master data:", err);
    }
  };

  useEffect(() => {
    fetchRecordsForRange();
  }, [selectedDate, calendarDate, viewType, viewMode, members]); 

  const currentSevaOptions = useMemo(() => {
    return sevaMasterData
      .filter(item => item.Category === currentSevaCategory)
      .map(item => item.SevaName);
  }, [currentSevaCategory, sevaMasterData]);

  useEffect(() => {
    if (viewMode === 'seva' && currentSevaOptions.length > 0 && !currentSevaOptions.includes(currentCategory)) {
      setCurrentCategory(currentSevaOptions[0]);
    }
  }, [viewMode, currentSevaOptions]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      let url = MEMBERS_API;
      // APPLY OLD LOGIC: Only family for non-admins
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

  const fetchCategories = async () => {
    try {
      const result = await apiFetch(API_ENDPOINTS.SATSANG_CATEGORIES);
      if (result && result.success) {
        setCategories(result.data);
        if (result.data.length > 0) {
          setCurrentCategory(result.data[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

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

      const url = viewMode === "attendance"
        ? `${ATTENDANCE_API}/by-date?fromDate=${fromDate}&toDate=${toDate}`
        : `${SEVA_API}/report?fromDate=${fromDate}&toDate=${toDate}`;
      
      const result = await apiFetch(url);
      if (result && result.success) {
        let data = result.data;
        
        // APPLY OLD LOGIC: Filter history to only show family members for non-admins
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
    setLoading(true);
    try {
      if (viewMode === 'attendance') {
        const payload = {
          date: selectedDate,
          shift: selectedShift,
          time: selectedTime,
          members: selectedMembers.map(m => ({
            id: m.id || m.UserID,
            category: currentCategory
          }))
        };
        const result = await apiFetch(ATTENDANCE_API, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (!result.success) throw new Error(result.message);
      } else {
        if (!currentCategory) throw new Error("Pehle Seva Type chunein!");
        
        const promises = selectedMembers.map(m => {
          return apiFetch(SEVA_API, {
            method: "POST",
            body: JSON.stringify({
              member_id: m.id || m.UserID,
              category: currentSevaCategory,
              seva_name: currentCategory,
              hours: parseFloat(hours) || 0,
              cost: parseFloat(cost) || 0,
              date: selectedDate,
              time: selectedTime
            })
          });
        });
        const results = await Promise.all(promises);
        if (results.some(r => !r.success)) throw new Error("Kuch seva records save nahi ho paaye.");
      }

      showToast("success", `✅ ${viewMode === 'attendance' ? 'Attendance' : 'Seva'} records save ho gaye!`);
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
    if (typeof dateVal === 'string' && dateVal.includes('/')) {
      const parts = dateVal.split('/');
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formatTimeDisplay = (timeVal) => {
    if (!timeVal) return "09:00 AM";
    if (typeof timeVal === 'string' && timeVal.includes('T')) {
      const parts = timeVal.split('T');
      if (parts[1]) return parts[1].substring(0, 5);
    }
    return String(timeVal).substring(0, 5);
  };

  const getMemberNameFromRecord = (record) => {
    if (record.memberName) return record.memberName;
    if (record.name) return record.name;
    const rId = record.member_id || record.UserID;
    const member = members.find(m => (m.id || m.UserID) === rId);
    return member ? member.name : "Member";
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const prevMonthDays = getDaysInMonth(year, month - 1);
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

  const changeCalendarMonth = (offset) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCalendarDate(newDate);
  };

  const hasRecordOnDay = (dayObj) => {
    const dStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    const dStrAlt = `${String(dayObj.day).padStart(2, '0')}/${String(dayObj.month + 1).padStart(2, '0')}/${dayObj.year}`;
    
    return submittedRecords.some(r => {
      if (!r.date && !r.SevaDate) return false;
      const rDateVal = r.date || r.SevaDate;
      const rDate = rDateVal.split('T')[0];
      return rDate === dStr || rDateVal === dStr || rDateVal === dStrAlt;
    });
  };

  return (
    <div className="attendance-page">
      {toast.show && <div className={`att-toast att-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="attendance-header-section">
        <h1>उपस्थिति — <span className="month">{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span></h1>
      </div>

      <div className="mode-switcher-modern">
        <button className={`mode-btn ${viewMode === 'attendance' ? 'active' : ''}`} onClick={() => setViewMode('attendance')}>
          Satsang
        </button>
        <button className={`mode-btn ${viewMode === 'seva' ? 'active' : ''}`} onClick={() => setViewMode('seva')}>
          Seva
        </button>
      </div>

      <div className="attendance-entry-grid">
        <div className="attendance-card-modern">
          <div className="card-header-modern">📅 Tarikh & Samay</div>
          <div className="form-group-modern">
            <label>Tarikh (Date)</label>
            <input type="date" className="input-modern" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <div className="form-group-modern">
            <label>Samay (Time)</label>
            <input type="time" className="input-modern" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
          </div>
        </div>

        <div className="attendance-card-modern">
          <div className="card-header-modern">{viewMode === 'attendance' ? '✨ Details' : '🛠️ Seva Details'}</div>
          
          {viewMode === 'attendance' ? (
            <>
              <div className="form-group-modern">
                <label>Shift</label>
                <select className="input-modern" value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              <div className="form-group-modern">
                <label>Category</label>
                <div className="category-pills">
                  {categories.map(cat => (
                    <div key={cat.id} className={`pill-item ${currentCategory === cat.name ? 'active' : ''}`} onClick={() => setCurrentCategory(cat.name)}>
                      {cat.name.replace(" Satsang", "")}
                    </div>
                  ))}
                  {categories.length === 0 && <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>Loading categories...</span>}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group-modern">
                <label>Association / Unit</label>
                <select className="input-modern" value={currentSevaCategory} onChange={(e) => setCurrentSevaCategory(e.target.value)}>
                  {sevaCategories.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="form-row-compact" style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group-modern" style={{ flex: 1 }}>
                  <label>Hours</label>
                  <input type="number" step="0.5" className="input-modern" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
                <div className="form-group-modern" style={{ flex: 1 }}>
                  <label>Cost</label>
                  <input type="number" className="input-modern" placeholder="₹ 0" value={cost} onChange={(e) => setCost(e.target.value)} />
                </div>
              </div>
              <div className="form-group-modern">
                <label>Seva Type</label>
                <div className="category-pills">
                  {currentSevaOptions.map(opt => (
                    <div key={opt} className={`pill-item ${currentCategory === opt ? 'active' : ''}`} onClick={() => setCurrentCategory(opt)}>
                      {opt}
                    </div>
                  ))}
                  {currentSevaOptions.length === 0 && <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>Loading seva types...</span>}
                </div>
              </div>
            </>
          )}
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
                  <div className="initial">{member.name?.charAt(0)}</div>
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

        <div className="fancy-submit-bar" style={{ background: selectedMembers.length > 0 ? (viewMode === 'attendance' ? '#1e40af' : '#10b981') : '#94a3b8' }}>
          <button 
            className="btn-fancy-submit" 
            style={{ background: selectedMembers.length > 0 ? (viewMode === 'attendance' ? '#1e40af' : '#10b981') : '#94a3b8', cursor: selectedMembers.length === 0 ? 'not-allowed' : 'pointer' }}
            onClick={handleSubmit} 
            disabled={loading || selectedMembers.length === 0}
          >
            <span>➤</span>
            <span>{loading ? "Submitting..." : (selectedMembers.length > 0 ? `Submit ${selectedMembers.length} ${viewMode === 'attendance' ? 'Attendance' : 'Seva'} Records` : "Select Members First")}</span>
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
              <span className="stat-label">Total Records</span>
              <span className="stat-number">{submittedRecords.length}</span>
            </div>
            <div className="stat-card-modern">
              <span className="stat-label">Total Days</span>
              <span className="stat-number">{new Set(submittedRecords.map(r => (r.date || r.SevaDate)?.split('T')[0])).size}</span>
            </div>
          </div>
          
          <div className="attendance-item-list">
            {submittedRecords.map((record, idx) => {
              const dateObj = parseDateSafely(record.date || record.SevaDate);
              return (
                <div key={`${record.id || 'rec'}-${idx}`} className="attendance-item-card">
                  <div className="date-badge-modern">
                    <span className="month">{dateObj.toLocaleString('default', { month: 'short' })}</span>
                    <span className="day">{dateObj.getDate()}</span>
                  </div>
                  <div className="item-content-modern">
                    <span className="shift-name">{getMemberNameFromRecord(record)}</span>
                    <span className="time-range">
                      {viewMode === 'attendance' 
                        ? `${record.shift || record.category || 'Present'} • ${formatTimeDisplay(record.time)}`
                        : `${record.seva_name || 'Seva'} • ${record.category || 'General'} • ${record.hours || 0} Hrs`
                      }
                    </span>
                  </div>
                  <div className="item-right-modern">
                    <div className={`status-pill-modern ${String(record.category || record.SevaName).toLowerCase().includes('seva') ? 'seva' : 'community'}`}>
                      {String(record.category || record.SevaName).toLowerCase().includes('seva') ? 'Seva' : 'Community'}
                    </div>
                  </div>
                </div>
              );
            })}
            {submittedRecords.length === 0 && !loadingRecords && (
              <div className="no-records-message">Aaj koi records nahi mile.</div>
            )}
            {loadingRecords && <div className="no-records-message">Loading records...</div>}
          </div>
        </>
      )}

      {viewType === 'calendar' && (
        <div className="calendar-card-fancy">
          <div className="calendar-header-fancy">
            <button className="calendar-nav-btn" onClick={() => changeCalendarMonth(-1)}>←</button>
            <h3>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button className="calendar-nav-btn" onClick={() => changeCalendarMonth(1)}>→</button>
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
                >
                  {dayObj.day}
                  {hasRec && <div className="record-dot"></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
