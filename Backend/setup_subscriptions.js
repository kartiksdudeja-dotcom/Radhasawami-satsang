import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function setupDatabase() {
    try {
        console.log('📂 Re-configuring Subscriptions Table for Long Endpoints...');
        let pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server:', process.env.DB_NAME);

        // 1. Drop the old table if it exists (we will recreate it without the 450 limit)
        // We do this because you can't easily remove a UNIQUE constraint on NVARCHAR(450) without knowing the constraint name
        await pool.request().query(`
            if exists (select * from sys.tables where name = 'push_subscriptions')
                drop table push_subscriptions;
                
            CREATE TABLE push_subscriptions (
                id INT IDENTITY(1,1) PRIMARY KEY,
                uid NVARCHAR(50),
                endpoint NVARCHAR(MAX),
                p256dh NVARCHAR(MAX),
                auth NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETUTCDATE()
            );
        `);

        console.log('✅ Table push_subscriptions recreated successfully with NVARCHAR(MAX)');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up table:', err.message);
        process.exit(1);
    }
}

setupDatabase();
