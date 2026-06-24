import sql from "mssql";
import dotenv from "dotenv";
import { ensureTablesExist } from "./init_tables.js";

dotenv.config();

const config = {
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "RSPortal",
  port: 1433,
  authentication: {
    type: "default",
    options: {
      userName: process.env.DB_USER || "RADHASAWAMI",
      password: process.env.DB_PASSWORD || "Strong@123",
    },
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 30000,
  },
  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool = null;

// Get SQL Server connection pool
export async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log("✅ Connected to SQL Server:", config.database);
    } catch (error) {
      console.error("❌ SQL Server connection error:", error.message);
      throw error;
    }
  }
  return pool;
}

// Backward compatibility export for controllers
export function getDb() {
  if (!pool) {
    throw new Error("Database not connected. Call getPool() first.");
  }
  return pool;
}

// Initialize database
export const initializeDatabase = async () => {
  try {
    const pool = await getPool();
    console.log("✅ Database initialized successfully");

    // Create required tables if they don't exist
    await ensureTablesExist();

    // Verify connection
    const result = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM MemberDetails");
    console.log(`📊 Total members in database: ${result.recordset[0].count}`);
  } catch (error) {
    console.warn("⚠️ Database connection warning:", error.message);
    console.warn("⚠️ Make sure SQL Server is running and TCP/IP is enabled");
  }
};
