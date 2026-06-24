import React, { useState, useEffect } from "react";
import "../styles/SevaEntry.css";
import { API_ENDPOINTS, apiFetch } from "../config/apiConfig";

const API_URL = API_ENDPOINTS.MEMBERS;
const SEVA_API = API_ENDPOINTS.SEVA;

const sevaTypesByCategory = {
  "seva-mahila": ["Knitting", "Food Processing", "Stitching", "Embroidery", "Others", "Purchasing", "Fabric Painting", "Art and Craft"],
  "seva-youth": ["Cleaning", "Exhibition", "Security", "Others", "Purchasing", "Transportation"],
  "seva-bag": ["Stitching", "Purchasing", "Cutting", "Packing", "Transportation"],
  "seva-copy": ["Purchasing", "Printing", "Counting", "Stapling", "Side Pasting", "Centre Pasting", "Trimming"],
};

const sevaData = {
  "seva-mahila": { name: "Mahila Association", icon: "👩‍👩‍👧", color: "#FF6B9D" },
  "seva-youth": { name: "Youth Association", icon: "👦👧", color: "#4ECDC4" },
  "seva-bag": { name: "Bag Unit", icon: "🎒", color: "#45B7D1" },
  "seva-copy": { name: "Copy Unit", icon: "📋", color: "#F7DC6F" },
};

