import { getPool } from "../config/db.js";

import sql from "mssql";
import bcrypt from "bcrypt";
import { detectGenderFromName } from "../utils/genderDetector.js";

// Get all members
export const getAllMembers = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query(`
        SELECT 
          UserID, MemberID, Name, UserName, Gender, Status, Branch, Region, 
          UID, Initital, DOB, Email, Number, Address, OfficeAddress, 
          Blood_Group, Father_Name, Mother_Name, Husband_Name, Wife_Name, 
          FirstInitiation, SecondInitiation, Jigyasu_Registeration, 
          Office_Bearer, Association_member, Unit_Member, 
          ChkAdmin, CanManageAttendance, CanManageStore, IsProfileComplete 
        FROM MemberDetails 
        ORDER BY MemberID DESC
      `);

    // Complete mapping with only essential profile fields for the list view
    const cleanedData = result.recordset.map((member) => ({
      id: member.UserID,
      memberid: member.MemberID,
      name: (member.Name || "").trim(),
      username: (member.UserName || "").trim(),
      gender: (member.Gender || "").trim(),
      status: (member.Status || "").trim(),
      branch: (member.Branch || "").trim(),
      region: (member.Region || "").trim(),
      uid: (member.UID || "").trim(),
      number: (member.Number || "").trim(),
      is_admin: !!member.ChkAdmin,
      can_manage_attendance: !!member.CanManageAttendance,
      can_manage_store: !!member.CanManageStore,
      is_profile_complete: !!member.IsProfileComplete,
    }));

    // Remove duplicates based on UID and name (keep first occurrence)
    const uniqueMembers = [];
    const seen = new Set();

    for (const member of cleanedData) {
      const key = `${(member.uid || "NO_UID").toUpperCase()}|${(
        member.name || "NO_NAME"
      ).toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMembers.push(member);
      }
    }

    console.log(
      `📊 Fetched ${cleanedData.length} members, returned ${
        uniqueMembers.length
      } (removed ${cleanedData.length - uniqueMembers.length} duplicates)`
    );
    res.json({ success: true, data: uniqueMembers });
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get family members for a specific user (logged-in user + their family)
export const getFamilyMembers = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    // First get the logged-in user's details
    const userResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`SELECT * FROM MemberDetails WHERE UserID = @userId`);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentUser = userResult.recordset[0];
    const currentUserName = (currentUser.Name || "").trim();
    
    // Extract surname (last word of name) for family matching
    const nameParts = currentUserName.split(/\s+/);
    const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : currentUserName;

    console.log(`🔍 Looking for family members with surname: "${surname}" for user: "${currentUserName}"`);

    // Find all members with the same surname (last name)
    const familyResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("surname", sql.NVarChar, `% ${surname}`)
      .input("exactSurname", sql.NVarChar, surname)
      .query(`
        SELECT * FROM MemberDetails 
        WHERE UserID = @userId
          OR (LTRIM(RTRIM(Name)) LIKE @surname)
          OR (LTRIM(RTRIM(Name)) = @exactSurname)
        ORDER BY MemberID DESC
      `);

    const cleanedData = familyResult.recordset.map((member) => ({
      id: member.UserID,
      memberid: member.MemberID,
      name: (member.Name || "").trim(),
      username: (member.UserName || "").trim(),
      gender: (member.Gender || "").trim(),
      status: (member.Status || "").trim(),
      branch: (member.Branch || "").trim(),
      region: (member.Region || "").trim(),
      uid: (member.UID || "").trim(),
      initial: (member.Initital || "").trim(),
      dob: (member.DOB || "").trim(),
      email: (member.Email || "").trim(),
      number: (member.Number || "").trim(),
      address: (member.Address || "").trim(),
      office_address: (member.OfficeAddress || "").trim(),
      blood_group: (member.Blood_Group || "").trim(),
      father_name: (member.Father_Name || "").trim(),
      mother_name: (member.Mother_Name || "").trim(),
      husband_name: (member.Husband_Name || "").trim(),
      wife_name: (member.Wife_Name || "").trim(),
      first_initiation: (member.FirstInitiation || "").trim(),
      second_initiation: (member.SecondInitiation || "").trim(),
      jigyasu_registration: (member.Jigyasu_Registeration || "").trim(),
      office_bearer: (member.Office_Bearer || "").trim(),
      association_member: (member.Association_member || "").trim(),
      unit_member: (member.Unit_Member || "").trim(),
      is_admin: member.ChkAdmin ? true : false,
      can_manage_attendance: member.CanManageAttendance ? true : false,
      can_manage_store: member.CanManageStore ? true : false,
      is_profile_complete: member.IsProfileComplete ? true : false,
    }));

    // Remove duplicates
    const uniqueMembers = [];
    const seen = new Set();
    for (const member of cleanedData) {
      const key = `${(member.uid || "NO_UID").toUpperCase()}|${(member.name || "NO_NAME").toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMembers.push(member);
      }
    }

    console.log(`👨‍👩‍👧‍👦 Family members for user ${userId}: ${uniqueMembers.length} found`);
    res.json({ success: true, data: uniqueMembers });
  } catch (error) {
    console.error("Error fetching family members:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single member
export const getMemberById = async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM MemberDetails WHERE UserID = @id`);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create member
export const createMember = async (req, res) => {
  try {
    const pool = await getPool();
    const {
      branch,
      region,
      uid,
      initial,
      name,
      gender,
      dob,
      first_initiation,
      second_initiation,
      jigyasu_registration,
      blood_group,
      father_name,
      mother_name,
      husband_name,
      wife_name,
      office_bearer,
      username,
      password,
      association_member,
      unit_member,
      status,
    } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, Username and Password are required",
      });
    }

    // Check if username exists
    const existing = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query(`SELECT UserID FROM MemberDetails WHERE UserName = @username`);

    if (existing.recordset.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "Username already exists" });
    }

    const detectedGender = gender || detectGenderFromName(name);

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get next MemberID since it cannot be NULL
    const nextIdResult = await pool.request().query("SELECT ISNULL(MAX(MemberID), 0) + 1 as nextId FROM MemberDetails");
    const nextMemberId = nextIdResult.recordset[0].nextId;

    // Insert new member
    const result = await pool
      .request()
      .input("memberid", sql.Int, nextMemberId)
      .input("branch", sql.NVarChar, branch || null)
      .input("region", sql.NVarChar, region || null)
      .input("uid", sql.NVarChar, uid || null)
      .input("initial", sql.NVarChar, initial || null)
      .input("name", sql.NVarChar, name)
      .input("gender", sql.NVarChar, detectedGender)
      .input("dob", sql.NVarChar, dob || null)
      .input("first_initiation", sql.NVarChar, first_initiation || null)
      .input("second_initiation", sql.NVarChar, second_initiation || null)
      .input("jigyasu_registration", sql.NVarChar, jigyasu_registration || null)
      .input("blood_group", sql.NVarChar, blood_group || null)
      .input("father_name", sql.NVarChar, father_name || null)
      .input("mother_name", sql.NVarChar, mother_name || null)
      .input("husband_name", sql.NVarChar, husband_name || null)
      .input("wife_name", sql.NVarChar, wife_name || null)
      .input("office_bearer", sql.NVarChar, office_bearer || null)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashedPassword)
      .input("association_member", sql.NVarChar, association_member || null)
      .input("unit_member", sql.NVarChar, unit_member || null)
      .input("status", sql.NVarChar, status || "Initiated").query(`
        INSERT INTO MemberDetails (
          MemberID, Branch, Region, UID, Initital, Name, Gender, DOB,
          FirstInitiation, SecondInitiation, Jigyasu_Registeration,
          Blood_Group, Father_Name, Mother_Name, Husband_Name, Wife_Name,
          Office_Bearer, UserName, Password, Association_member, Unit_Member, Status
        ) VALUES (
          @memberid, @branch, @region, @uid, @initial, @name, @gender, @dob,
          @first_initiation, @second_initiation, @jigyasu_registration,
          @blood_group, @father_name, @mother_name, @husband_name, @wife_name,
          @office_bearer, @username, @password, @association_member, @unit_member, @status
        );
        SELECT SCOPE_IDENTITY() as id;
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id, ...req.body },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update member
export const updateMember = async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const {
      branch,
      region,
      uid,
      initial,
      name,
      gender,
      dob,
      first_initiation,
      second_initiation,
      jigyasu_registration,
      blood_group,
      father_name,
      mother_name,
      husband_name,
      wife_name,
      office_bearer,
      email,
      number,
      address,
      office_address,
      username,
      password,
      association_member,
      unit_member,
      status,
    } = req.body;

    // Check if member exists
    const existing = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM MemberDetails WHERE UserID = @id`);

    if (existing.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found" });
    }

    const member = existing.recordset[0];

    // Check if new username conflicts
    if (username && username !== member.UserName) {
      const conflict = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .input("id", sql.Int, id)
        .query(
          `SELECT UserID FROM MemberDetails WHERE UserName = @username AND UserID != @id`
        );

      if (conflict.recordset.length > 0) {
        return res
          .status(400)
          .json({ success: false, error: "Username already exists" });
      }
    }

    const detectedGender =
      gender || (name ? detectGenderFromName(name) : member.Gender);

    // SECURE PASSWORDS: Only hash if a new password is provided
    let finalPassword = member.Password;
    if (password && password.trim() !== "") {
      // Check if it's already a hash (to avoid double hashing if UI sends back existing hash)
      const isAlreadyHashed = password.startsWith("$2b$") || password.startsWith("$2a$");
      if (!isAlreadyHashed && password !== member.Password) {
        console.log(`🔒 Hashing updated password for user ID: ${id}`);
        finalPassword = await bcrypt.hash(password, 10);
      }
    }

    // Update member
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("branch", sql.NVarChar, branch || member.Branch)
      .input("region", sql.NVarChar, region || member.Region)
      .input("uid", sql.NVarChar, uid || member.UID)
      .input("initial", sql.NVarChar, initial || member.Initital)
      .input("name", sql.NVarChar, name || member.Name)
      .input("gender", sql.NVarChar, detectedGender)
      .input("dob", sql.NVarChar, dob || member.DOB)
      .input(
        "first_initiation",
        sql.NVarChar,
        first_initiation || member.FirstInitiation
      )
      .input(
        "second_initiation",
        sql.NVarChar,
        second_initiation || member.SecondInitiation
      )
      .input(
        "jigyasu_registration",
        sql.NVarChar,
        jigyasu_registration || member.Jigyasu_Registeration
      )
      .input("blood_group", sql.NVarChar, blood_group || member.Blood_Group)
      .input("father_name", sql.NVarChar, father_name || member.Father_Name)
      .input("mother_name", sql.NVarChar, mother_name || member.Mother_Name)
      .input("husband_name", sql.NVarChar, husband_name || member.Husband_Name)
      .input("wife_name", sql.NVarChar, wife_name || member.Wife_Name)
      .input(
        "office_bearer",
        sql.NVarChar,
        office_bearer || member.Office_Bearer
      )
      .input("email", sql.NVarChar, email || member.Email)
      .input("number", sql.NVarChar, number || member.Number)
      .input("address", sql.NVarChar, address || member.Address)
      .input("office_address", sql.NVarChar, office_address || member.OfficeAddress)
      .input("username", sql.NVarChar, username || member.UserName)
      .input("password", sql.NVarChar, finalPassword)
      .input(
        "association_member",
        sql.NVarChar,
        association_member || member.Association_member
      )
      .input("unit_member", sql.NVarChar, unit_member || member.Unit_Member)
      .input("status", sql.NVarChar, status || member.Status).query(`
        UPDATE MemberDetails SET
          Branch = @branch, Region = @region, UID = @uid, Initital = @initial,
          Name = @name, Gender = @gender, DOB = @dob,
          FirstInitiation = @first_initiation, SecondInitiation = @second_initiation,
          Jigyasu_Registeration = @jigyasu_registration,
          Blood_Group = @blood_group, Father_Name = @father_name, Mother_Name = @mother_name,
          Husband_Name = @husband_name, Wife_Name = @wife_name,
          Office_Bearer = @office_bearer, Email = @email, Number = @number,
          Address = @address, OfficeAddress = @office_address,
          UserName = @username, Password = @password,
          Association_member = @association_member, Unit_Member = @unit_member, Status = @status
        WHERE UserID = @id
      `);

    const updated = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM MemberDetails WHERE UserID = @id`);

    res.json({ success: true, data: updated.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete member
export const deleteMember = async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    // Check if member exists
    const existing = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT UserID FROM MemberDetails WHERE UserID = @id`);

    if (existing.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found" });
    }

    // Delete member
    await pool
      .request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM MemberDetails WHERE UserID = @id`);

    res.json({ success: true, message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Search members (Admin sees all, Users see only family)
export const searchMembers = async (req, res) => {
  try {
    const pool = await getPool();
    const { query } = req.query;
    const requesterId = req.user.id;

    if (!query) {
      return res
        .status(400)
        .json({ success: false, error: "Search query required" });
    }

    // 1. Check if requester has any admin power
    const requesterResult = await pool.request()
      .input("id", sql.Int, requesterId)
      .query(`SELECT ChkAdmin, CanManageAttendance, CanManageStore, Name FROM MemberDetails WHERE UserID = @id`);
    
    if (requesterResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Requester not found" });
    }

    const requester = requesterResult.recordset[0];
    const isAdmin = requester.ChkAdmin || requester.CanManageAttendance || requester.CanManageStore;

    const searchTerm = `%${query}%`;
    let queryText = "";

    if (isAdmin) {
      // Admin/Manager: Search everyone
      queryText = `
        SELECT UserID as id, MemberID as memberid, Name as name, UID as uid, UserName as username, 
               Gender as gender, Branch as branch, Number as number, IsProfileComplete as is_profile_complete
        FROM MemberDetails 
        WHERE Name LIKE @query OR UID LIKE @query OR UserName LIKE @query
        ORDER BY UserID DESC
      `;
    } else {
      // Regular User: Search only family members (same surname)
      const requesterName = (requester.Name || "").trim();
      const nameParts = requesterName.split(/\s+/);
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : requesterName;
      
      queryText = `
        SELECT UserID as id, MemberID as memberid, Name as name, UID as uid, UserName as username, 
               Gender as gender, Branch as branch, Number as number, IsProfileComplete as is_profile_complete
        FROM MemberDetails 
        WHERE (Name LIKE @query OR UID LIKE @query OR UserName LIKE @query)
          AND (
            UserID = @requesterId 
            OR LTRIM(RTRIM(Name)) LIKE @surnamePattern
            OR LTRIM(RTRIM(Name)) = @exactSurname
          )
        ORDER BY UserID DESC
      `;
    }

    const request = pool.request()
      .input("query", sql.NVarChar, searchTerm)
      .input("requesterId", sql.Int, requesterId);

    if (!isAdmin) {
      const requesterName = (requester.Name || "").trim();
      const nameParts = requesterName.split(/\s+/);
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : requesterName;
      request.input("surnamePattern", sql.NVarChar, `% ${surname}`);
      request.input("exactSurname", sql.NVarChar, surname);
    }

    const result = await request.query(queryText);

    // Filter duplicates
    const uniqueMembers = [];
    const seen = new Set();
    for (const member of result.recordset) {
      const key = `${(member.uid || "NO_UID").toUpperCase()}|${(member.name || "NO_NAME").toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMembers.push({
          ...member,
          name: (member.name || "").trim(),
          uid: (member.uid || "").trim()
        });
      }
    }

    res.json({ success: true, data: uniqueMembers });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update member power/permissions
export const updateMemberPower = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_admin, can_manage_attendance, can_manage_store } = req.body;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .input("isAdmin", sql.Bit, is_admin ? 1 : 0)
      .input("canAttendance", sql.Bit, can_manage_attendance ? 1 : 0)
      .input("canStore", sql.Bit, can_manage_store ? 1 : 0)
      .query(`
        UPDATE MemberDetails 
        SET ChkAdmin = @isAdmin, 
            CanManageAttendance = @canAttendance, 
            CanManageStore = @canStore 
        WHERE UserID = @id
      `);

    res.json({ success: true, message: "Permissions updated successfully" });
  } catch (error) {
    console.error("Error updating member permissions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
