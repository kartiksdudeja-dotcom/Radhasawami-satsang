import { getPool } from "../config/db.js";

import sql from "mssql";

// Get all attendance records
export const getAllAttendance = async (req, res) => {
  try {
    const pool = await getPool();

    // Get all attendance records with full member details (NO LIMIT - SHOW ALL DATA)
    const result = await pool.request().query(`
      SELECT
        a.Attendance_Id as id,
        a.Attendance_date as date,
        a.Shift as shift,
        a.Audio_Satsang as category,
        a.PresentTime as time,
        a.dt,
        a.day,
        a.month,
        a.year,
        m.UserID as member_id,
        m.UID as uid,
        m.Name as name,
        m.Gender as gender,
        m.Status as stat_category,
        m.DOB as dob,
        m.Branch as branch,
        m.Association_member as association_member,
        m.Unit_Member as unit_member
      FROM Attendance a
      LEFT JOIN (
        SELECT UserID, MAX(UID) as UID, MAX(Name) as Name, MAX(Gender) as Gender, 
               MAX(Status) as Status, MAX(DOB) as DOB, MAX(Branch) as Branch, 
               MAX(Association_member) as Association_member, MAX(Unit_Member) as Unit_Member
        FROM MemberDetails 
        GROUP BY UserID
      ) m ON a.UserID = m.UserID
      ORDER BY a.Attendance_date DESC, a.Attendance_Id DESC
    `);

    console.log(
      `📊 Fetched ${result.recordset.length} raw attendance records from DB`
    );

    // Group records by Attendance_Id
    const groupedRecords = {};
    result.recordset.forEach((row) => {
      if (!groupedRecords[row.id]) {
        groupedRecords[row.id] = {
          id: row.id,
          date: row.date,
          shift: row.shift,
          category: row.category,
          time: row.time,
          dt: row.dt,
          day: row.day,
          month: row.month,
          year: row.year,
          members: [],
        };
      }

      if (row.name) {
        groupedRecords[row.id].members.push({
          id: row.member_id,
          uid: row.uid?.trim() || "",
          name: row.name?.trim() || "Unknown",
          gender: row.gender?.trim() || "",
          stat_category: row.stat_category?.trim() || "",
          dob: row.dob?.trim() || "",
          branch: row.branch?.trim() || "",
          association_member: row.association_member?.trim() || "",
          unit_member: row.unit_member?.trim() || "",
          category: row.category,
        });
      }
    });

    const attendanceRecords = Object.values(groupedRecords);
    console.log(
      `✅ Grouped into ${attendanceRecords.length} attendance records`
    );

    res.json({
      success: true,
      data: attendanceRecords,
      message: "Attendance records retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance records",
      error: error.message,
    });
  }
};

