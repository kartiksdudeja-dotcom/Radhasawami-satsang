import React, { useState, useEffect } from "react";
import "../styles/SupermanPhase.css";
import { API_ENDPOINTS, getAuthHeaders, apiFetch } from "../config/apiConfig";

const API_URL = API_ENDPOINTS.SUPERMAN_PHASES;

const SupermanPhase = () => {
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    phaseName: "",
    description: "",
    minAge: 0,
    maxAge: 150,
  });

  useEffect(() => {
    fetchPhases();
  }, []);

  const fetchPhases = async () => {
    try {
      setLoading(true);
      const result = await apiFetch(API_URL);
      if (result && result.success) {
        setPhases(result.data);
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "minAge" || name === "maxAge" ? parseInt(value) || 0 : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      phaseName: "",
      description: "",
      minAge: 0,
      maxAge: 150,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.phaseName) {
      return;
    }

    try {
      setLoading(true);
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;

      const result = await apiFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (result && result.success) {
        fetchPhases();
        resetForm();
      }
    } catch (error) {
      console.error("Error saving phase:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (phase) => {
    setFormData({
      phaseName: phase.PhaseName,
      description: phase.Description || "",
      minAge: phase.MinAge,
      maxAge: phase.MaxAge,
    });
    setEditingId(phase.ID);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this phase?")) return;

    try {
      setLoading(true);
      const result = await apiFetch(`${API_URL}/${id}`, {
        method: "DELETE"
      });
      if (result && result.success) {
        fetchPhases();
      }
    } catch (error) {
      console.error("Error deleting phase:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="superman-phase-container">
      {/* Header Section */}
      <div className="phase-header">
        <div className="header-left">
          <h1>🦸 Phase Master</h1>
        </div>
        {!showForm && (
          <button className="add-phase-btn" onClick={() => setShowForm(true)}>
            <span>➕</span> Add New Phase
          </button>
        )}
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="phase-form-card">
          <div className="phase-form-header">
            <h2>{editingId ? "✏️ Edit Phase" : "📝 Create New Phase"}</h2>
            <button className="close-btn" onClick={resetForm} title="Close Form">✕</button>
          </div>
          
          <form onSubmit={handleSave} className="phase-form">
            <div className="phase-grid">
              <div className="form-group">
                <label>Phase Name</label>
                <input
                  type="text"
                  name="phaseName"
                  value={formData.phaseName}
                  onChange={handleInputChange}
                  placeholder="e.g. Phase 1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description / Age Group</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g. Children (Upto 4 yrs)"
                />
              </div>
              <div className="form-group">
                <label>Minimum Age</label>
                <input
                  type="number"
                  name="minAge"
                  value={formData.minAge}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Maximum Age</label>
                <input
                  type="number"
                  name="maxAge"
                  value={formData.maxAge}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="phase-form-actions">
              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? "Processing..." : (editingId ? "Update Category" : "Build Phase")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Section */}
      <div className="phases-list-section">
        <div className="phases-list-header">
          <h2>📊 Configured Phases</h2>
        </div>
        
        <div className="table-wrapper">
          <table className="phase-table">
            <thead>
              <tr>
                <th>Phase Name</th>
                <th>Target Group</th>
                <th>Age Range</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && phases.length === 0 ? (
                <tr>
                  <td colSpan="4" className="loading-row">
                    <p>🔄 Syncing phases...</p>
                  </td>
                </tr>
              ) : phases.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="empty-state">
                      <div className="empty-icon">📁</div>
                      <p>No phases configured. Use the button above to add one.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                phases.map((phase) => (
                  <tr key={phase.ID}>
                    <td className="phase-name">{phase.PhaseName}</td>
                    <td>{phase.Description || "—"}</td>
                    <td>
                      <span className="age-badge">
                        {phase.MinAge} - {phase.MaxAge} yrs
                      </span>
                    </td>
                    <td className="action-cell">
                      <div className="action-buttons">
                        <button 
                          className="icon-btn edit-btn" 
                          onClick={() => handleEdit(phase)}
                          title="Edit Phase"
                        >
                          ✏️
                        </button>
                        <button 
                          className="icon-btn delete-btn" 
                          onClick={() => handleDelete(phase.ID)}
                          title="Delete Phase"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupermanPhase;
