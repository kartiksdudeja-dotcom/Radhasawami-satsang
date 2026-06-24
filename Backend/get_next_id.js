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
        
        const result = await sql.query(`SELECT ISNULL(MAX(id), 0) + 1 as nextId FROM notifications`);
        console.log("Next ID:", result.recordset[0].nextId);
        
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

run();