const SevaEntry = ({ categoryId }) => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [shift, setShift] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 18) return "Evening";
    return "Night";
  });
  const [memberName, setMemberName] = useState("");
  const [members, setMembers] = useState([]);
  const [memberHistory, setMemberHistory] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [sevaMasterData, setSevaMasterData] = useState([]);
  const [sevaEntries, setSevaEntries] = useState([]);
  const [totalMonthlyHours, setTotalMonthlyHours] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const category = sevaData[categoryId] || {};
  const isEditableCategory = ["seva-bag", "seva-copy"].includes(categoryId);

  useEffect(() => {
    fetchMembers();
    fetchSevaMasterData();
  }, []);

  const fetchSevaMasterData = async () => {
    try {
      const result = await apiFetch(API_ENDPOINTS.SEVA_MASTER);
      if (result?.success) setSevaMasterData(result.data);
    } catch (err) {
      console.error("Error fetching seva master data:", err);
    }
  };

  const fetchMembers = async () => {
    try {
      const result = await apiFetch(API_URL);
      if (result?.success) setMembers(result.data);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  useEffect(() => {
    const categoryName = category.name;
    const filteredSevaTypes = sevaMasterData
      .filter((item) => item.Category === categoryName)
      .map((item) => item.SevaName);

    setSevaEntries(
      filteredSevaTypes.map((type, index) => ({
        id: index + 1,
        seva: type,
        hours: "",
        cost: "",
      }))
    );
    setTotalMonthlyHours(0);
    setMemberName("");
  }, [categoryId, sevaMasterData, category.name]);

  const handleMemberSearch = (value) => {
    setMemberName(value);
    if (value.trim()) {
      const filtered = members.filter((m) => m.name.toLowerCase().includes(value.toLowerCase()));
      setFilteredMembers(filtered);
      setShowMemberDropdown(true);
    } else {
      setFilteredMembers([]);
      setShowMemberDropdown(false);
    }
  };

  const handleSevaChange = (index, field, value) => {
    const newEntries = [...sevaEntries];
    newEntries[index][field] = value === "" ? "" : field === "seva" ? value : parseFloat(value) || "";
    setSevaEntries(newEntries);
    const total = newEntries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0);
    setTotalMonthlyHours(total);
  };

  const handleSubmit = async () => {
    if (!memberName.trim() || !date) {
      alert("Please select member and date");
      return;
    }

    const selectedMember = members.find((m) => m.name === memberName);
    if (!selectedMember) return alert("Select valid member");

    const validEntries = sevaEntries.filter(
      (entry) => entry.seva && (parseFloat(entry.hours) > 0 || parseFloat(entry.cost) > 0)
    );

    if (validEntries.length === 0) return alert("Enter at least one entry");

    try {
      for (const entry of validEntries) {
        await apiFetch(SEVA_API, {
          method: "POST",
          body: {
            member_id: selectedMember.id,
            category: category.name,
            seva_name: entry.seva,
            hours: parseFloat(entry.hours) || 0,
            cost: parseFloat(entry.cost) || 0,
            date,
            time,
            shift,
          },
        });
      }

      alert(`Seva entry submitted successfully for ${memberName}!`);
      setMemberName("");
      setSevaEntries(prev => prev.map(e => ({ ...e, hours: "", cost: "" })));
      setTotalMonthlyHours(0);
    } catch (error) {
      console.error("❌ Error submitting seva entry:", error);
      alert("Failed to submit seva entry");
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return now.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleAddRow = () => {
    const newId = Math.max(...sevaEntries.map((e) => e.id), 0) + 1;
    setSevaEntries([...sevaEntries, { id: newId, seva: "", hours: "", cost: "" }]);
  };

  const handleDeleteRow = (id) => {
    const newEntries = sevaEntries.filter((e) => e.id !== id);
    setSevaEntries(newEntries);
    setTotalMonthlyHours(newEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0));
  };

  const handleEditRow = (id, val) => { setEditingId(id); setEditingValue(val); };
  const handleSaveEdit = (id) => {
    setSevaEntries(sevaEntries.map(e => e.id === id ? { ...e, seva: editingValue } : e));
    setEditingId(null);
  };

  return (
    <div className="seva-entry-container">
      <div className="entry-header" style={{ borderTopColor: category.color }}>
        <div className="back-button">«</div>
        <h1>Seva Entry</h1>
      </div>

      <div className="entry-content">
        <div className="status-info">
          <p><span className="label">Seva Status as on :</span> <span className="value">{getCurrentMonth()}</span></p>
          <p><span className="label">Seva Category :</span> <span className="value">{category.name}</span></p>
        </div>

        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Date:</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label>Time:</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label>Shift:</label>
              <select value={shift} onChange={(e) => setShift(e.target.value)} className="form-input">
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div className="form-group member-search">
              <label>Member Name:</label>
              <div className="search-container">
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => handleMemberSearch(e.target.value)}
                  placeholder="Search member..."
                  className="form-input member-input"
                  autoComplete="off"
                />
                {showMemberDropdown && filteredMembers.length > 0 && (
                  <div className="member-dropdown">
                    {filteredMembers.map((m) => (
                      <div key={m.id} className="member-dropdown-item" onClick={() => { setMemberName(m.name); setShowMemberDropdown(false); }}>
                        {m.name} {m.uid && `(${m.uid})`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="monthly-info">
          <p>Monthly Seva Achieved : <strong>{totalMonthlyHours} Hrs</strong></p>
        </div>

        <div className="table-container">
          <table className="seva-table">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>Seva</th>
                <th>Seva Hrs Today</th>
                <th>Cost</th>
                {isEditableCategory && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {sevaEntries.map((entry, index) => (
                <tr key={entry.id}>
                  <td className="srno">{entry.id}</td>
                  <td className={isEditableCategory ? "editable" : ""} onClick={() => isEditableCategory && !editingId && handleEditRow(entry.id, entry.seva)}>
                    {editingId === entry.id ? (
                      <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onBlur={() => handleSaveEdit(entry.id)} autoFocus className="table-input" />
                    ) : entry.seva}
                  </td>
                  <td className="input-cell"><input type="number" step="0.5" value={entry.hours} onChange={(e) => handleSevaChange(index, "hours", e.target.value)} className="table-input" placeholder="0" /></td>
                  <td className="input-cell"><input type="number" value={entry.cost} onChange={(e) => handleSevaChange(index, "cost", e.target.value)} className="table-input" placeholder="0" /></td>
                  {isEditableCategory && (
                    <td className="action-cell">
                      <button className="btn-delete" onClick={() => handleDeleteRow(entry.id)}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="submit-container">
          {isEditableCategory && <button className="btn-add-row" onClick={handleAddRow} style={{ backgroundColor: category.color }}>+ Add Row</button>}
          <button className="btn-submit" onClick={handleSubmit} style={{ backgroundColor: category.color }}>Submit</button>
        </div>
      </div>
    </div>
  );
};

export default SevaEntry;