// Get attendance by date or date range
export const getAttendanceByDate = async (req, res) => {
  try {
    const pool = await getPool();
    const { date, fromDate, toDate, memberId } = req.query;
    const requester = req.user;

    // Fetch requester permissions to decide on data isolation
    const reqPowerResult = await pool.request()
      .input("reqId", sql.Int, requester.id)
      .query("SELECT Name, ChkAdmin, CanManageAttendance FROM MemberDetails WHERE UserID = @reqId");
    
    const reqData = reqPowerResult.recordset[0];
    const isPowerUser = reqData?.ChkAdmin || reqData?.CanManageAttendance;

    // Strict Privacy Logic: Non-admins/Non-managers only see their family's attendance
    let familyRestrictionClause = "";
    if (!isPowerUser) {
      const fullName = reqData?.Name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName;

      if (surname) {
        // Find all family member IDs
        const familyResult = await pool.request()
          .input("surname", sql.NVarChar, `%${surname}`)
          .query("SELECT UserID FROM MemberDetails WHERE Name LIKE @surname");
        
        const familyIds = familyResult.recordset.map(r => r.UserID);
        if (familyIds.length > 0) {
          familyRestrictionClause = ` AND a.UserID IN (${familyIds.join(",")})`;
        } else {
          familyRestrictionClause = ` AND a.UserID = ${requester.id}`; // Fallback to self
        }
      } else {
        familyRestrictionClause = ` AND a.UserID = ${requester.id}`; // Fallback to self
      }
    }

    // Support both single date and date range
    // Database has mixed formats: DD/MM/YYYY and YYYY-MM-DD
    // We need to handle both in the query
    let query = `
      SELECT 
        a.Attendance_Id as id,
        a.Attendance_date as date,
        a.Shift as shift,
        a.Audio_Satsang as category,
        a.PresentTime as time,
        a.dt,
        a.day,
        a.month,
        a.year,
        m.UserID as member_id,
        m.UID as uid,
        m.Name as name,
        m.Gender as gender,
        m.Status as stat_category,
        m.DOB as dob,
        m.Branch as branch,
        m.Association_member as association_member,
        m.Unit_Member as unit_member
      FROM Attendance a
      LEFT JOIN (
        SELECT UserID, MAX(UID) as UID, MAX(Name) as Name, MAX(Gender) as Gender, 
               MAX(Status) as Status, MAX(DOB) as DOB, MAX(Branch) as Branch, 
               MAX(Association_member) as Association_member, MAX(Unit_Member) as Unit_Member
        FROM MemberDetails 
        GROUP BY UserID
      ) m ON a.UserID = m.UserID
      WHERE 1=1 ${familyRestrictionClause}`;

    const request = pool.request();

    if (date) {
      // Single date filter - convert YYYY-MM-DD to components for comparison
      const dateParts = date.split("-"); // 2025-12-29
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);

      // Match by day, month, year columns (most reliable)
      query += ` AND a.day = @day AND a.month = @month AND a.year = @year`;
      request.input("day", sql.Int, day);
      request.input("month", sql.Int, month);
      request.input("year", sql.Int, year);
      console.log(
        `🔍 Single date filter: ${date} → day=${day}, month=${month}, year=${year}`
      );
    } else if (fromDate && toDate) {
      // Date range filter using day, month, year columns
      const fromParts = fromDate.split("-");
      const fromYear = parseInt(fromParts[0]);
      const fromMonth = parseInt(fromParts[1]);
      const fromDay = parseInt(fromParts[2]);

      const toParts = toDate.split("-");
      const toYear = parseInt(toParts[0]);
      const toMonth = parseInt(toParts[1]);
      const toDay = parseInt(toParts[2]);

      // Create YYYYMMDD values for comparison
      const fromYYYYMMDD = fromYear * 10000 + fromMonth * 100 + fromDay;
      const toYYYYMMDD = toYear * 10000 + toMonth * 100 + toDay;

      query += ` AND (a.year * 10000 + a.month * 100 + a.day) >= @fromDate
                AND (a.year * 10000 + a.month * 100 + a.day) <= @toDate`;
      request.input("fromDate", sql.Int, fromYYYYMMDD);
      request.input("toDate", sql.Int, toYYYYMMDD);
      console.log(
        `🔍 Date range filter: ${fromDate} to ${toDate} (comparing as ${fromYYYYMMDD} - ${toYYYYMMDD})`
      );
    }

    if (memberId) {
      query += ` AND a.UserID = @memberId`;
      request.input("memberId", sql.Int, memberId);
    }

    // Order by date properly using year, month, day columns
    query += ` ORDER BY a.year DESC, a.month DESC, a.day DESC, a.Attendance_Id DESC`;

    console.log(`🔍 Executing attendance query...`);

    const result = await request.query(query);

    console.log(
      `📊 Fetched ${result.recordset.length} attendance records for filter`
    );

    res.json({
      success: true,
      data: result.recordset,
      message: "Attendance records retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error fetching attendance by date:", error.message);
    console.error("Full error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance records",
      error: error.message,
    });
  }
};

