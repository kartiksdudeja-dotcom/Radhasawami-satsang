import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import "../styles/Profile.css";
import { API_BASE_URL, getAuthHeaders, apiFetch } from "../config/apiConfig";

// Icons components (Lucide-style SVG icons)
const Icon = ({ name, size = 16 }) => {
  const icons = {
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    droplet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
    award: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    mapPin: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    building: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    heart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    save: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
    camera: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    userCheck: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  };
  return icons[name] || null;
};

// Info Field Component - Outside Profile to prevent recreation on each render
const InfoField = memo(({ 
  icon, 
  label, 
  value, 
  editable = false, 
  fieldName = null, 
  type = "text", 
  options = null,
  isEditMode = false,
  formValue = "",
  onChange = null
}) => {
  const displayValue = isEditMode && fieldName ? formValue : value;
  const isEmpty = !displayValue || displayValue === "-" || displayValue.toString().trim() === "";
  
  return (
    <div className={`info-field ${isEmpty ? 'info-field-empty' : ''}`}>
      <div className="info-field-header">
        <span className="info-field-icon"><Icon name={icon} size={12} /></span>
        <label className="info-field-label">{label}</label>
      </div>
      {isEditMode && editable && fieldName ? (
        options ? (
          <select
            name={fieldName}
            className="info-field-input"
            value={formValue || ""}
            onChange={onChange}
          >
            <option value="">Select {label}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input 
            type={type}
            name={fieldName}
            className="info-field-input"
            value={formValue || ""}
            onChange={onChange}
            placeholder={`Enter ${label.toLowerCase()}`}
            autoComplete="off"
          />
        )
      ) : (
        <p className={`info-field-value ${isEmpty ? 'empty' : ''}`}>
          {isEmpty ? "Not specified" : displayValue}
        </p>
      )}
    </div>
  );
});

InfoField.displayName = "InfoField";

