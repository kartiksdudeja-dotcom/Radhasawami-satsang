import React, { useState, useEffect } from "react";
import "../styles/MemberMaster.css";
import { API_ENDPOINTS, getAuthHeaders, apiFetch } from "../config/apiConfig";

const API_URL = API_ENDPOINTS.MEMBERS;

// Helper function to convert various date formats to yyyy-mm-dd for input[type="date"]
const formatDateForInput = (dateStr) => {
  if (!dateStr || dateStr === "-" || dateStr === "NULL") return "";
  
  // Try to parse the date string
  const str = dateStr.trim();
  
  // Already in yyyy-mm-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Format: dd/mm/yy or dd/mm/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
    const parts = str.split('/');
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    
    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
      const yearNum = parseInt(year);
      year = yearNum > 50 ? `19${year}` : `20${year}`;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  // Try native Date parsing as fallback
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // ignore
  }
  
  return "";
};

const MemberMaster = () => {
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [phases, setPhases] = useState([]);

  useEffect(() => {
    fetchMembers();
    fetchPhases();
  }, []);

  const fetchPhases = async () => {
    try {
      const result = await apiFetch(API_ENDPOINTS.SUPERMAN_PHASES);
      if (result && result.success) {
        setPhases(result.data);
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      console.log("Fetching members from:", API_URL);
      setLoading(true);
      const result = await apiFetch(API_URL);
      console.log("Fetch result:", result);
      if (result && result.success) {
        // Filter duplicates based on UID and name (frontend safety check)
        const uniqueMembers = [];
        const seen = new Set();

        for (const member of result.data) {
          const key = `${(member.uid || "NO_UID").toUpperCase()}|${(
            member.name || "NO_NAME"
          ).toUpperCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueMembers.push(member);
          }
        }

        console.log(
          `Members loaded: ${result.data.length}, unique: ${uniqueMembers.length}`
        );
        setMembers(uniqueMembers);
      } else if (result) {
        console.error("API returned error:", result.error);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      alert("Failed to load members: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    branch: "",
    region: "",
    uid: "",
    initial: "",
    name: "",
    gender: "Male",
    dob: "",
    first_initiation: "",
    second_initiation: "",
    jigyasu_registration: "",
    blood_group: "",
    father_name: "",
    mother_name: "",
    husband_name: "",
    wife_name: "",
    office_bearer: "",
    username: "",
    password: "",
    association_member: "",
    unit_member: "",
    status: "Initiated",
    is_member: true,
    is_admin: false,
    email: "",
    number: "",
    address: "",
    office_address: "",
  });

  // Auto-calculate status based on age whenever DOB changes
  useEffect(() => {
    if (formData.dob && phases.length > 0) {
      const birthDate = new Date(formData.dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        // Find matching phase
        const matchingPhase = phases.find(p => age >= p.MinAge && age <= p.MaxAge);
        if (matchingPhase) {
          setFormData(prev => ({ ...prev, status: matchingPhase.PhaseName }));
        }
      }
    }
  }, [formData.dob, phases]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      branch: "",
      region: "",
      uid: "",
      initial: "",
      name: "",
      gender: "Male",
      dob: "",
      first_initiation: "",
      second_initiation: "",
      jigyasu_registration: "",
      blood_group: "",
      father_name: "",
      mother_name: "",
      husband_name: "",
      wife_name: "",
      office_bearer: "",
      username: "",
      password: "",
      association_member: "",
      unit_member: "",
      status: "Initiated",
      is_member: true,
      is_admin: false,
      email: "",
      number: "",
      address: "",
      office_address: "",
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      alert("Name, Username and Password are required");
      return;
    }

    try {
      setLoading(true);
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? "PUT" : "POST";

      const result = await apiFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!result || !result.success) {
        alert(result?.error || "Operation failed");
        return;
      }

      await fetchMembers();
      resetForm();
      setEditingId(null);
      setIsFormExpanded(false); // Close form after successful save
      // Smooth scroll to members list
      setTimeout(() => {
        document.querySelector('.members-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Error saving member:", error);
      alert("Failed to save member");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member) => {
    setFormData({
      branch: member.branch || "",
      region: member.region || "",
      uid: member.uid || "",
      initial: member.initial || "",
      name: member.name || "",
      gender: member.gender === "M" ? "Male" : member.gender === "F" ? "Female" : member.gender || "Male",
      dob: formatDateForInput(member.dob),
      first_initiation: formatDateForInput(member.first_initiation),
      second_initiation: formatDateForInput(member.second_initiation),
      jigyasu_registration: formatDateForInput(member.jigyasu_registration),
      blood_group: member.blood_group === "-" ? "" : member.blood_group || "",
      father_name: member.father_name === "-" ? "" : member.father_name || "",
      mother_name: member.mother_name === "-" ? "" : member.mother_name || "",
      husband_name: member.husband_name === "-" ? "" : member.husband_name || "",
      wife_name: member.wife_name === "-" ? "" : member.wife_name || "",
      office_bearer: member.office_bearer === "-" ? "" : member.office_bearer || "",
      username: member.username || "",
      password: member.password || "",
      association_member: member.association_member || "",
      unit_member: member.unit_member || "",
      status: member.status || "Initiated",
      is_member: member.is_member === 1,
      is_admin: member.is_admin === 1,
      email: member.email || "",
      number: member.number || "",
      address: member.address || "",
      office_address: member.office_address || "",
    });
    setEditingId(member.id);
    setIsFormExpanded(true);
    // Smooth scroll to form
    setTimeout(() => {
      document.querySelector('.master-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAddNew = () => {
    resetForm();
    setEditingId(null);
    setIsFormExpanded(true);
    // Smooth scroll to form
    setTimeout(() => {
      document.querySelector('.master-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCloseForm = () => {
    setIsFormExpanded(false);
    resetForm();
    setEditingId(null);
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to delete this member?")) {
      return;
    }

    try {
      setLoading(true);
      const result = await apiFetch(`${API_URL}/${memberId}`, {
        method: "DELETE",
      });

      if (result && result.success) {
        await fetchMembers();
        resetForm();
        setEditingId(null);
      } else if (result) {
        alert(result.error || "Delete failed");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member");
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="member-master-page">
      {/* Header */}
      <div className="master-header">
        <div className="back-btn" title="Back to Dashboard" onClick={() => window.location.hash = "#dashboard"}>«</div>
        <h1>Member Master</h1>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      {/* Modern Form Card */}
      <div className={`master-form-card ${isFormExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="form-header" onClick={() => !isFormExpanded && setIsFormExpanded(true)}>
          <h2>
            {editingId ? '✏️ Edit Member' : '👤 Add New Satsangi'}
            {!isFormExpanded && <span className="expand-hint">(Click to expand)</span>}
          </h2>
          <div className="header-actions">
            {isFormExpanded && (
              <button className="close-form-btn" onClick={handleCloseForm} title="Close Form">
                ✕
              </button>
            )}
            <button className="save-btn" onClick={handleAddNew}>
              + Add New
            </button>
          </div>
        </div>

        {isFormExpanded && (
          <>
            <div className="form-tabs">
              <button 
                className={`tab-btn ${activeTab === "personal" ? "active" : ""}`}
                onClick={() => setActiveTab("personal")}
              >
                👤 Personal
              </button>
              <button 
                className={`tab-btn ${activeTab === "family" ? "active" : ""}`}
                onClick={() => setActiveTab("family")}
              >
                👨‍👩‍👧 Family
              </button>
              <button 
                className={`tab-btn ${activeTab === "contacts" ? "active" : ""}`}
                onClick={() => setActiveTab("contacts")}
              >
                📞 Contacts
              </button>
              <button 
                className={`tab-btn ${activeTab === "system" ? "active" : ""}`}
                onClick={() => setActiveTab("system")}
              >
                ⚙️ System
              </button>
            </div>

            <div className="form-content">
              {activeTab === "personal" && (
                <div className="tab-pane">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Region :</label>
                      <input type="text" name="region" value={formData.region} onChange={handleInputChange} placeholder="e.g. North" />
                    </div>
                    <div className="form-group">
                      <label>UID (Unique ID) :</label>
                      <input type="text" name="uid" value={formData.uid} onChange={handleInputChange} placeholder="System ID" />
                    </div>
                    <div className="form-group">
                      <label>Initial :</label>
                      <input type="text" name="initial" value={formData.initial} onChange={handleInputChange} placeholder="Br./Sr." />
                    </div>
                    <div className="form-group">
                      <label>Full Name :</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter name" />
                    </div>
                    <div className="form-group">
                      <label>Gender :</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date of Birth :</label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Blood Group :</label>
                      <input type="text" name="blood_group" value={formData.blood_group} onChange={handleInputChange} placeholder="A+, B+, etc." />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "family" && (
                <div className="tab-pane">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Father's Name :</label>
                      <input type="text" name="father_name" value={formData.father_name} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Mother's Name :</label>
                      <input type="text" name="mother_name" value={formData.mother_name} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Husband's Name :</label>
                      <input type="text" name="husband_name" value={formData.husband_name} onChange={handleInputChange} placeholder="-" />
                    </div>
                    <div className="form-group">
                      <label>Wife's Name :</label>
                      <input type="text" name="wife_name" value={formData.wife_name} onChange={handleInputChange} placeholder="-" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "contacts" && (
                <div className="tab-pane">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Email Address :</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="member@example.com" />
                    </div>
                    <div className="form-group">
                      <label>Phone Number :</label>
                      <input type="tel" name="number" value={formData.number} onChange={handleInputChange} placeholder="10-digit number" />
                    </div>
                    <div className="form-group" style={{gridColumn: '1 / -1'}}>
                      <label>Home Address :</label>
                      <textarea name="address" value={formData.address} onChange={handleInputChange} rows="2" placeholder="Complete residential address"></textarea>
                    </div>
                    <div className="form-group" style={{gridColumn: '1 / -1'}}>
                      <label>Office Address :</label>
                      <textarea name="office_address" value={formData.office_address} onChange={handleInputChange} rows="2" placeholder="Complete office address"></textarea>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "system" && (
                <div className="tab-pane">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Branch :</label>
                      <input type="text" name="branch" value={formData.branch} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>First Initiation :</label>
                      <input type="date" name="first_initiation" value={formData.first_initiation} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Second Initiation :</label>
                      <input type="date" name="second_initiation" value={formData.second_initiation} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Status :</label>
                      <select name="status" value={formData.status} onChange={handleInputChange}>
                        {phases.map(p => <option key={p.ID} value={p.PhaseName}>{p.PhaseName}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>UserName :</label>
                      <input type="text" name="username" value={formData.username} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Password :</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} />
                    </div>
                    <div className="form-group checkbox-group" style={{flexDirection: 'row', gap: 20}}>
                      <label className="checkbox-label">
                        <input type="checkbox" name="is_member" checked={formData.is_member} onChange={handleInputChange} />
                        Active Member
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" name="is_admin" checked={formData.is_admin} onChange={handleInputChange} />
                        Admin Access
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button className="cancel-btn" onClick={handleCloseForm}>Discard</button>
                <button className="save-btn" onClick={handleSave}>
                  {loading ? 'Saving...' : (editingId ? 'Update Member' : 'Register Member')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Members List Section */}
      <div className="members-list-section">
        <div className="members-list-header">
          <h2>📋 All Members</h2>
          <span className="member-count">{members.length} Satsangis</span>
        </div>

        <div className="search-section">
          <div className="search-box">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search members by name, ID or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="members-table-wrapper members-table-desktop">
          <table className="master-table">
            <thead>
              <tr>
                <th>Member Information</th>
                <th>UID</th>
                <th>Contact</th>
                <th>Branch</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.filter(m => 
                m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                m.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.branch?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((member) => (
                <tr key={member.id}>
                  <td className="member-info-cell">
                    <div className="member-name-block">
                      <span className="member-name">{member.name}</span>
                      <span className="member-email-small">{member.email}</span>
                    </div>
                  </td>
                  <td className="member-uid-cell">
                    <span className="uid-badge-table">{member.uid}</span>
                  </td>
                  <td>
                    <div className="member-contact-block">
                      <span>{member.number}</span>
                    </div>
                  </td>
                  <td>{member.branch}</td>
                  <td><span className={`gender-badge ${member.gender?.toLowerCase()}`}>{member.gender}</span></td>
                  <td><span className={`status-badge ${member.status?.toLowerCase().replace(' ', '-')}`}>{member.status}</span></td>
                  <td className="action-cell">
                    <button className="table-action-btn" onClick={() => handleEdit(member)} title="Edit Member">✏️</button>
                    <button className="table-action-btn delete" onClick={() => handleDeleteMember(member.id)} title="Delete Member">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="members-table-mobile">
          {members.filter(m => 
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            m.uid?.toLowerCase().includes(searchTerm.toLowerCase())
          ).map((member) => (
            <div className="member-card" key={member.id}>
              <div className="member-card-header">
                <div className="member-title-area">
                  <h3>{member.name}</h3>
                  <span className="member-email-card">{member.email}</span>
                </div>
                <span className={`status-badge ${member.status?.toLowerCase().replace(' ', '-')}`}>{member.status}</span>
              </div>
              <div className="member-card-body">
                <div className="member-field"><label>ID</label><span className="uid-text">{member.uid}</span></div>
                <div className="member-field"><label>Phone</label><span>{member.number}</span></div>
                <div className="member-field"><label>Branch</label><span>{member.branch}</span></div>
                <div className="member-field card-actions">
                  <button className="edit-mini-btn" onClick={() => handleEdit(member)}>✏️ Edit</button>
                  <button className="delete-mini-btn" onClick={() => handleDeleteMember(member.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemberMaster;
