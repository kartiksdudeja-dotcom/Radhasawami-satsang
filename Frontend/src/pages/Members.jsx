import React, { useState, useEffect } from "react";
import "../styles/Members.css";
import { API_ENDPOINTS, getAuthHeaders, apiFetch } from "../config/apiConfig";

const API_URL = API_ENDPOINTS.MEMBERS;

const Members = () => {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Load members from API on mount and when page comes into focus
  useEffect(() => {
    fetchMembers();

    // Optional: Refresh data when window comes back into focus
    const handleFocus = () => {
      fetchMembers();
    };
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching members from:", API_URL);
      const result = await apiFetch(API_URL);
      
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
          `📊 Members loaded: ${result.data.length}, unique: ${uniqueMembers.length}`
        );
        setMembers(uniqueMembers);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) {
      return;
    }

    try {
      setLoading(true);
      const result = await apiFetch(`${API_URL}/${id}`, { 
        method: "DELETE"
      });

      if (result && result.success) {
        await fetchMembers();
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

  const handleCancel = () => {
    // This function is no longer needed
  };

  // Filter members based on search term
  const filteredMembers = members.filter(
    (member) =>
      (member.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.number || "").includes(searchTerm) ||
      (member.username || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (member.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="members-page">
      <div className="members-header">
        <h1>Members Management</h1>
      </div>

      {/* Add/Edit Member Form - Hidden */}
      {false && (
        <div className="form-card">
          <h3>Hidden Form</h3>
        </div>
      )}

      {/* Members List */}
      <div className="members-list">
        {loading && members.length === 0 ? (
          <div className="empty-state">
            <p>Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="empty-state">
            <p>
              {members.length === 0
                ? 'No members yet. Click "Add New Member" to create one.'
                : "No members found matching your search."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="members-table-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>UID</th>
                    <th>Username</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Branch</th>
                    <th>Region</th>
                    <th>DOB</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member?.name || "Unknown"}</td>
                      <td>{member.uid || "N/A"}</td>
                      <td>@{member?.username || "N/A"}</td>
                      <td>
                        <span className={`gender-badge ${(member?.gender || "Male").toLowerCase()}`}>
                          {member?.gender || "Male"}
                        </span>
                      </td>
                      <td>{member.status || "Initiated"}</td>
                      <td>{member.branch || "N/A"}</td>
                      <td>{member.region || "N/A"}</td>
                      <td>{member.dob || "N/A"}</td>
                      <td className="action-cell">
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteMember(member.id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Grid View */}
            <div className="members-grid members-grid-mobile">
              {filteredMembers.map((member) => (
                <div key={member.id} className="member-card">
                  <div className="member-header">
                    <div className="member-avatar">
                      {(member?.name || "N/A").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="member-title">
                      <h4>{member?.name || "Unknown"}</h4>
                      <span className="member-username">
                        @{member?.username || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="member-details">
                    <div className="detail-row">
                      <span className="label">Number:</span>
                      <span className="value">
                        {member.number || member.initial || "N/A"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Email:</span>
                      <span className="value">{member.email || "N/A"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Password:</span>
                      <span className="value password-field">••••••••••</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Created:</span>
                      <span className="value">
                        {member.created_at 
                          ? new Date(member.created_at).toLocaleDateString() 
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="member-actions">
                    <button
                      className="edit-btn"
                      onClick={() => window.location.href = `/#/member-master?edit=${member.id}`}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteMember(member.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Members;
