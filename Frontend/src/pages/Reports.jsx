import React, { useState, useEffect, useMemo } from "react";
import "../styles/Reports.css";
import { API_BASE_URL, getAuthHeaders, apiFetch } from "../config/apiConfig";

const Reports = ({ initialReport = null }) => {
  const [activeReport, setActiveReport] = useState(initialReport || "attendance");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [sevaData, setSevaData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [searchMemberName, setSearchMemberName] = useState("");

  // ✅ Default to current month
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    setFromDate(`${y}-${m}-01`);
    setToDate(`${y}-${m}-${lastDay}`);
  }, []);

  useEffect(() => {
    if (initialReport) setActiveReport(initialReport);
    else setActiveReport("attendance");
  }, [initialReport]);

  useEffect(() => {
    if (fromDate && toDate) {
      setCurrentPage(1);
      if (activeReport === "attendance") fetchAttendanceReport();
      else if (activeReport === "seva") fetchSevaReport();
    }
  }, [fromDate, toDate, activeReport]);

  useEffect(() => {
    if (searchMemberName.trim()) setCurrentPage(1);
  }, [searchMemberName]);

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);
      const url = `/api/attendance/by-date?fromDate=${fromDate}&toDate=${toDate}`;
      const result = await apiFetch(url);
      if (result && result.success && result.data) {
        const expandedData = result.data.map((record) => ({
          id: record.id,
          uid: record.uid || "-",
          memberName: record.name || "Unknown",
          status: record.stat_category || "-",
          dob: record.dob || "-",
          gender: record.gender || "-",
          branch: record.branch || "-",
          associationMember: record.association_member || "-",
          unitMember: record.unit_member || "-",
          date: record.date,
          shift: record.shift,
          category: record.category || "-",
          time: record.time,
        }));
        setAttendanceData(expandedData);
      } else {
        setAttendanceData([]);
      }
    } catch {
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSevaReport = async () => {
    try {
      setLoading(true);
      const url = `/api/seva/report?fromDate=${fromDate}&toDate=${toDate}`;
      const result = await apiFetch(url);
      if (result && result.success && result.data) setSevaData(result.data);
      else setSevaData([]);
    } catch {
      setSevaData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSelect = (reportType) => {
    setActiveReport(reportType);
    setCurrentPage(1);
    setSearchMemberName("");
  };

  // ─── Filtered data ──────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let data = activeReport === "attendance" ? attendanceData : sevaData;
    if (searchMemberName.trim()) {
      const lower = searchMemberName.toLowerCase();
      data = data.filter((r) =>
        (r.memberName || r.name || "").toLowerCase().includes(lower)
      );
    }
    return data;
  }, [activeReport, attendanceData, sevaData, searchMemberName]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ─── Summary computation ────────────────────────────────────────────────────
  const attendanceSummary = useMemo(() => {
    const sourceData = searchMemberName.trim() ? filteredData : attendanceData;
    const audio = sourceData.filter((r) =>
      (r.category || "").toLowerCase().includes("audio")
    ).length;
    const mpg = sourceData.filter((r) =>
      (r.category || "").toLowerCase().includes("video") ||
      (r.category || "").toLowerCase().includes("mpg") ||
      (r.category || "").toLowerCase().includes("dayalbagh")
    ).length;
    const branch = sourceData.filter((r) =>
      (r.category || "").toLowerCase().includes("branch")
    ).length;
    const uniqueMembers = new Set(sourceData.map((r) => r.memberName)).size;
    return { audio, mpg, branch, total: sourceData.length, uniqueMembers };
  }, [attendanceData, filteredData, searchMemberName]);

  const sevaSummary = useMemo(() => {
    const sourceData = searchMemberName.trim() ? filteredData : sevaData;
    const totalHours = sourceData.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);
    const uniqueMembers = new Set(sourceData.map((r) => r.memberName)).size;

    // Category-wise breakdown from real DB SevaCategory field
    const byCat = {};
    sourceData.forEach((r) => {
      const cat = (r.category || "Other").trim();
      if (!byCat[cat]) byCat[cat] = { count: 0, hours: 0 };
      byCat[cat].count += 1;
      byCat[cat].hours += parseFloat(r.hours) || 0;
    });

    return { total: sourceData.length, totalHours, uniqueMembers, byCat };
  }, [sevaData, filteredData, searchMemberName]);

  // ─── Export ──────────────────────────────────────────────────────────────────
  const downloadExcel = () => {
    const data = activeReport === "attendance" ? filteredData : filteredData;
    if (data.length === 0) return;

    let csv = "";
    if (activeReport === "attendance") {
      csv = `Attendance Report — ${formatDate(fromDate)} to ${formatDate(toDate)}\n\n`;
      csv += "Sr.No,UID,Member Name,Status,Date Of Birth,Gender,Branch,Date,Shift,Mode Of Satsang,Time\n";
      data.forEach((r, i) => {
        csv += `${i + 1},"${r.uid}","${r.memberName}","${r.status}","${formatDate(r.dob)}","${r.gender}","${r.branch}","${formatDate(r.date)}","${r.shift}","${r.category}","${r.time}"\n`;
      });
    } else {
      csv = `Seva Report — ${fromDate} to ${toDate}\n\n`;
      csv += "Sr.No,Member Name,Status,Date of Birth,Gender,Seva Date,Hours,Amount\n";
      data.forEach((r, i) => {
        csv += `${i + 1},"${r.memberName}","${r.status}","${formatDate(r.dateOfBirth)}","${r.gender}","${formatDate(r.date)}","${r.hours || 0}","${r.amount || 0}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `${activeReport}_report_${fromDate}_to_${toDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      const str = String(dateStr).trim();
      if (str.includes("/")) {
        const [d, m, y] = str.split("/");
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
      if (str.includes("-") && str.length >= 8) {
        const [y, m, d] = str.split("-");
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
      return str;
    } catch {
      return dateStr;
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="reports-page full-screen">

      {/* Page Header */}
      <div className="reports-header">
        <h1>📊 Attendance Reports</h1>
        <p>Date range chunein, member search karein aur report export karein</p>
      </div>

      {/* Compact Top Bar: Tabs + Filters + Export */}
      <div className="report-top-bar">

        {/* Satsang / Seva Tabs */}
        <div className="report-tab-pills">
          <button
            className={`tab-pill satsang-pill ${activeReport === "attendance" ? "active" : ""}`}
            onClick={() => handleReportSelect("attendance")}
          >
            🙏 Satsang
          </button>
          <button
            className={`tab-pill seva-pill ${activeReport === "seva" ? "active" : ""}`}
            onClick={() => handleReportSelect("seva")}
          >
            🤝 Seva
          </button>
        </div>

        {/* Filters */}
        <div className="report-filters">
          <div className="filter-group-inline">
            <label>📅 Se</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="filter-group-inline">
            <label>📅 Tak</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="filter-group-inline filter-search">
            <label>🔍 Member</label>
            <input
              type="text"
              placeholder="Naam likho..."
              value={searchMemberName}
              onChange={(e) => { setSearchMemberName(e.target.value); setCurrentPage(1); }}
              className="input-field"
            />
          </div>
        </div>

        {/* Export Button */}
        <button className="btn-download" onClick={downloadExcel} disabled={filteredData.length === 0}>
          📥 Export ({filteredData.length})
        </button>
      </div>

      {/* Report Content */}
      <div className="report-content">

        {/* ── Summary Cards ─────────────────────────────────────────── */}
        {!loading && activeReport === "attendance" && attendanceData.length > 0 && (
          <div className="summary-section">
            <h3 className="summary-title">
              📋 Attendance Metrics
              {searchMemberName && <span className="summary-filter-badge">"{searchMemberName}" filter active</span>}
            </h3>
            <div className="summary-grid">
              <div className="summary-card summary-blue">
                <span className="summary-count">{attendanceSummary.audio}</span>
                <span className="summary-label">Audio Satsang</span>
                <span className="summary-sublabel">Total entries</span>
              </div>
              <div className="summary-card summary-purple">
                <span className="summary-count">{attendanceSummary.mpg}</span>
                <span className="summary-label">Video/MPG/DB</span>
                <span className="summary-sublabel">Total entries</span>
              </div>
              <div className="summary-card summary-green">
                <span className="summary-count">{attendanceSummary.branch}</span>
                <span className="summary-label">Branch Satsang</span>
                <span className="summary-sublabel">Local entries</span>
              </div>
              <div className="summary-card summary-orange">
                <span className="summary-count">{attendanceSummary.uniqueMembers}</span>
                <span className="summary-label">Unique Members</span>
                <span className="summary-sublabel">Distinct participants</span>
              </div>
              <div className="summary-card summary-teal">
                <span className="summary-count">{attendanceSummary.total}</span>
                <span className="summary-label">Total Records</span>
                <span className="summary-sublabel">In this range</span>
              </div>
            </div>
          </div>
        )}

        {!loading && activeReport === "seva" && sevaData.length > 0 && (
          <div className="summary-section">
            <h3 className="summary-title">💪 Seva Metrics
              {searchMemberName && <span className="summary-filter-badge">"{searchMemberName}" filter active</span>}
            </h3>
            <div className="summary-grid">
              {/* Category-wise cards from real DB data */}
              {Object.entries(sevaSummary.byCat).map(([cat, data], i) => (
                <div key={cat} className={`summary-card summary-${["blue","purple","green","orange","teal"][i % 5]}`}>
                  <span className="summary-count">{data.hours.toFixed(1)} hrs</span>
                  <span className="summary-label">{cat}</span>
                  <span className="summary-sublabel">{data.count} entries</span>
                </div>
              ))}
              {/* Totals */}
              <div className="summary-card summary-teal">
                <span className="summary-count">{sevaSummary.uniqueMembers}</span>
                <span className="summary-label">Unique Members</span>
                <span className="summary-sublabel">Distinct contributors</span>
              </div>
              <div className="summary-card summary-orange">
                <span className="summary-count">{sevaSummary.totalHours.toFixed(1)}</span>
                <span className="summary-label">Total Hours</span>
                <span className="summary-sublabel">Cumulative Seva</span>
              </div>
            </div>
          </div>
        )}

        {/* Search status badge */}
        {searchMemberName.trim() && (
          <div className="search-status">
            <span className="status-icon">🔍</span>
            <span className="status-text">
              Showing records for <strong>"{searchMemberName}"</strong> — {filteredData.length} matches found
            </span>
            <button className="clear-search-btn" onClick={() => setSearchMemberName("")}>✕ Reset Search</button>
          </div>
        )}

        {/* ── Data Table ──────────────────────────────────────────────── */}
        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Data load ho raha hai...</p>
            </div>
          ) : activeReport === "attendance" ? (
            <table className="report-table attendance-report-table">
              <thead>
                <tr>
                  <th>Sr.No</th>
                  <th>UID</th>
                  <th>Member Name</th>
                  <th>Status</th>
                  <th>Gender</th>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Mode of Satsang</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((record, index) => (
                    <tr key={record.id || index}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="uid-cell" title={record.uid}>{record.uid || "-"}</td>
                      <td className="name-cell">{record.memberName || "-"}</td>
                      <td>
                        <span className={`status-badge status-${(record.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                          {record.status || "-"}
                        </span>
                      </td>
                      <td>{record.gender || "-"}</td>
                      <td>{record.branch || "-"}</td>
                      <td>{formatDate(record.date)}</td>
                      <td>
                        <span className={`shift-badge shift-${(record.shift || "").toLowerCase()}`}>
                          {record.shift || "-"}
                        </span>
                      </td>
                      <td>{record.category || "-"}</td>
                      <td>{record.time || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="no-data">
                      {searchMemberName.trim()
                        ? `"${searchMemberName}" ke liye koi record nahi mila`
                        : "Is date range mein koi attendance record nahi hai"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="report-table seva-report-table">
              <thead>
                <tr>
                  <th>Sr.No</th>
                  <th>Title</th>
                  <th>Member Name</th>
                  <th>Date &amp; Time</th>
                  <th>Category</th>
                  <th>Seva Name</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((record, index) => (
                    <tr key={record.id || index}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{record.title || "-"}</td>
                      <td className="name-cell">{record.memberName}</td>
                      <td>{formatDate(record.date)}</td>
                      <td>
                        <span className="cat-badge">{record.category || "-"}</span>
                      </td>
                      <td>{record.seva_name || "-"}</td>
                      <td className="numeric hrs-cell">{record.hours || 0} hrs</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      {searchMemberName.trim()
                        ? `"${searchMemberName}" ke liye koi seva record nahi mila`
                        : "Is date range mein koi seva record nahi hai"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-arrow-btn"
            >←</button>
            <div className="pagination-info-box">
              <span className="pagination-text">{currentPage} / {totalPages}</span>
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-arrow-btn active"
            >→</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
