import React, { useState, useEffect } from "react";
import "../styles/Branch.css";
import { API_ENDPOINTS, getAuthHeaders, apiFetch } from "../config/apiConfig";

const MEMBERS_API = API_ENDPOINTS.MEMBERS;
const ATTENDANCE_API = API_ENDPOINTS.ATTENDANCE;

const Branch = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("all");
  const [searchPerson, setSearchPerson] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(50);
  const [timeSlots] = useState([
    { id: "morning", label: "🌅 Morning (5:00 AM - 12:00 PM)", start: 5, end: 12 },
    { id: "evening", label: "🌤️ Evening (12:00 PM - 6:00 PM)", start: 12, end: 18 },
    { id: "night", label: "🌙 Night (6:00 PM - 5:00 AM)", start: 18, end: 5 },
  ]);
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('satsangCategories');
    return saved ? JSON.parse(saved) : [
      "Video Satsang (DB/MPG)",
      "Branch Satsang",
      "Audio Satsang",
    ];
  });
  const [statCategories, setStatCategories] = useState(() => {
    const saved = localStorage.getItem("statCategories");
    return saved
      ? JSON.parse(saved)
      : [
          "Initiated",
          "Jigyasu",
          "Children",
          "Phase 1",
          "Phase 2",
          "PRIMARY 1",
          "PRIMARY 2",
        ];
  });
  const [showAddStatCategory, setShowAddStatCategory] = useState(false);
  const [newStatCategory, setNewStatCategory] = useState("");
  const [memberStatMap, setMemberStatMap] = useState(() => {
    const saved = localStorage.getItem("memberStatMap");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    fetchMembers();
    fetchAttendanceRecords();
    fetchPhases();
  }, []);

  const fetchPhases = async () => {
    try {
      const result = await apiFetch(API_ENDPOINTS.SUPERMAN_PHASES);
      if (result && result.success && result.data.length > 0) {
        // Extract unique phase names to use as categories
        const phaseNames = Array.from(new Set(result.data.map(p => p.PhaseName)));
        setStatCategories(["Initiated", "Jigyasu", ...phaseNames]);
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
  };

  useEffect(() => {
    localStorage.setItem("statCategories", JSON.stringify(statCategories));
  }, [statCategories]);

  useEffect(() => {
    localStorage.setItem("memberStatMap", JSON.stringify(memberStatMap));
  }, [memberStatMap]);

  // Debug effect - log filter values
  useEffect(() => {
    console.log("=== FILTER DEBUG ===");
    console.log("Total Records:", attendanceRecords.length);
    console.log("From Date (filter):", fromDate);
    console.log("To Date (filter):", toDate);
    console.log("Time Slot:", selectedTimeSlot);
    console.log("Category:", selectedCategory);
    console.log("Search Person:", searchPerson);
    if (attendanceRecords.length > 0) {
      console.log("Sample Record:", attendanceRecords[0]);
      console.log("Sample Record Date:", attendanceRecords[0].date);
      console.log("Sample Record Time:", attendanceRecords[0].time);
    }
    
    // Show date range if set
    if (fromDate || toDate) {
      console.log("Date Range Check:");
      const samplesInRange = attendanceRecords.filter(r => {
        let recordDate = r.date;
        let normalizedDate = null;
        
        // Handle MM/DD/YYYY format (with "/" separator)
        if (recordDate && recordDate.includes("/")) {
          const parts = recordDate.split("/");
          if (parts.length === 3) {
            const day = parts[0].padStart(2, "0");    // Day is first in DD/MM/YYYY
            const month = parts[1].padStart(2, "0");  // Month is second
            const year = parts[2];
            normalizedDate = `${year}-${month}-${day}`;
          }
        } else if (recordDate && recordDate.includes("-") && recordDate.length === 10) {
          // Handle MM-DD-YYYY format (with "-" separator)
          const parts = recordDate.split("-");
          if (parts[0].length === 2) {
            normalizedDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
          }
        } else {
          normalizedDate = recordDate;
        }
        
        const dateOk = (!fromDate || normalizedDate >= fromDate) && (!toDate || normalizedDate <= toDate);
        return dateOk;
      });
      console.log(`Records in date range: ${samplesInRange.length}`);
      if (samplesInRange.length > 0) {
        console.log("Sample in range:", samplesInRange[0]);
      }
    }
  }, [fromDate, toDate, selectedTimeSlot, selectedCategory, searchPerson, attendanceRecords]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await apiFetch(MEMBERS_API);
      if (result && result.success) {
        setMembers(result.data);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const result = await apiFetch(ATTENDANCE_API);
      if (result && result.success) {
        setAttendanceRecords(result.data);
      }
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    }
  };

  // Get member details by ID - MOVED UP to avoid reference error
  const getMemberDetails = (memberId) => {
    return members.find((m) => m.id === memberId);
  };

  // Helper function to check if time falls in slot
  const isTimeInSlot = (time, slotId) => {
    if (!time) return true; // If no time specified, include in all slots
    
    try {
      let hours = null;
      
      // Handle ISO timestamp format (1970-01-01T03:48:15.000Z)
      if (time.includes("T")) {
        const timePart = time.split("T")[1]; // Get "03:48:15.000Z"
        hours = parseInt(timePart.split(":")[0], 10);
      } else {
        // Handle HH:MM format
        hours = parseInt(time.split(":")[0], 10);
      }
      
      if (isNaN(hours)) {
        console.warn("Invalid time format:", time);
        return true;
      }
      
      const matches = {
        morning: hours >= 5 && hours < 12,
        evening: hours >= 12 && hours < 18,
        night: hours >= 18 || hours < 5,
      };
      
      const result = matches[slotId] || false;
      // Uncomment below for debugging
      // console.log(`Time: ${time} (${hours}h), Slot: ${slotId}, Match: ${result}`);
      return result;
    } catch (error) {
      console.error("Error parsing time:", time, error);
      return true;
    }
  };

  // Add new stat category to Superman Phase Master Database
  const addStatCategory = async () => {
    const categoryName = newStatCategory.trim();
    if (!categoryName) return;

    if (statCategories.includes(categoryName)) {
      alert("Category already exists!");
      return;
    }

    try {
      const result = await apiFetch(API_ENDPOINTS.SUPERMAN_PHASES, {
        method: "POST",
        body: JSON.stringify({ phaseName: categoryName }),
      });

      if (result && result.success) {
        setNewStatCategory("");
        setShowAddStatCategory(false);
        fetchPhases(); // Refresh list from backend
      } else if (result) {
        alert("Error adding category: " + result.error);
      }
    } catch (error) {
      console.error("Error saving category to database:", error);
      alert("Failed to save category. Please try again.");
    }
  };

  // Delete stat category from Superman Phase Master Database
  const deleteStatCategory = async (categoryToDelete) => {
    // Cannot delete core categories
    if (["Initiated", "Jigyasu"].includes(categoryToDelete)) {
      alert("Core categories cannot be deleted.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the category "${categoryToDelete}"?`)) {
      return;
    }

    try {
      // First, get the ID of the phase to delete
      const phasesResult = await apiFetch(API_ENDPOINTS.SUPERMAN_PHASES);
      
      if (phasesResult && phasesResult.success) {
        const phase = phasesResult.data.find(p => p.PhaseName === categoryToDelete);
        
        if (phase) {
          // Delete from database
          const deleteResult = await apiFetch(`${API_ENDPOINTS.SUPERMAN_PHASES}/${phase.ID}`, {
            method: 'DELETE'
          });
          
          if (deleteResult && deleteResult.success) {
            fetchPhases(); // Refresh list from backend
          } else if (deleteResult) {
            alert("Error deleting category: " + deleteResult.error);
          }
        } else {
          // Fallback: Just remove from local state if not found in DB
          setStatCategories(statCategories.filter((c) => c !== categoryToDelete));
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category.");
    }
  };

  // Filter records based on date range, category, time slot, and person name
  // MODIFICATION: Only show records if date range is set
  const filteredRecords = (!fromDate || !toDate) ? [] : attendanceRecords.filter((record) => {
    // Date range filter - Handle MM/DD/YYYY format from database
    let dateMatch = true;
    
    if (fromDate || toDate) {
      let recordDate = record.date; // Format: "3/12/2025" (MM/DD/YYYY)
      let normalizedDate = null;
      
      if (recordDate) {
        // Convert MM/DD/YYYY to YYYY-MM-DD format
        const parts = recordDate.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");    // Day is first in DD/MM/YYYY
          const month = parts[1].padStart(2, "0");  // Month is second
          const year = parts[2];
          normalizedDate = `${year}-${month}-${day}`;
        }
      }
      
      // Uncomment below for debugging date conversions
      // console.log(`Record date: ${recordDate} -> Normalized: ${normalizedDate}, Filter from: ${fromDate}, to: ${toDate}`);
      
      if (normalizedDate) {
        if (fromDate && normalizedDate < fromDate) {
          dateMatch = false;
        }
        if (toDate && normalizedDate > toDate) {
          dateMatch = false;
        }
      } else {
        dateMatch = false; // If can't parse date, exclude it
      }
    }
    
    // Time slot filter
    const timeMatch = 
      selectedTimeSlot === "all" || 
      isTimeInSlot(record.time, selectedTimeSlot);
    
    // Category match - if no members, still include the record
    const categoryMatch =
      selectedCategory === "all" ||
      !record.members ||
      record.members.length === 0 ||
      record.members.some((m) => m?.category === selectedCategory);
    
    // Filter by person name
    const personMatch = !searchPerson.trim() ||
      !record.members ||
      record.members.length === 0 ||
      record.members.some((m) => {
        const memberName = getMemberDetails(m?.id)?.name || "";
        return memberName.toLowerCase().includes(searchPerson.toLowerCase());
      });
    
    return dateMatch && timeMatch && categoryMatch && personMatch;
  });

  // Get unique categories from records
  const recordCategories = Array.from(
    new Set(
      attendanceRecords.flatMap((r) =>
        r.members && r.members.length > 0
          ? r.members.map((m) => m?.category)
          : []
      )
    )
  ).filter(Boolean);

  const allCategories = Array.from(
    new Set([...categories, ...recordCategories])
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Group records by date
  const recordsByDate = {};
  paginatedRecords.forEach((record) => {
    if (!recordsByDate[record.date]) {
      recordsByDate[record.date] = [];
    }
    recordsByDate[record.date].push(record);
  });

  // Calculate statistics by stat category
  const calculateStatsByCategory = () => {
    const stats = {
      gents: {},
      ladies: {},
      total: {},
    };

    statCategories.forEach((statCat) => {
      stats.gents[statCat] = 0;
      stats.ladies[statCat] = 0;
      stats.total[statCat] = 0;
    });

    filteredRecords.forEach((record) => {
      if (record.members && record.members.length > 0) {
        record.members.forEach((member) => {
          const statCategory = member.stat_category || statCategories[0];

          if (statCategories.includes(statCategory)) {
            stats.total[statCategory]++;

            // Use gender from database
            const memberDetails = getMemberDetails(member.id);
            const gender = memberDetails?.gender || member.gender;

            if (gender === "Female" || gender === "F") {
              stats.ladies[statCategory]++;
            } else {
              stats.gents[statCategory]++;
            }
          }
        });
      }
    });

    return stats;
  };

  const stats = calculateStatsByCategory();

  const handleDeleteRecord = async (recordId) => {
    if (
      !window.confirm("Are you sure you want to delete this attendance record?")
    ) {
      return;
    }

    try {
      const result = await apiFetch(`${ATTENDANCE_API}/${recordId}`, {
        method: "DELETE",
      });

      if (result && result.success) {
        alert("Record deleted successfully!");
        fetchAttendanceRecords();
      } else if (result) {
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  const handleDeleteMember = async (recordId, memberId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this member from attendance?"
      )
    ) {
      return;
    }

    try {
      const result = await apiFetch(
        `${ATTENDANCE_API}/${recordId}/member/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (result && result.success) {
        alert("Member deleted from attendance!");
        fetchAttendanceRecords();
      } else if (result) {
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    // Format date - database stores as DD/MM/YYYY
    if (!dateString) return "";
    
    // If already in DD/MM/YYYY format, return as DD-MM-YYYY for display
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
    }
    
    // If in YYYY-MM-DD format, convert to DD-MM-YYYY
    if (dateString.includes('-')) {
      const datePart = dateString.split('T')[0]; // Remove time if present
      const parts = datePart.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    
    return dateString; // Return original if format unknown
  };

  const formatTime = (timeString) => {
    // Extract only HH:MM from time string (could be HH:MM:SS or ISO format)
    if (!timeString) return "";
    
    // If it's ISO format with Z, extract time portion
    if (timeString.includes('T')) {
      const timePart = timeString.split('T')[1];
      return timePart.substring(0, 5); // Get HH:MM
    }
    
    // If it's already HH:MM or HH:MM:SS format
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    
    return timeString;
  };

  return (
    <div className="branch-container">
      <div className="page-header">
        <h1>📊 Attendance For All Person</h1>
        <p className="header-subtitle">December - 2025</p>
      </div>

      {/* Statistics Table with Categories */}
      <div className="stats-card">
        <div className="stats-header">
          <div className="header-top">
            <h2>Attendance Summary - Categories Breakdown</h2>
            <button
              className="add-btn"
              onClick={() => setShowAddStatCategory(true)}
              title="Add new category"
            >
              + Add Category
            </button>
          </div>
          {showAddStatCategory && (
            <div className="add-category-form">
              <input
                type="text"
                placeholder="Enter category name..."
                value={newStatCategory}
                onChange={(e) => setNewStatCategory(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addStatCategory()}
              />
              <button onClick={addStatCategory} className="confirm-btn">
                Add
              </button>
              <button
                onClick={() => setShowAddStatCategory(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th className="category-col">Category</th>
                {statCategories.map((cat) => (
                  <th key={cat} className="stat-col">
                    <div className="column-header">
                      <span>{cat}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="stat-row-gents">
                <td className="row-label">Gents</td>
                {statCategories.map((cat) => (
                  <td key={`gents-${cat}`} className="stat-cell">
                    {stats.gents[cat] || 0}
                  </td>
                ))}
              </tr>
              <tr className="stat-row-ladies">
                <td className="row-label">Ladies</td>
                {statCategories.map((cat) => (
                  <td key={`ladies-${cat}`} className="stat-cell">
                    {stats.ladies[cat] || 0}
                  </td>
                ))}
              </tr>
              <tr className="stat-row-total">
                <td className="row-label">Total</td>
                {statCategories.map((cat) => (
                  <td key={`total-${cat}`} className="stat-cell">
                    {stats.total[cat] || 0}
                  </td>
                ))}
              </tr>
              <tr className="stat-row-headcount">
                <td className="row-label">Head Count</td>
                {statCategories.map((cat) => (
                  <td key={`headcount-${cat}`} className="stat-cell">
                    {Math.floor((stats.total[cat] || 0) / 5)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Category Management */}
        {statCategories.length > 0 && (
          <div className="category-management">
            <h3>Manage Categories</h3>
            <div className="category-list">
              {statCategories.map((cat) => (
                <div key={cat} className="category-item">
                  <span>{cat}</span>
                  <button
                    className="delete-cat-btn"
                    onClick={() => deleteStatCategory(cat)}
                    title="Delete category"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-card">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Search Person</label>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search by person name..."
                value={searchPerson}
                onChange={(e) => setSearchPerson(e.target.value)}
                className="filter-input"
              />
              {searchPerson && (
                <button
                  className="filter-clear"
                  onClick={() => setSearchPerson("")}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-input"
            />
            {fromDate && (
              <button
                className="filter-clear"
                onClick={() => {
                  setFromDate("");
                  setCurrentPage(1);
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-input"
            />
            {toDate && (
              <button
                className="filter-clear"
                onClick={() => {
                  setToDate("");
                  setCurrentPage(1);
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          <div className="filter-group">
            <label>Mode Of Satsang</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {allCategories.map((category, idx) => (
                <option key={idx} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Time Slot</label>
            <select
              value={selectedTimeSlot}
              onChange={(e) => {
                setSelectedTimeSlot(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Times</option>
              {timeSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Debug Info */}
        <div className="filter-debug-info">
          <strong>Filter Status:</strong>
          <small>
            📊 Total: {attendanceRecords.length} | ✓ Filtered: {filteredRecords.length}
            {attendanceRecords.length > 0 && filteredRecords.length === 0 && (
              <span style={{color: '#dc2626', fontWeight: 'bold'}}> ⚠️ NO MATCHES</span>
            )}
          </small>
          <small style={{display: 'block', marginTop: '8px', color: '#666'}}>
            Active Filters: {[
              fromDate && `📅 From ${fromDate}`,
              toDate && `📅 To ${toDate}`,
              selectedTimeSlot !== "all" && `⏰ ${selectedTimeSlot}`,
              selectedCategory !== "all" && `📌 ${selectedCategory}`,
              searchPerson && `🔍 "${searchPerson}"`
            ].filter(Boolean).join(' | ') || 'None'}
          </small>
        </div>
      </div>

      {/* Records by Date */}
      <div className="records-section">
        <div className="records-header">
          <h2>Attendance Records</h2>
          <div className="pagination-info">
            <span>
              Showing {filteredRecords.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
            </span>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="no-records">
            <p>{(!fromDate || !toDate) ? "Please select a From and To date range to view attendance records" : "No attendance records found for the selected filters"}</p>
          </div>
        ) : (
          <>
            {Object.keys(recordsByDate)
              .sort()
              .reverse()
              .map((date) => (
                <div key={date} className="date-section">
              <div className="date-header">
                <h3>{formatDate(date)}</h3>
              </div>

              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Attendees</th>
                      <th>Category</th>
                      <th>Shift</th>
                      <th>Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordsByDate[date].flatMap((record) =>
                      record.members && record.members.length > 0
                        ? record.members.map((member, idx) => (
                            <tr
                              key={`${record.id}-${member?.id || idx}-${idx}`}
                            >
                              <td className="member-name">
                                {getMemberDetails(member?.id)?.name ||
                                  "Unknown"}
                              </td>
                              <td>
                                <span className="category-badge">
                                  {member?.category || "-"}
                                </span>
                              </td>
                              <td>
                                <span className={`shift-badge ${record.shift === 'Morning' ? 'morning' : record.shift === 'Evening' ? 'evening' : 'night'}`}>
                                  {record.shift}
                                </span>
                              </td>
                              <td style={{ fontWeight: "600", color: "var(--text-muted)" }}>
                                {formatTime(record.time)}
                              </td>
                              <td>
                                <button
                                  className="delete-record-btn"
                                  onClick={() =>
                                    handleDeleteMember(record.id, member?.id)
                                  }
                                >
                                  ✕ Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        : []
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-arrow-btn"
                >
                  ←
                </button>
                <div className="pagination-info-box">
                  <span className="pagination-text">
                    {currentPage} of {totalPages}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-arrow-btn active"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Branch;
