import { getPool } from "../config/db.js";
import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

async function checkMemberID() {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query("SELECT TOP 5 UserID, MemberID, Name FROM MemberDetails ORDER BY MemberID DESC");
        
        console.log("Recent Members with MemberIDs:");
        console.table(result.recordset);
        
        const nextIdResult = await pool.request()
            .query("SELECT ISNULL(MAX(MemberID), 0) + 1 as nextMemberID FROM MemberDetails");
        console.log("Next recommended MemberID:", nextIdResult.recordset[0].nextMemberID);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMemberID();
