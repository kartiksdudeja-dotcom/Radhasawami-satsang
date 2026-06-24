import { getPool } from "../config/db.js";
import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

async function checkUser() {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("id", sql.Int, 1)
            .query("SELECT UserID, UserName, Name, ChkAdmin, CanManageAttendance, CanManageStore FROM MemberDetails WHERE UserID = @id");
        
        console.log("User 1 Details:", JSON.stringify(result.recordset[0], null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
