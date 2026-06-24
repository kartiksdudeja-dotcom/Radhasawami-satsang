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
        
        const attendance = await sql.query('SELECT TOP 5 * FROM Attendance');
        const seva = await sql.query('SELECT TOP 5 * FROM Seva');
        
        const fs = await import('fs');
        let output = "";
        output += "\n--- Attendance Sample ---\n";
        output += JSON.stringify(attendance.recordset, null, 2);
        output += "\n--- Seva Sample ---\n";
        output += JSON.stringify(seva.recordset, null, 2);
        fs.writeFileSync('query_results.txt', output);
        
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

run();
