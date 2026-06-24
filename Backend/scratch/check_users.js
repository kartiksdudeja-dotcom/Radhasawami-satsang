import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

async function run() {
    try {
        await sql.connect(config);
        console.log("Connected to DB");
        
        const result = await sql.query(`
            SELECT TOP 10 UserID, UserName, UID, ChkAdmin, CanManageAttendance, CanManageStore 
            FROM MemberDetails
        `);
        
        console.log(JSON.stringify(result.recordset, null, 2));
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

run();
