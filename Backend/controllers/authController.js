import { getPool } from "../config/db.js";
import sql from "mssql";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Robust boolean detection helper for database flags
const checkBoolean = (val) => {
  if (val === null || val === undefined) return false;
  const s = String(val).toLowerCase();
  return val === true || val === 1 || s === "1" || s === "true" || s === "y";
};

// User Login
export const login = async (req, res) => {
  try {
    let { username, password } = req.body;

    // Security Guard: Check for undefined, null, or non-string types
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password.trim()) {
      return res
        .status(400)
        .json({ 
          success: false, 
          error: "Valid Username and password are required" 
        });
    }

    // Sanitize inputs
    username = username.trim();
    password = password.trim();

    // Get SQL Server connection
    const pool = await getPool();

    // Query user from MemberDetails table
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query(
        `SELECT TOP 1 UserID, UserName, Password, Name, ChkAdmin, CanManageAttendance, CanManageStore FROM MemberDetails WHERE UserName = @username OR UID = @username`
      );

    if (result.recordset.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username or password" });
    }

    const user = result.recordset[0];
    const dbPassword = user.Password.trim();

    // SECURE AUTH: Supports both BCrypt and legacy Plain-text with auto-upgrade
    let isMatch = false;
    const isHashed = dbPassword.startsWith("$2b$") || dbPassword.startsWith("$2a$");

    if (isHashed) {
      isMatch = await bcrypt.compare(password, dbPassword);
    } else {
      isMatch = password === dbPassword;
      if (isMatch) {
        console.log(`🔒 Upgrading password to BCrypt: ${username}`);
        const newHash = await bcrypt.hash(password, 10);
        await pool.request()
          .input("newHash", sql.NVarChar, newHash)
          .input("uid", sql.Int, user.UserID)
          .query(`UPDATE MemberDetails SET Password = @newHash WHERE UserID = @uid`);
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid username or password" });
    }

    const permissions = {
      is_admin: checkBoolean(user.ChkAdmin),
      can_manage_attendance: checkBoolean(user.CanManageAttendance),
      can_manage_store: checkBoolean(user.CanManageStore)
    };

    // NO LONGER USING JWT - MOVING TO NORMAL PROCESS
    // We send UserID as the token to keep it simple
    const token = jwt.sign(
      {
        id: user.UserID,
        role: permissions.is_admin ? "admin" : "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token, // Simple UserID instead of JWT
      user: {
        id: user.UserID,
        name: (user.Name || "").trim(),
        username: (user.UserName || "").trim(),
        ...permissions
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// User Signup (if needed)
export const signup = async (req, res) => {
  try {
    let { name, username, password } = req.body;

    // Security Guard: Ensure all inputs are true strings and not empty
    if (
      typeof name !== 'string' || 
      typeof username !== 'string' || 
      typeof password !== 'string' ||
      !name.trim() || !username.trim() || !password.trim()
    ) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required and must be valid strings" });
    }

    // Sanitize
    name = name.trim();
    username = username.trim();
    password = password.trim();

    const pool = await getPool();

    // Check if user exists
    const checkUser = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query("SELECT UserID FROM MemberDetails WHERE UserName = @username");

    if (checkUser.recordset.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "Username already exists" });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get next MemberID since it cannot be NULL
    const nextIdResult = await pool.request().query("SELECT ISNULL(MAX(MemberID), 0) + 1 as nextId FROM MemberDetails");
    const nextMemberId = nextIdResult.recordset[0].nextId;

    // Insert new user
    await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashedPassword)
      .input("memberId", sql.Int, nextMemberId)
      .query(
        `INSERT INTO MemberDetails (Name, UserName, Password, ChkAdmin, MemberID) VALUES (@name, @username, @password, 0, @memberId)`
      );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get User
export const getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const pool = await getPool();

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(
        `SELECT UserID, UserName, Name, ChkAdmin, CanManageAttendance, CanManageStore FROM MemberDetails WHERE UserID = @userId`
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = result.recordset[0];
    
    res.json({
      success: true,
      user: {
        id: user.UserID,
        name: (user.Name || "").trim(),
        username: (user.UserName || "").trim(),
        is_admin: checkBoolean(user.ChkAdmin),
        can_manage_attendance: checkBoolean(user.CanManageAttendance),
        can_manage_store: checkBoolean(user.CanManageStore),
      },
    });
  } catch (error) {
    console.error("GetUser error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check User Role (Pre-login)
export const checkRole = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: "Username (UID) is required" });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query(
        `SELECT TOP 1 UserID, UserName, ChkAdmin, CanManageAttendance, CanManageStore, Name FROM MemberDetails WHERE UserName = @username OR UID = @username`
      );

    if (result.recordset.length === 0) {
      return res.json({ success: false, error: "User not found" });
    }

    const user = result.recordset[0];
    const isAdmin = checkBoolean(user.ChkAdmin);
    const canManageAttendance = checkBoolean(user.CanManageAttendance);
    const canManageStore = checkBoolean(user.CanManageStore);

    res.json({
      success: true,
      isAdmin,
      canManageAttendance,
      canManageStore,
      name: user.Name ? user.Name.trim() : ""
    });
  } catch (error) {
    console.error("Check role error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Login as Member (Admin impersonation)
export const loginAsMember = async (req, res) => {
  try {
    const { member_id, admin_id } = req.body;

    if (!member_id) {
      return res
        .status(400)
        .json({ success: false, error: "Member ID is required" });
    }

    if (!admin_id) {
      return res
        .status(400)
        .json({ success: false, error: "Admin ID is required" });
    }

    // Get SQL Server connection
    const pool = await getPool();

    // Verify admin user
    const adminResult = await pool
      .request()
      .input("userId", sql.Int, admin_id)
      .query(
        `SELECT UserID, UserName, Name, ChkAdmin FROM MemberDetails WHERE UserID = @userId`
      );

    if (adminResult.recordset.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Admin user not found" });
    }

    const adminUser = adminResult.recordset[0];
    const isAdmin = checkBoolean(adminUser.ChkAdmin);

    if (!isAdmin) {
      return res
        .status(403)
        .json({ success: false, error: "Only admins can login as members" });
    }

    // Get member details
    const memberResult = await pool
      .request()
      .input("memberId", sql.Int, member_id)
      .query(
        `SELECT UserID, UserName, Name, Gender, CanManageAttendance, CanManageStore FROM MemberDetails WHERE UserID = @memberId`
      );

    if (memberResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found" });
    }

    const member = memberResult.recordset[0];
    
    res.json({
      success: true,
      message: `Logged in as ${member.Name}`,
      user: {
        id: member.UserID,
        name: (member.Name || "").trim(),
        username: (member.UserName || "").trim(),
        is_admin: false,
        can_manage_attendance: checkBoolean(member.CanManageAttendance),
        can_manage_store: checkBoolean(member.CanManageStore),
        is_impersonating: true,
        original_user_id: adminUser.UserID,
      },
    });
  } catch (error) {
    console.error("Login as member error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Stop Impersonating - Return to admin session
export const stopImpersonating = async (req, res) => {
  try {
    const { original_user_id } = req.body;

    if (!original_user_id) {
      return res
        .status(400)
        .json({ success: false, error: "Original user ID is required" });
    }

    const pool = await getPool();

    // Get admin user details
    const adminResult = await pool
      .request()
      .input("userId", sql.Int, original_user_id)
      .query(
        `SELECT UserID, UserName, Name, ChkAdmin, CanManageAttendance, CanManageStore FROM MemberDetails WHERE UserID = @userId`
      );

    if (adminResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Admin user not found" });
    }

    const adminUser = adminResult.recordset[0];
    
    res.json({
      success: true,
      message: "Returned to admin session",
      user: {
        id: adminUser.UserID,
        name: (adminUser.Name || "").trim(),
        username: (adminUser.UserName || "").trim(),
        is_admin: checkBoolean(adminUser.ChkAdmin),
        can_manage_attendance: checkBoolean(adminUser.CanManageAttendance),
        can_manage_store: checkBoolean(adminUser.CanManageStore),
      },
    });
  } catch (error) {
    console.error("Stop impersonating error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
