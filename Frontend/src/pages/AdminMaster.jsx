import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { API_ENDPOINTS, getAuthHeaders, apiFetch } from '../config/apiConfig';

const AdminMaster = ({ user }) => {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await apiFetch(API_ENDPOINTS.MEMBERS);
      if (result && result.success) {
        setMembers(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const togglePower = async (memberId, powerType, currentValue) => {
    const member = members.find(m => m.id === memberId);
    const updatedPowers = {
      is_admin: member.is_admin,
      can_manage_attendance: member.can_manage_attendance,
      can_manage_store: member.can_manage_store,
      [powerType]: !currentValue
    };

    setUpdatingId(`${memberId}-${powerType}`);
    try {
      const result = await apiFetch(`${API_ENDPOINTS.MEMBERS}/${memberId}/power`, {
        method: 'PATCH',
        body: JSON.stringify(updatedPowers)
      });
      if (result) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, [powerType]: !currentValue } : m));
      }
    } catch (e) {
      console.error("Failed to update power:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.number?.includes(searchTerm)
  );

  return (
    <div className="members-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="members-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>Admin & Power Master</h1>
          <p style={{ color: '#64748b' }}>Assign management powers to any member</p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search by name, UID or number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ 
              padding: '12px 16px 12px 42px', 
              borderRadius: '14px', 
              border: '2px solid #e2e8f0', 
              width: '350px',
              fontSize: '0.95rem',
              transition: 'all 0.2s',
              background: '#f8fafc url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'8\'%3E%3C/circle%3E%3Cline x1=\'21\' y1=\'21\' x2=\'16.65\' y1=\'16.65\'%3E%3C/line%3E%3C/svg%3E") no-repeat 14px center'
            }}
          />
        </div>
      </div>

      <div className="members-content" style={{ 
        background: 'white', 
        borderRadius: '24px', 
        border: '1px solid #eef2f6',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="loading-spinner" style={{ fontSize: '2rem', animation: 'spin 2s linear infinite' }}>⏳</div>
            <p style={{ marginTop: '12px', color: '#64748b' }}>Loading members list...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="members-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '700', color: '#475569' }}>Member Profile</th>
                  <th style={{ padding: '16px 24px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Full Administrator</th>
                  <th style={{ padding: '16px 24px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Attendance Power</th>
                  <th style={{ padding: '16px 24px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Store Management</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.slice(0, 100).map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="member-row-hover">
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', height: '40px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '1.1rem'
                        }}>
                          {m.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{m.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>#{m.uid || 'N/A'} • {m.number || 'No Phone'}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <PowerToggle 
                        id={m.id} 
                        type="is_admin" 
                        value={m.is_admin} 
                        onToggle={togglePower} 
                        isLoading={updatingId === `${m.id}-is_admin`}
                        color="#ef4444"
                      />
                    </td>
                    
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <PowerToggle 
                        id={m.id} 
                        type="can_manage_attendance" 
                        value={m.can_manage_attendance} 
                        onToggle={togglePower} 
                        isLoading={updatingId === `${m.id}-can_manage_attendance`}
                        color="#3b82f6"
                      />
                    </td>
                    
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <PowerToggle 
                        id={m.id} 
                        type="can_manage_store" 
                        value={m.can_manage_store} 
                        onToggle={togglePower} 
                        isLoading={updatingId === `${m.id}-can_manage_store`}
                        color="#10b981"
                      />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                      No members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
        <strong>Power Legend:</strong> Administrator has full system access. Attendance Power allows managing all members' attendance & seva logs. Store Power allows managing canteen inventory and orders.
      </div>
    </div>
  );
};

const PowerToggle = ({ id, type, value, onToggle, isLoading, color }) => {
  return (
    <div 
      onClick={() => !isLoading && onToggle(id, type, value)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: value ? 'flex-end' : 'flex-start',
        width: '48px',
        height: '24px',
        borderRadius: '12px',
        background: value ? color : '#e2e8f0',
        padding: '2px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isLoading ? 0.6 : 1,
        position: 'relative'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {isLoading && <div style={{ width: '10px', height: '10px', border: '2px solid #ccc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
      </div>
    </div>
  );
};

export default AdminMaster;