const Profile = ({ user, onProfileComplete }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    email: "",
    number: "",
    address: "",
    office_address: "",
    gender: "",
    dob: "",
    blood_group: "",
    father_name: "",
    mother_name: "",
    husband_name: "",
    wife_name: "",
    initial: "",
    jigyasu_registration: "",
    first_initiation: "",
    second_initiation: "",
    office_bearer: "",
    association_member: "",
    unit_member: "",
    status: "",
  });

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await apiFetch(`/api/profile/${user?.id}`);
      
      if (result && result.success) {
        setProfileData(result.data);
        setFormData({
          email: result.data.email || "",
          number: result.data.number || "",
          address: result.data.address || "",
          office_address: result.data.office_address || "",
          gender: result.data.gender || "",
          dob: result.data.dob || "",
          blood_group: result.data.blood_group || "",
          father_name: result.data.father_name || "",
          mother_name: result.data.mother_name || "",
          husband_name: result.data.husband_name || "",
          wife_name: result.data.wife_name || "",
          initial: result.data.initial || "",
          jigyasu_registration: result.data.jigyasu_registration || "",
          first_initiation: result.data.first_initiation || "",
          second_initiation: result.data.second_initiation || "",
          office_bearer: result.data.office_bearer || "",
          association_member: result.data.association_member || "",
          unit_member: result.data.unit_member || "",
          status: result.data.status || "",
        });
        if (!result.data.is_profile_complete) {
          setIsEditMode(true);
        }
      } else if (result) {
        setError(result.error || "Failed to load profile");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image size should be less than 5MB"); return; }

    try {
      setUploading(true);
      setError("");
      const uploadData = new FormData();
      uploadData.append("photo", file);
      
      const result = await apiFetch(`/api/profile/${user?.id}/photo`, { 
        method: "POST", 
        body: uploadData
      });

      if (result && result.success) {
        setSuccess("Profile photo updated!");
        setProfileData((prev) => ({ ...prev, photo: result.photo }));
        setTimeout(() => setSuccess(""), 3000);
      } else if (result) {
        setError(result.error || "Failed to upload photo");
      }
    } catch (err) {
      setError("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Memoized handler for stable reference across renders
  const memoizedHandleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSaveProfile = async () => {
    const errors = [];
    if (!formData.email?.trim()) errors.push("Email");
    if (!formData.number?.trim()) errors.push("Phone Number");

    if (errors.length > 0) {
      setError(`Please fill: ${errors.join(", ")}`);
      return;
    }

    try {
      setSaving(true);
      setError("");
      const endpoint = profileData?.is_profile_complete 
        ? `/api/profile/${user?.id}`
        : `/api/profile/${user?.id}/complete`;

      const result = await apiFetch(endpoint, {
        method: profileData?.is_profile_complete ? "PUT" : "POST",
        body: formData,
      });

      if (result && result.success) {
        setSuccess(profileData?.is_profile_complete ? "Profile updated!" : "🎉 Profile completed!");
        setProfileData((prev) => ({ ...prev, ...formData, is_profile_complete: true }));
        setIsEditMode(false);
        
        if (!profileData?.is_profile_complete) {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          storedUser.is_profile_complete = true;
          localStorage.setItem("user", JSON.stringify(storedUser));
          if (onProfileComplete) onProfileComplete(true);
          setTimeout(() => window.location.reload(), 1500);
        }
        setTimeout(() => setSuccess(""), 3000);
      } else if (result) {
        setError(result.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Status options from Member Master
  const statusOptions = [
    { value: "Initiated", label: "Initiated" },
    { value: "Primary", label: "Primary" },
    { value: "PRIMARY 1", label: "PRIMARY 1" },
    { value: "Phase 1", label: "Phase 1" },
    { value: "Children", label: "Children" },
    { value: "Jigyasu", label: "Jigyasu" },
  ];

  // Gender options
  const genderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Compact Header - Sticky */}
      <div className="profile-header">
        <h1 className="profile-header-title">Profile</h1>
        <div className="profile-header-actions">
          {isEditMode ? (
            <>
              <button className="btn btn-outline" onClick={() => setIsEditMode(false)}>
                <Icon name="x" size={14} />
                <span className="btn-text-desktop">Cancel</span>
              </button>
              <button className="btn btn-success" onClick={handleSaveProfile} disabled={saving}>
                <Icon name="save" size={14} />
                <span className="btn-text-desktop">{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setIsEditMode(true)}>
              <Icon name="edit" size={14} />
              <span className="btn-text-desktop">Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          {/* Blue Header with Avatar */}
          <div className="card-header-blue">
            <div className="header-content">
              <div className="avatar-wrapper" onClick={handlePhotoClick}>
                {profileData?.photo ? (
                  <img src={`${API_BASE_URL}${profileData.photo}`} alt="Profile" className="avatar-img" />
                ) : (
                  <div className="avatar-fallback">{getInitials(profileData?.name || user?.name)}</div>
                )}
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" hidden />
                {profileData?.is_profile_complete && (
                  <div className="avatar-badge">
                    <Icon name="check" size={10} />
                  </div>
                )}
                {uploading && <div className="avatar-uploading">...</div>}
              </div>
              
              <div className="header-info">
                <h2 className="user-name">{profileData?.name || "User"}</h2>
                <p className="user-id">{profileData?.uid || profileData?.memberid || "N/A"}</p>
                <div className="badges">
                  {profileData?.is_admin && <span className="badge badge-admin">Administrator</span>}
                  <span className="badge badge-active">● Active</span>
                  {profileData?.branch && <span className="badge badge-outline">{profileData.branch}</span>}
                  {profileData?.region && <span className="badge badge-outline">{profileData.region}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="card-body">
            {/* Personal Information */}
            <section className="info-section">
              <h3 className="section-title">
                <Icon name="user" size={16} />
                Personal Information
              </h3>
              <div className="info-grid">
                <InfoField icon="users" label="Gender" value={profileData?.gender} isEditMode={isEditMode} editable fieldName="gender" formValue={formData.gender} onChange={memoizedHandleInputChange} options={genderOptions} />
                <InfoField icon="calendar" label="Date of Birth" value={profileData?.dob} isEditMode={isEditMode} editable fieldName="dob" formValue={formData.dob} onChange={memoizedHandleInputChange} type="date" />
                <InfoField icon="droplet" label="Blood Group" value={profileData?.blood_group} isEditMode={isEditMode} editable fieldName="blood_group" formValue={formData.blood_group} onChange={memoizedHandleInputChange} />
                <InfoField icon="users" label="Father's Name" value={profileData?.father_name} isEditMode={isEditMode} editable fieldName="father_name" formValue={formData.father_name} onChange={memoizedHandleInputChange} />
                <InfoField icon="users" label="Mother's Name" value={profileData?.mother_name} isEditMode={isEditMode} editable fieldName="mother_name" formValue={formData.mother_name} onChange={memoizedHandleInputChange} />
                <InfoField icon="heart" label="Husband Name" value={profileData?.husband_name} isEditMode={isEditMode} editable fieldName="husband_name" formValue={formData.husband_name} onChange={memoizedHandleInputChange} />
                <InfoField icon="heart" label="Wife Name" value={profileData?.wife_name} isEditMode={isEditMode} editable fieldName="wife_name" formValue={formData.wife_name} onChange={memoizedHandleInputChange} />
                <InfoField icon="award" label="Initial" value={profileData?.initial} isEditMode={isEditMode} editable fieldName="initial" formValue={formData.initial} onChange={memoizedHandleInputChange} />
              </div>
            </section>

            <div className="section-divider"></div>

            {/* Religious Information */}
            <section className="info-section">
              <h3 className="section-title">
                <Icon name="award" size={16} />
                Religious Information
              </h3>
              <div className="info-grid">
                <InfoField icon="userCheck" label="Jigyasu Registration" value={profileData?.jigyasu_registration} isEditMode={isEditMode} editable fieldName="jigyasu_registration" formValue={formData.jigyasu_registration} onChange={memoizedHandleInputChange} type="date" />
                <InfoField icon="calendar" label="First Initiation" value={profileData?.first_initiation} isEditMode={isEditMode} editable fieldName="first_initiation" formValue={formData.first_initiation} onChange={memoizedHandleInputChange} type="date" />
                <InfoField icon="calendar" label="Second Initiation" value={profileData?.second_initiation} isEditMode={isEditMode} editable fieldName="second_initiation" formValue={formData.second_initiation} onChange={memoizedHandleInputChange} type="date" />
                <InfoField icon="award" label="Office Bearer" value={profileData?.office_bearer} isEditMode={isEditMode} editable fieldName="office_bearer" formValue={formData.office_bearer} onChange={memoizedHandleInputChange} />
                <InfoField icon="users" label="Association Member" value={profileData?.association_member} isEditMode={isEditMode} editable fieldName="association_member" formValue={formData.association_member} onChange={memoizedHandleInputChange} />
                <InfoField icon="users" label="Unit Member" value={profileData?.unit_member} isEditMode={isEditMode} editable fieldName="unit_member" formValue={formData.unit_member} onChange={memoizedHandleInputChange} />
                <InfoField icon="userCheck" label="Status" value={profileData?.status} isEditMode={isEditMode} editable fieldName="status" formValue={formData.status} onChange={memoizedHandleInputChange} options={statusOptions} />
              </div>
            </section>

            <div className="section-divider"></div>

            {/* Account Information */}
            <section className="info-section">
              <h3 className="section-title">
                <Icon name="lock" size={16} />
                Account Information
              </h3>
              <div className="info-grid">
                <InfoField icon="user" label="Username" value={profileData?.username} empty={!profileData?.username} />
                <InfoField icon="lock" label="Password" value="••••••••" />
              </div>
            </section>

            <div className="section-divider"></div>

            {/* Contact Information */}
            <section className="info-section">
              <h3 className="section-title">
                <Icon name="mail" size={16} />
                Contact Information
              </h3>
              <div className="contact-grid">
                <div className="contact-column">
                  <div className="contact-field">
                    <label className="contact-label">
                      <Icon name="mail" size={12} />
                      Email Address
                    </label>
                    <input 
                      type="email"
                      name="email"
                      className="contact-input"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!isEditMode}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="contact-field">
                    <label className="contact-label">
                      <Icon name="phone" size={12} />
                      Phone Number
                    </label>
                    <input 
                      type="tel"
                      name="number"
                      className="contact-input"
                      value={formData.number}
                      onChange={handleInputChange}
                      disabled={!isEditMode}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <div className="contact-column">
                  <div className="contact-field">
                    <label className="contact-label">
                      <Icon name="mapPin" size={12} />
                      Home Address
                    </label>
                    <input 
                      type="text"
                      name="address"
                      className="contact-input"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!isEditMode}
                      placeholder="Enter home address"
                    />
                  </div>
                  <div className="contact-field">
                    <label className="contact-label">
                      <Icon name="building" size={12} />
                      Office Address
                    </label>
                    <input 
                      type="text"
                      name="office_address"
                      className="contact-input"
                      value={formData.office_address}
                      onChange={handleInputChange}
                      disabled={!isEditMode}
                      placeholder="Enter office address"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
