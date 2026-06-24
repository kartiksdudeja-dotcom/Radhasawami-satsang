import { getPool } from "../config/db.js";
import sql from "mssql";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }
    const pool = await getPool();

    // Ensure ProfilePhoto column exists
    try {
      await pool.request().query(`
        IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('MemberDetails') 
          AND name = 'ProfilePhoto'
        )
        BEGIN
          ALTER TABLE MemberDetails ADD ProfilePhoto NVARCHAR(500) NULL
        END
      `);
    } catch (alterErr) {
      console.log("Column check/add in getProfile:", alterErr.message);
    }

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM MemberDetails WHERE UserID = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const member = result.recordset[0];

    // Map database fields to frontend-friendly names
    const profileData = {
      id: member.UserID,
      memberid: member.MemberID,
      name: member.Name?.trim(),
      username: member.UserName?.trim(),
      gender: member.Gender?.trim(),
      status: member.Status?.trim(),
      branch: member.Branch?.trim(),
      region: member.Region?.trim(),
      uid: member.UID?.trim(),
      initial: member.Initital?.trim(),
      dob: member.DOB?.trim(),
      email: member.Email?.trim(),
      number: member.Number?.trim(),
      is_admin: member.ChkAdmin ? true : false,
      photo: member.ProfilePhoto?.trim() || null,
      father_name: member.Father_Name?.trim(),
      mother_name: member.Mother_Name?.trim(),
      blood_group: member.Blood_Group?.trim(),
      first_initiation: member.FirstInitiation?.trim(),
      second_initiation: member.SecondInitiation?.trim(),
      office_bearer: member.Office_Bearer?.trim(),
      address: member.Address?.trim() || null,
      office_address: member.OfficeAddress?.trim() || null,
      is_profile_complete: member.IsProfileComplete ? true : false,
      // Additional fields for new design
      husband_name: member.Husband_Name?.trim() || null,
      wife_name: member.Wife_Name?.trim() || null,
      jigyasu_registration: member.Jigyasu_Registeration?.trim() || null,
      association_member: member.Association_member?.trim() || null,
      unit_member: member.Unit_Member?.trim() || null,
    };

    res.json({ success: true, data: profileData });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update profile details (editable fields from Profile page)