// Create new attendance record
export const createAttendance = async (req, res) => {
  try {
    const pool = await getPool();
    const { member_id, date, shift, audio_satsang, members, time } = req.body;

    console.log("📝 Attendance Request received");
    console.log("   members:", !!members, Array.isArray(members));

    // Handle batch insert (multiple members from frontend)
    if (members && Array.isArray(members) && members.length > 0) {
      console.log(`📝 Batch mode: ${members.length} members`);

      if (!date || !shift) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: date, shift",
        });
      }

      const insertedIds = [];
      for (const member of members) {
        try {
          const memberId = member.id;
          const category = member.category || "Video Satsang";
          const timeValue = time
            ? time.includes(":") && time.split(":").length === 2
              ? time + ":00"
              : time
            : "09:00:00";

          // Parse date to extract day, month, year
          const dateParts = date.split("-"); // Format: YYYY-MM-DD
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          const day = parseInt(dateParts[2]);

          // Convert to DD/MM/YYYY format for database storage (consistent with existing data)
          const formattedDate = `${String(day).padStart(2, "0")}/${String(
            month
          ).padStart(2, "0")}/${year}`;

          console.log(
            `📝 Inserting: Member ${memberId}, Date: ${formattedDate}, Day: ${day}, Month: ${month}, Year: ${year}, Time: ${timeValue}`
          );

          const result = await pool
            .request()
            .input("member_id", sql.Int, memberId)
            .input("date", sql.NVarChar, formattedDate)
            .input("shift", sql.NVarChar, shift)
            .input("audio_satsang", sql.NVarChar, category)
            .input("time", sql.VarChar(20), timeValue)
            .input("day", sql.Int, day)
            .input("month", sql.Int, month)
            .input("year", sql.Int, year).query(`
              INSERT INTO Attendance 
              (UserID, Attendance_date, Shift, Audio_Satsang, PresentTime, day, month, year)
              VALUES 
              (@member_id, @date, @shift, @audio_satsang, CAST(@time AS TIME), @day, @month, @year);
              SELECT SCOPE_IDENTITY() as id;
            `);

          if (result.recordset && result.recordset.length > 0) {
            insertedIds.push(result.recordset[0].id);
            console.log(
              `✅ Inserted member ${memberId} with ID ${result.recordset[0].id}, Day: ${day}, Month: ${month}, Year: ${year}`
            );
          }
        } catch (err) {
          console.error(`❌ Error inserting member ${member.id}:`, err.message);
          console.error(`   Full error:`, err);
        }
      }

      console.log(`✅ Created ${insertedIds.length} attendance records`);

      return res.status(201).json({
        success: true,
        data: { ids: insertedIds, count: insertedIds.length },
        message: `Attendance created for ${insertedIds.length} members successfully`,
      });
    }

    // Handle single member insert (legacy support)
    if (!member_id || !date || !shift) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: member_id, date, shift (or provide members array)",
      });
    }

    const timeValue = time
      ? time.includes(":") && time.split(":").length === 2
        ? time + ":00"
        : time
      : "09:00:00";

    // Parse date to extract day, month, year - Handle both DD/MM/YYYY and YYYY-MM-DD formats
    let day, month, year, formattedDate;
    if (date.includes("/")) {
      // Format: DD/MM/YYYY - already correct format
      const dateParts = date.split("/");
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      year = parseInt(dateParts[2]);
      formattedDate = date; // Already in DD/MM/YYYY
    } else {
      // Format: YYYY-MM-DD - convert to DD/MM/YYYY
      const dateParts = date.split("-");
      year = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      day = parseInt(dateParts[2]);
      formattedDate = `${String(day).padStart(2, "0")}/${String(month).padStart(
        2,
        "0"
      )}/${year}`;
    }

    console.log(
      `📝 Single insert: Member ${member_id}, Date: ${formattedDate}, Day: ${day}, Month: ${month}, Year: ${year}, Time: ${timeValue}`
    );

    const result = await pool
      .request()
      .input("member_id", sql.Int, member_id)
      .input("date", sql.NVarChar, formattedDate)
      .input("shift", sql.NVarChar, shift)
      .input("audio_satsang", sql.NVarChar, audio_satsang || "Video Satsang")
      .input("time", sql.VarChar(20), timeValue)
      .input("day", sql.Int, day)
      .input("month", sql.Int, month)
      .input("year", sql.Int, year).query(`
        INSERT INTO Attendance 
        (UserID, Attendance_date, Shift, Audio_Satsang, PresentTime, day, month, year)
        VALUES 
        (@member_id, @date, @shift, @audio_satsang, CAST(@time AS TIME), @day, @month, @year);
        SELECT SCOPE_IDENTITY() as id;
      `);

    console.log(`✅ Single insert completed with ID ${result.recordset[0].id}`);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id, ...req.body },
      message: "Attendance record created successfully",
    });
  } catch (error) {
    console.error("Error creating attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error creating attendance record",
      error: error.message,
    });
  }
};

