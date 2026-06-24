import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { API_ENDPOINTS, apiFetch } from '../config/apiConfig';

const SatsangOptions = () => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState({ show: false, type: "", msg: "" });

  const showToast = (type, msg) => {
    setToast({ show: true, type, msg });
    setTimeout(() => setToast({ show: false, type: "", msg: "" }), 3000);
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const result = await apiFetch(API_ENDPOINTS.SATSANG_CATEGORIES);
      if (result.success) {
        setOptions(result.data);
      }
    } catch (err) {
      showToast('error', 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newOption.trim()) return;
    try {
      const result = await apiFetch(API_ENDPOINTS.SATSANG_CATEGORIES, {
        method: 'POST',
        body: JSON.stringify({ name: newOption.trim() })
      });
      if (result.success) {
        showToast('success', 'Category added!');
        setNewOption('');
        fetchOptions();
      }
    } catch (err) {
      showToast('error', 'Failed to add category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      const result = await apiFetch(`${API_ENDPOINTS.SATSANG_CATEGORIES}/${id}`, {
        method: 'DELETE'
      });
      if (result.success) {
        showToast('success', 'Category deleted');
        fetchOptions();
      }
    } catch (err) {
      showToast('error', 'Failed to delete category');
    }
  };

  const startEdit = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const saveEdit = async (id) => {
    if (!editValue.trim()) return;
    try {
      const result = await apiFetch(`${API_ENDPOINTS.SATSANG_CATEGORIES}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editValue.trim() })
      });
      if (result.success) {
        showToast('success', 'Category updated!');
        setEditingIndex(null);
        fetchOptions();
      }
    } catch (err) {
      showToast('error', 'Failed to update category');
    }
  };

  return (
    <div style={{ 
      padding: '40px 20px', 
      maxWidth: '700px', 
      margin: '0 auto',
      minHeight: '100vh',
      fontFamily: '"Inter", "Segoe UI", sans-serif'
    }}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', 
          padding: '16px 24px', 
          borderRadius: '8px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideInRight 0.3s ease-out forwards'
        }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f05a28 0%, #d94a1b 100%)', 
        color: 'white', 
        padding: '24px 30px', 
        borderRadius: '12px', 
        marginBottom: '30px',
        boxShadow: '0 4px 15px rgba(240, 90, 40, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.2)', 
          padding: '12px', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '0.5px' }}>Satsang Categories (Shared)</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>These categories are visible to all users.</p>
        </div>
      </div>

      {/* Main List Container */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
        border: '1px solid #f0f0f0',
        overflow: 'hidden' 
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 200px', 
          background: '#f8fafc', 
          borderBottom: '2px solid #e2e8f0',
          fontWeight: '600',
          color: '#475569',
          fontSize: '14px',
          textTransform: 'uppercase'
        }}>
          <div style={{ padding: '16px 24px' }}>Category Name</div>
          <div style={{ padding: '16px 24px', textAlign: 'center' }}>Actions</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {options.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              {loading ? "Loading..." : "No options found. Add one below!"}
            </div>
          ) : (
            options.map((opt, index) => (
              <div key={opt.id} style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 200px',
                borderBottom: '1px solid #f1f5f9', 
                background: index % 2 === 0 ? 'white' : '#fcfcfc'
              }}>
                <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
                  {editingIndex === index ? (
                    <input 
                      type="text" 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(opt.id)}
                      style={{ width: '100%', padding: '8px', border: '2px solid #3b82f6', borderRadius: '4px' }}
                      autoFocus
                    />
                  ) : (
                    <span style={{ fontSize: '16px', color: '#334155', fontWeight: '500' }}>{opt.name}</span>
                  )}
                </div>
                
                <div style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {editingIndex === index ? (
                    <button onClick={() => saveEdit(opt.id)} style={{ background: '#10b981', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                  ) : (
                    <>
                      <button onClick={() => startEdit(index, opt.name)} style={{ background: '#f1f5f9', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(opt.id)} style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
            <div style={{ padding: '20px 24px' }}>
              <input 
                type="text" 
                placeholder="Type new category..." 
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              />
            </div>
            <div style={{ padding: '20px 24px' }}>
              <button onClick={handleAdd} style={{ background: '#3b82f6', color: 'white', padding: '10px', border: 'none', borderRadius: '8px', width: '100%', fontWeight: '600', cursor: 'pointer' }}>+ Add Category</button>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default SatsangOptions;
