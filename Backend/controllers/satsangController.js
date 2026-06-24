import { getPool } from "../config/db.js";
import sql from "mssql";

// Get all satsang categories
export const getSatsangCategories = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT ID as id, Name as name FROM SatsangCategories ORDER BY Name");
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Error fetching satsang categories:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add new satsang category
export const addSatsangCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("name", sql.NVarChar, name)
      .query("INSERT INTO SatsangCategories (Name) VALUES (@name); SELECT SCOPE_IDENTITY() as id");

    res.status(201).json({ 
      success: true, 
      data: { id: result.recordset[0].id, name } 
    });
  } catch (error) {
    console.error("Error adding satsang category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update satsang category
export const updateSatsangCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }

    const pool = await getPool();
    await pool.request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar, name)
      .query("UPDATE SatsangCategories SET Name = @name WHERE ID = @id");

    res.json({ success: true, data: { id, name } });
  } catch (error) {
    console.error("Error updating satsang category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete satsang category
export const deleteSatsangCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM SatsangCategories WHERE ID = @id");
    
    res.json({ success: true, message: "Satsang category deleted successfully" });
  } catch (error) {
    console.error("Error deleting satsang category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
