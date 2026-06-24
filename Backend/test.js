import { getPool } from "./config/db.js";

(async () => {
  try {
    const pool = await getPool();

    await pool.request().query(`
      ALTER TABLE MemberDetails
      ALTER COLUMN Password NVARCHAR(255)
    `);

    console.log("✅ Password column updated successfully");
    process.exit();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();