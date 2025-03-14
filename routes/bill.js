const express = require("express");
const pool = require("../connection"); // Import the PostgreSQL pool
const router = express.Router();

const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");
const auth = require("../services/authentication");

router.post("/generateReport", auth.authenticateToken, async (req, res) => {
  const generatedUuid = uuid.v1();
  const orderDetails = req.body;
  let productDetailsReport = orderDetails.productDetails;

  // Parse product details if it's a string
  if (typeof productDetailsReport === 'string') {
    try {
      productDetailsReport = JSON.parse(productDetailsReport);
    } catch (err) {
      console.error("Error parsing productDetails:", err);
      return res.status(400).send("Invalid productDetails format");
    }
  }

  // SQL query to insert bill details into the database
  const query = `
    INSERT INTO "bill" (name, uuid, email, contact_number, payment_method, total, product_details, createdby) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  
  // Parameters for the insert query
  const values = [
    orderDetails.name,
    generatedUuid,
    orderDetails.email,
    orderDetails.contactNumber,
    orderDetails.paymentMethod,
    orderDetails.totalAmount,
    JSON.stringify(orderDetails.productDetails), // Store product details as a JSON string
    res.locals.email,
  ];

  try {
    // Insert the order details into the bill table
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(500).json({ message: "Failed to insert bill details" });
    }

    // Render EJS to HTML
    const htmlContent = await ejs.renderFile(path.join(__dirname, "report.ejs"), {
      productDetails: productDetailsReport,
      name: orderDetails.name,
      email: orderDetails.email,
      contactNumber: orderDetails.contactNumber,
      paymentMethod: orderDetails.paymentMethod,
      totalAmount: orderDetails.totalAmount,
    });

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });

    const pdfPath = `./generated_pdf/${generatedUuid}.pdf`;
    await page.pdf({ path: pdfPath, format: "A4" });

    await browser.close();

    return res.status(200).json({ uuid: generatedUuid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error generating report", error: err.message || err });
  }
});

router.post("/getPdf", auth.authenticateToken, async (req, res) => {
  try {
    const orderDetails = req.body;
    let productDetailsReport = orderDetails.productDetails;
    const pdfPath = `./generated_pdf/${orderDetails.uuid}.pdf`;

    // Check if the PDF already exists
    if (fs.existsSync(pdfPath)) {
      res.contentType("application/pdf");
      return fs.createReadStream(pdfPath).pipe(res);
    }

    // Parse product details if it's a string
    if (typeof productDetailsReport === 'string') {
      try {
        productDetailsReport = JSON.parse(productDetailsReport);
      } catch (err) {
        console.error("Error parsing productDetails:", err);
        return res.status(400).send("Invalid productDetails format");
      }
    }

    // Query to fetch the order details from the PostgreSQL database using the UUID
    const query = `
      SELECT name, email, contact_number, payment_method, total, product_details,createdby
      FROM "bill"
      WHERE uuid = $1
    `;
    const result = await pool.query(query, [orderDetails.uuid]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Use data from the database if available
    const dbOrderDetails = result.rows[0];

    // Render EJS to HTML
    const htmlContent = await ejs.renderFile(path.join(__dirname, "report.ejs"), {
      productDetails: productDetailsReport || JSON.parse(dbOrderDetails.product_details),
      name: dbOrderDetails.name,
      email: dbOrderDetails.email,
      contactNumber: dbOrderDetails.contact_number,
      paymentMethod: dbOrderDetails.payment_method,
      totalAmount: dbOrderDetails.total,
    });

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });

    await page.pdf({ path: pdfPath, format: "A4" });

    await browser.close();

    // Serve the newly generated PDF
    res.contentType("application/pdf");
    return fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    console.error("Error generating PDF:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate PDF", details: err.message });
  }
});

router.get("/getBills", auth.authenticateToken, async (req, res, next) => {
  try {
    const query = `SELECT * FROM "bill" ORDER BY id DESC`;
    const result = await pool.query(query);
    
    return res.status(200).json(result.rows); // `rows` contains the result set in PostgreSQL
  } catch (err) {
    console.error("Error fetching bills:", err);
    return res.status(500).json({ message: "Error fetching bills", error: err.message });
  }
});

router.delete("/delete/:id", auth.authenticateToken, async (req, res, next) => {
  const id = req.params.id;

  try {
    const query = `DELETE FROM "bill" WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Bill id not found" });
    }

    return res.status(200).json({ message: "Bill Deleted Successfully" });
  } catch (err) {
    console.error("Error deleting bill:", err);
    return res.status(500).json({ message: "Error deleting bill", error: err.message });
  }
});

module.exports = router;
