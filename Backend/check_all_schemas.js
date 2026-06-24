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
        
        const tables = ['notifications', 'StoreOrders', 'StoreOrderItems'];
        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const result = await sql.query(`
                SELECT 
                    COLUMN_NAME, 
                    DATA_TYPE, 
                    IS_NULLABLE,
                    COLUMNPROPERTY(object_id(TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IsIdentity
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${table}'
            `);
            console.log(JSON.stringify(result.recordset, null, 2));
        }
        
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

run();
