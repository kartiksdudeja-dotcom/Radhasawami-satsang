import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

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

async function fixStoreDates() {
    try {
        console.log("🛠️  Fixing StoreOrders timestamps (adding missed dates)...");
        let pool = await sql.connect(config);
        
        // Fix StoreOrders where OrderDate is null (use CreatedDate if available, or current UTC date)
        const fixOrders = await pool.request().query(`
            UPDATE StoreOrders 
            SET OrderDate = ISNULL(CreatedDate, GETUTCDATE())
            WHERE OrderDate IS NULL
        `);
        console.log(`✅ Success! Updated ${fixOrders.rowsAffected[0]} orders with missing OrderDate.`);

        // Fix StoreSales where SaleDate is null
        const fixSales = await pool.request().query(`
            UPDATE StoreSales
            SET SaleDate = GETUTCDATE()
            WHERE SaleDate IS NULL
        `);
        console.log(`✅ Success! Updated ${fixSales.rowsAffected[0]} sales with missing SaleDate.`);

        await pool.close();
        console.log("🚀 Store dates normalized. Please refresh the UI.");
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

fixStoreDates();
