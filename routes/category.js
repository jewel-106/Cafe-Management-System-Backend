const express = require('express');
const pool = require('../connection');  // Use pool here instead of connection
const router = express.Router();
var auth = require('../services/authentication');
var checkRole = require('../services/checkRole');

// Add Category
router.post('/add', auth.authenticateToken, checkRole.checkRole, async (req, res, next) => {
    const { name } = req.body;
  
    try {
      const query = `INSERT INTO "category" (name) VALUES ($1)`;
      await pool.query(query, [name]);  // Use pool.query for executing queries
      return res.status(200).json({ message: "Category Added Successfully" });
    } catch (err) {
      console.error("Error adding category:", err);
      return res.status(500).json({ error: err.message });
    }
});
  
// Get Categories
router.get('/get', auth.authenticateToken, async (req, res, next) => {
    try {
      const query = `SELECT * FROM "category" ORDER BY name DESC`;
      const results = await pool.query(query);  // Use pool.query here as well
      return res.status(200).json(results.rows);  // results.rows contains the data
    } catch (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: err.message });
    }
});
  
// Update Category
router.patch('/update', auth.authenticateToken, checkRole.checkRole, async (req, res, next) => {
    const { name, id } = req.body;
  
    try {
      const query = `UPDATE "category" SET name = $1 WHERE id = $2`;
      const result = await pool.query(query, [name, id]);  // Use pool.query

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Category id not found" });
      }

      return res.status(200).json({ message: "Category Updated Successfully" });
    } catch (err) {
      console.error("Error updating category:", err);
      return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
