const express = require('express');
const pool = require('../connection'); // Use pool instead of connection
const router = express.Router();
var auth = require('../services/authentication');
var checkRole = require('../services/checkRole');

// Add Product
router.post('/add', auth.authenticateToken, checkRole.checkRole, async (req, res) => {
    const product = req.body;
    const query = `INSERT INTO "product" (name, categoryId, description, price, status) VALUES ($1, $2, $3, $4, 'true')`;
    
    try {
      await pool.query(query, [product.name, product.categoryId, product.description, product.price]); // Use pool.query
      return res.status(200).json({ message: "Product Added Successfully." });
    } catch (err) {
      return res.status(500).json(err);
    }
});

// Get all Products
router.get('/get', auth.authenticateToken, async (req, res) => {
    const query = `SELECT p.id, p.name, p.description, p.price, p.status, c.id AS categoryId, c.name AS categoryName
                   FROM "product" AS p
                   INNER JOIN category AS c ON p.categoryId = c.id`;
    
    try {
      const results = await pool.query(query); // Use pool.query
      return res.status(200).json(results.rows); // results.rows contains the data
    } catch (err) {
      return res.status(500).json(err);
    }
});

// Get Products by Category
router.get('/getByCategory/:id', auth.authenticateToken, async (req, res) => {
    const id = req.params.id;
    const query = `SELECT id, name FROM "product" WHERE categoryId = $1 AND status = 'true'`;
  
    try {
      const results = await pool.query(query, [id]); // Use pool.query
      return res.status(200).json(results.rows);
    } catch (err) {
      return res.status(500).json(err);
    }
});

// Get Product by ID
router.get('/getbyId/:id', auth.authenticateToken, async (req, res) => {
    const id = req.params.id;
    const query = `SELECT id, name, description, price FROM "product" WHERE id = $1`;
  
    try {
      const results = await pool.query(query, [id]); // Use pool.query
      return res.status(200).json(results.rows[0]); // Return the first result (product)
    } catch (err) {
      return res.status(500).json(err);
    }
});

// Update Product
router.patch('/update', auth.authenticateToken, checkRole.checkRole, async (req, res) => {
    const product = req.body;
    const query = `UPDATE "product" SET name = $1, categoryId = $2, description = $3, price = $4 WHERE id = $5`;
  
    try {
      const result = await pool.query(query, [product.name, product.categoryId, product.description, product.price, product.id]); // Use pool.query
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Product id does not found." });
      }
      return res.status(200).json({ message: "Product Updated Successfully" });
    } catch (err) {
      return res.status(500).json(err);
    }
});

// Update Product Status
router.patch('/updateStatus', auth.authenticateToken, checkRole.checkRole, async (req, res) => {
    const user = req.body;
    const query = `UPDATE "product" SET status = $1 WHERE id = $2`;
  
    try {
      const result = await pool.query(query, [user.status, user.id]); // Use pool.query
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Product id does not found." });
      }
      return res.status(200).json({ message: "Product Status Updated Successfully." });
    } catch (err) {
      return res.status(500).json(err);
    }
});

// Delete Product
router.delete('/delete/:id', auth.authenticateToken, checkRole.checkRole, async (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM "product" WHERE id = $1`;
  
    try {
      const result = await pool.query(query, [id]); // Use pool.query
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Product id does not found." });
      }
      return res.status(200).json({ message: "Product Deleted Successfully" });
    } catch (err) {
      return res.status(500).json(err);
    }
});

module.exports = router;
