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
            SELECT 
                COLUMN_NAME, 
                DATA_TYPE, 
                COLUMN_DEFAULT,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'MemberDetails'
            AND COLUMN_NAME IN ('ChkAdmin', 'CanManageAttendance', 'CanManageStore')
        `);
        
        console.log(JSON.stringify(result.recordset, null, 2));
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

run();
