import { getPool } from './config/db.js';

async function fixDatabase() {
    console.log("🛠️ Starting database fix...");
    try {
        const pool = await getPool();
        
        // Update all notifications that have NULL timestamps or NULL read status
        const result = await pool.request().query(`
            UPDATE notifications 
            SET 
                created_at = ISNULL(created_at, GETUTCDATE()), 
                updated_at = ISNULL(updated_at, GETUTCDATE()), 
                [read] = ISNULL([read], 0)
            WHERE created_at IS NULL OR [read] IS NULL
        `);
        
        console.log(`✅ Success! Updated ${result.rowsAffected[0]} notifications.`);
        console.log("🚀 Now restart your backend server and refresh the website.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error fixing database:", error.message);
        process.exit(1);
    }
}

fixDatabase();
