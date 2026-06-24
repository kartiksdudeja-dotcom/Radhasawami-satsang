import { getPool } from './config/db.js';

async function fixTimezoneData() {
    console.log("🛠️ Fixing notification timestamps (IST -> UTC conversion)...");
    try {
        const pool = await getPool();
        
        // Subtract 5 hours and 30 minutes from existing timestamps
        // This is necessary because they were saved in IST local time but are being interpreted as UTC
        const result = await pool.request().query(`
            UPDATE notifications 
            SET 
                created_at = DATEADD(minute, -330, created_at), 
                updated_at = DATEADD(minute, -330, updated_at)
            WHERE created_at > '2026-04-20' -- Only fix recent ones to be safe, or remove filter if all need fix
        `);
        
        console.log(`✅ Success! Updated ${result.rowsAffected[0]} notifications.`);
        console.log("🚀 The time display should now be correct.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error fixing timestamps:", error.message);
        process.exit(1);
    }
}

fixTimezoneData();
