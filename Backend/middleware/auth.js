import jwt from "jsonwebtoken";
import { getPool } from "../config/db.js";
import sql from "mssql";

// 🔐 Verify Token
export const verifyToken = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token" });
      }

      req.user = decoded;
      next();
    });

  } catch (error) {
    res.status(500).json({ message: "Auth error" });
  }
};


// 👑 Full Admin check (Strictly ChkAdmin)
export const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      console.log("❌ Auth: No user in request (verifyAdmin)");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ALLOW ALL POST REQUESTS TO SEVA/ATTENDANCE (Users filling their own data)
    if (req.method === 'POST') {
      console.log(`✅ Auth: Allowing POST request for user ID ${req.user.id}`);
      return next();
    }

    console.log(`🔍 Auth: Checking strict admin for user ID ${req.user.id}`);

    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
      .query(`SELECT UserID, ChkAdmin FROM MemberDetails WHERE UserID = @id`);

    if (result.recordset.length === 0) {
      console.log(`❌ Auth: User ID ${req.user.id} not found in database (verifyAdmin)`);
      return res.status(403).json({ message: "User not found" });
    }

    const user = result.recordset[0];
    const isAdmin = user?.ChkAdmin === true || user?.ChkAdmin === 1 || String(user?.ChkAdmin).toLowerCase() === "true";

    console.log(`📊 Auth: User ${req.user.id} ChkAdmin flag: ${user?.ChkAdmin} -> IsAdmin: ${isAdmin}`);

    if (isAdmin) return next();

    console.log(`❌ Auth: Strict Admin access denied for User ID ${req.user.id}`);
    return res.status(403).json({ message: "Super Admin access only" });
  } catch (error) {
    console.error("❌ Auth: Permission check error (verifyAdmin):", error);
    res.status(500).json({ message: "Permission check failed" });
  }
};

// 📋 Attendance Manager check (Admin OR can_manage_attendance)
export const verifyAttendanceManager = async (req, res, next) => {
  try {
    if (!req.user) {
      console.log("❌ Auth: No user in request");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ALLOW ALL POST REQUESTS TO ATTENDANCE (Users filling their own data)
    if (req.method === 'POST') {
      console.log(`✅ Auth: Allowing POST request for user ID ${req.user.id}`);
      return next();
    }

    console.log(`🔍 Auth: Checking attendance manager for user ID ${req.user.id}`);

    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
      .query(`SELECT UserID, ChkAdmin, CanManageAttendance FROM MemberDetails WHERE UserID = @id`);

    if (result.recordset.length === 0) {
      console.log(`❌ Auth: User ID ${req.user.id} not found in database`);
      return res.status(403).json({ message: "User not found" });
    }

    const user = result.recordset[0];
    const isAllowed = 
      (user?.ChkAdmin === true || user?.ChkAdmin === 1 || String(user?.ChkAdmin).toLowerCase() === "true") || 
      (user?.CanManageAttendance === true || user?.CanManageAttendance === 1 || String(user?.CanManageAttendance).toLowerCase() === "true");

    console.log(`📊 Auth: User ${req.user.id} flags - ChkAdmin: ${user?.ChkAdmin}, CanManageAttendance: ${user?.CanManageAttendance} -> Allowed: ${isAllowed}`);

    if (isAllowed) return next();
    
    console.log(`❌ Auth: Access denied for User ID ${req.user.id}`);
    return res.status(403).json({ message: "Attendance Management access only" });
  } catch (error) {
    console.error("❌ Auth: Permission check error:", error);
    res.status(500).json({ message: "Permission check failed" });
  }
};