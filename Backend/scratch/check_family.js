import { getPool } from "../config/db.js";
import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

async function checkFamilyDetails() {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("surname", sql.NVarChar, "% Khanna")
            .query("SELECT UserID, Name, Father_Name, Address, Number FROM MemberDetails WHERE Name LIKE @surname OR Name = 'Khanna'");
        
        console.log("Khanna Surname matches:");
        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkFamilyDetails();