// Delete attendance record
export const deleteAttendance = async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Attendance ID is required",
      });
    }

    // Check if record exists
    const check = await pool
      .request()
      .input("id", sql.Numeric, id)
      .query(`SELECT Attendance_Id FROM Attendance WHERE Attendance_Id = @id`);

    if (check.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Delete record
    await pool
      .request()
      .input("id", sql.Numeric, id)
      .query(`DELETE FROM Attendance WHERE Attendance_Id = @id`);

    res.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting attendance record",
      error: error.message,
    });
  }
};

// Update attendance record
export const updateAttendance = async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { date, shift, audio_satsang } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Attendance ID is required",
      });
    }

    // Check if record exists
    const check = await pool
      .request()
      .input("id", sql.Numeric, id)
      .query(`SELECT Attendance_Id FROM Attendance WHERE Attendance_Id = @id`);

    if (check.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Update record
    await pool
      .request()
      .input("id", sql.Numeric, id)
      .input("date", sql.NVarChar, date || null)
      .input("shift", sql.NVarChar, shift || null)
      .input("audio_satsang", sql.NVarChar, audio_satsang || null).query(`
        UPDATE Attendance SET
          Attendance_date = ISNULL(@date, Attendance_date),
          Shift = ISNULL(@shift, Shift),
          Audio_Satsang = ISNULL(@audio_satsang, Audio_Satsang)
        WHERE Attendance_Id = @id
      `);

    // Fetch updated record
    const result = await pool.request().input("id", sql.Numeric, id).query(`
        SELECT 
          a.Attendance_Id as id,
          a.Attendance_date as date,
          a.Shift as shift,
          a.Audio_Satsang as category,
          m.UserID as member_id,
          m.Name as name,
          m.Gender as gender,
          m.Status as status
        FROM Attendance a
        LEFT JOIN MemberDetails m ON a.UserID = m.UserID
        WHERE a.Attendance_Id = @id
      `);

    res.json({
      success: true,
      data: result.recordset[0],
      message: "Attendance record updated successfully",
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error updating attendance record",
      error: error.message,
    });
  }
};

// Delete member from attendance - optional function for backward compatibility
export const deleteMemberFromAttendance = async (req, res) => {
  try {
    // In SQL Server model, we don't have a separate attendance_members table
    // This would be handled by deleting the attendance record itself
    res.json({
      success: true,
      message: "Please use DELETE /:id to remove attendance record",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error",
      error: error.message,
    });
  }
};

// Get member attendance stats for home page
export const getMemberAttendanceStats = async (req, res) => {
  try {
    const { memberId } = req.params;
    const pool = await getPool();

    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get total attendance count for the member
    const totalResult = await pool.request()
      .input("memberId", sql.Int, memberId)
      .query(`
        SELECT COUNT(*) as total
        FROM Attendance 
        WHERE UserID = @memberId
      `);

    // Get this month's attendance count
    const thisMonthResult = await pool.request()
      .input("memberId", sql.Int, memberId)
      .input("month", sql.Int, currentMonth)
      .input("year", sql.Int, currentYear)
      .query(`
        SELECT COUNT(*) as thisMonth
        FROM Attendance 
        WHERE UserID = @memberId 
          AND month = @month 
          AND year = @year
      `);

    // Get the last satsang attended
    const lastSatsangResult = await pool.request()
      .input("memberId", sql.Int, memberId)
      .query(`
        SELECT TOP 1 
          Attendance_date as date,
          Shift as shift,
          Audio_Satsang as category
        FROM Attendance 
        WHERE UserID = @memberId
        ORDER BY year DESC, month DESC, day DESC
      `);

    const total = totalResult.recordset[0]?.total || 0;
    const thisMonth = thisMonthResult.recordset[0]?.thisMonth || 0;
    const lastSatsang = lastSatsangResult.recordset[0] || null;

    console.log(`📊 Member ${memberId} stats: Total=${total}, ThisMonth=${thisMonth}`);

    res.json({
      success: true,
      data: {
        total,
        thisMonth,
        lastSatsang
      },
      message: "Member attendance stats retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching member attendance stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching member attendance stats",
      error: error.message
    });
  }
};
