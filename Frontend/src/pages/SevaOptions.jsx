import React, { useState, useEffect } from 'react';
import '../styles/SevaOptions.css';
import { API_ENDPOINTS, getAuthHeaders, apiFetch } from '../config/apiConfig';

const SevaOptions = () => {
  const [sevaOptions, setSevaOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [newCategory, setNewCategory] = useState('');
  const [newSevaName, setNewSevaName] = useState('');

  const SEVA_MASTER_API = API_ENDPOINTS.SEVA_MASTER || `${API_ENDPOINTS.SEVA}-master`;

  useEffect(() => {
    fetchSevaOptions();
  }, []);

  const fetchSevaOptions = async () => {
    setLoading(true);
    try {
      const result = await apiFetch(SEVA_MASTER_API);
      if (result && result.success) {
        setSevaOptions(result.data);
      } else {
        setError('Failed to load seva options');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSevaOption = async (e) => {
    e.preventDefault();
    if (!newCategory || !newSevaName) return;

    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiFetch(SEVA_MASTER_API, {
        method: 'POST',
        body: JSON.stringify({ category: newCategory, sevaName: newSevaName }),
      });

      if (result && result.success) {
        setSuccess('✓ Seva option added successfully!');
        setNewSevaName('');
        fetchSevaOptions();
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else if (result) {
        setError(result.error || 'Failed to add seva option');
      }
    } catch (err) {
      setError('❌ Error connecting to server');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSevaOption = async (id) => {
    if (!window.confirm('Are you sure you want to delete this seva option?')) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiFetch(`${SEVA_MASTER_API}/${id}`, {
        method: 'DELETE'
      });
      if (result && result.success) {
        setSuccess('🗑️ Deleted successfully!');
        fetchSevaOptions();
        setTimeout(() => setSuccess(''), 3000);
      } else if (result) {
        setError(result.error || 'Failed to delete seva option');
      }
    } catch (err) {
      setError('❌ Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seva-options-container">
      {/* Page Header */}
      <div className="seva-options-header">
        <h1>⚙️ Seva Master</h1>
        <p className="subtitle">Configure and manage service categories for the attendance system.</p>
      </div>

      <div className="seva-options-content">
        {/* Add New Option Card */}
        <div className="add-option-card">
          <h3>➕ Add New Seva Option</h3>
          <form onSubmit={handleAddSevaOption} className="seva-form">
            <div className="form-group">
              <label>Category (Association / Unit)</label>
              <input 
                type="text" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Mahila Association"
                className="input-field"
                required
              />
            </div>
            <div className="form-group">
              <label>Seva Name</label>
              <input 
                type="text" 
                value={newSevaName} 
                onChange={(e) => setNewSevaName(e.target.value)}
                placeholder="e.g. Cleaning"
                className="input-field"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={formLoading || loading}>
              {formLoading ? 'Adding...' : 'Add Option'}
            </button>
          </form>
          
          {error && (
            <div className="feedback-message error">
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="feedback-message success">
              <span>{success.includes('Deleted') ? '🗑️' : '✅'}</span> {success}
            </div>
          )}
        </div>

        {/* Existing Options List */}
        <div className="options-list-container">
          <h3>📋 Current Seva Options</h3>
          
          {loading && sevaOptions.length === 0 ? (
            <div className="loading-row">
              <p>🔄 Loading configurations...</p>
            </div>
          ) : (
            <div className="options-table-wrapper">
              <table className="options-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Seva Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sevaOptions.map((option) => (
                    <tr key={option.ID}>
                      <td><strong>{option.Category}</strong></td>
                      <td>{option.SevaName}</td>
                      <td>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDeleteSevaOption(option.ID)}
                          title="Delete permanently"
                        >
                          🗑️ Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sevaOptions.length === 0 && !loading && (
                    <tr>
                      <td colSpan="3">
                        <div className="empty-state">
                          <div className="empty-icon">📁</div>
                          <p>No seva options found. Start by adding one above.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SevaOptions;
