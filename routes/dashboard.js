

const express = require('express');
const connection = require('../connection');
const router = express.Router();
const pool = require('../connection'); 
var auth = require('../services/authentication');

router.get('/details', auth.authenticateToken, async (req, res, next) => {
    try {
      // Fetch category count
      const categoryQuery = `SELECT COUNT(id) AS categoryCount FROM "category"`;
      const categoryResult = await connection.query(categoryQuery);
      const categoryCount = categoryResult.rows[0].categorycount;
  
      // Fetch product count
      const productQuery = `SELECT COUNT(id) AS productCount FROM "product"`;
      const productResult = await connection.query(productQuery);
      const productCount = productResult.rows[0].productcount;
  
      // Fetch bill count
      const billQuery = `SELECT COUNT(id) AS billCount FROM "bill"`;
      const billResult = await connection.query(billQuery);
      const billCount = billResult.rows[0].billcount;
  
      // Respond with the collected data
      const data = {
        category: categoryCount,
        product: productCount,
        bill: billCount
      };
  
      return res.status(200).json(data);
  
    } catch (err) {
      console.error("Error fetching details:", err);
      return res.status(500).json({ error: err.message });
    }
  });
  


module.exports = router;