export const updateProfileDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      email, 
      number, 
      address,
      office_address,
      gender,
      dob,
      blood_group,
      father_name,
      mother_name,
      husband_name,
      wife_name,
      initial,
      jigyasu_registration,
      first_initiation,
      second_initiation,
      office_bearer,
      association_member,
      unit_member,
      status
    } = req.body;

    const pool = await getPool();

    // Check if user exists
    const userCheck = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT UserID FROM MemberDetails WHERE UserID = @id`);

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Update editable profile details
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("email", sql.NVarChar(100), email || null)
      .input("number", sql.NVarChar(20), number || null)
      .input("address", sql.NVarChar(500), address || null)
      .input("office_address", sql.NVarChar(500), office_address || null)
      .input("gender", sql.NVarChar(50), gender || null)
      .input("dob", sql.NVarChar(50), dob || null)
      .input("blood_group", sql.NVarChar(255), blood_group || null)
      .input("father_name", sql.NVarChar(255), father_name || null)
      .input("mother_name", sql.NVarChar(255), mother_name || null)
      .input("husband_name", sql.NVarChar(255), husband_name || null)
      .input("wife_name", sql.NVarChar(255), wife_name || null)
      .input("initial", sql.NVarChar(255), initial || null)
      .input("jigyasu_registration", sql.NVarChar(255), jigyasu_registration || null)
      .input("first_initiation", sql.NVarChar(255), first_initiation || null)
      .input("second_initiation", sql.NVarChar(255), second_initiation || null)
      .input("office_bearer", sql.NVarChar(255), office_bearer || null)
      .input("association_member", sql.NVarChar(255), association_member || null)
      .input("unit_member", sql.NVarChar(255), unit_member || null)
      .input("status", sql.NVarChar(255), status || null)
      .query(`
        UPDATE MemberDetails 
        SET Email = @email, 
            Number = @number, 
            Address = @address,
            OfficeAddress = @office_address,
            Gender = @gender,
            DOB = @dob,
            Blood_Group = @blood_group,
            Father_Name = @father_name,
            Mother_Name = @mother_name,
            Husband_Name = @husband_name,
            Wife_Name = @wife_name,
            Initital = @initial,
            Jigyasu_Registeration = @jigyasu_registration,
            FirstInitiation = @first_initiation,
            SecondInitiation = @second_initiation,
            Office_Bearer = @office_bearer,
            Association_member = @association_member,
            Unit_Member = @unit_member,
            Status = @status
        WHERE UserID = @id
      `);

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile details:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Complete profile - marks profile as complete after all required info is filled
export const completeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      email, 
      number, 
      address,
      office_address,
      gender,
      dob,
      blood_group,
      father_name,
      mother_name,
      husband_name,
      wife_name,
      initial,
      jigyasu_registration,
      first_initiation,
      second_initiation,
      office_bearer,
      association_member,
      unit_member,
      status
    } = req.body;

    const pool = await getPool();

    // Check if user exists
    const userCheck = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT UserID, ProfilePhoto FROM MemberDetails WHERE UserID = @id`);

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Validate required fields
    const errors = [];
    if (!email || email.trim() === "") errors.push("Email is required");
    if (!number || number.trim() === "") errors.push("Phone number is required");

    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Please fill all required fields", 
        details: errors 
      });
    }

    // Update editable profile details and mark as complete
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("email", sql.NVarChar(100), email.trim())
      .input("number", sql.NVarChar(20), number.trim())
      .input("address", sql.NVarChar(500), address || null)
      .input("office_address", sql.NVarChar(500), office_address || null)
      .input("gender", sql.NVarChar(50), gender || null)
      .input("dob", sql.NVarChar(50), dob || null)
      .input("blood_group", sql.NVarChar(255), blood_group || null)
      .input("father_name", sql.NVarChar(255), father_name || null)
      .input("mother_name", sql.NVarChar(255), mother_name || null)
      .input("husband_name", sql.NVarChar(255), husband_name || null)
      .input("wife_name", sql.NVarChar(255), wife_name || null)
      .input("initial", sql.NVarChar(255), initial || null)
      .input("jigyasu_registration", sql.NVarChar(255), jigyasu_registration || null)
      .input("first_initiation", sql.NVarChar(255), first_initiation || null)
      .input("second_initiation", sql.NVarChar(255), second_initiation || null)
      .input("office_bearer", sql.NVarChar(255), office_bearer || null)
      .input("association_member", sql.NVarChar(255), association_member || null)
      .input("unit_member", sql.NVarChar(255), unit_member || null)
      .input("status", sql.NVarChar(255), status || null)
      .query(`
        UPDATE MemberDetails 
        SET Email = @email, 
            Number = @number, 
            Address = @address,
            OfficeAddress = @office_address,
            Gender = @gender,
            DOB = @dob,
            Blood_Group = @blood_group,
            Father_Name = @father_name,
            Mother_Name = @mother_name,
            Husband_Name = @husband_name,
            Wife_Name = @wife_name,
            Initital = @initial,
            Jigyasu_Registeration = @jigyasu_registration,
            FirstInitiation = @first_initiation,
            SecondInitiation = @second_initiation,
            Office_Bearer = @office_bearer,
            Association_member = @association_member,
            Unit_Member = @unit_member,
            Status = @status,
            IsProfileComplete = 1
        WHERE UserID = @id
      `);

    res.json({
      success: true,
      message: "Profile completed successfully! All features are now unlocked.",
      is_profile_complete: true,
    });
  } catch (error) {
    console.error("Error completing profile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check if profile is complete
export const checkProfileStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT IsProfileComplete, Email, Number 
        FROM MemberDetails 
        WHERE UserID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const member = result.recordset[0];
    
    // Check if required fields are filled (only email and number)
    const hasEmail = member.Email && member.Email.trim() !== "";
    const hasNumber = member.Number && member.Number.trim() !== "";
    
    const isComplete = member.IsProfileComplete || (hasEmail && hasNumber);

    res.json({
      success: true,
      is_profile_complete: isComplete,
      missing_fields: {
        email: !hasEmail,
        number: !hasNumber,
      },
    });
  } catch (error) {
    console.error("Error checking profile status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update profile photo
export const updateProfilePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const pool = await getPool();

    // First, ensure ProfilePhoto column exists
    try {
      await pool.request().query(`
        IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('MemberDetails') 
          AND name = 'ProfilePhoto'
        )
        BEGIN
          ALTER TABLE MemberDetails ADD ProfilePhoto NVARCHAR(500) NULL
        END
      `);
      console.log("ProfilePhoto column check/add completed");
    } catch (alterErr) {
      console.log("Column check/add error:", alterErr.message);
    }

    // Check if user exists
    const userCheck = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT UserID FROM MemberDetails WHERE UserID = @id`);

    if (userCheck.recordset.length === 0) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Try to get current photo to delete old one (may fail if column was just added)
    try {
      const currentUser = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`SELECT ProfilePhoto FROM MemberDetails WHERE UserID = @id`);

      const oldPhoto = currentUser.recordset[0]?.ProfilePhoto;
      if (oldPhoto) {
        const oldPhotoPath = path.join(__dirname, "..", oldPhoto.replace("/uploads/", "uploads/"));
        if (fs.existsSync(oldPhotoPath)) {
          try {
            fs.unlinkSync(oldPhotoPath);
          } catch (err) {
            console.log("Could not delete old photo:", err.message);
          }
        }
      }
    } catch (readErr) {
      console.log("Could not read old photo:", readErr.message);
    }

    // Save new photo path
    const photoPath = `/uploads/profiles/${req.file.filename}`;

    // Update profile photo in database
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("photo", sql.NVarChar, photoPath)
      .query(`UPDATE MemberDetails SET ProfilePhoto = @photo WHERE UserID = @id`);

    res.json({
      success: true,
      message: "Profile photo updated successfully",
      photo: photoPath,
    });
  } catch (error) {
    console.error("Error updating profile photo:", error);
    // Delete uploaded file if database update fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.log("Could not delete uploaded file:", err.message);
      }
    }
    res.status(500).json({ success: false, error: error.message });
  }
};
