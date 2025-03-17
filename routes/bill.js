

const express = require("express");
const pool = require("../connection");
const router = express.Router();

const ejs = require("ejs");
const fs = require("fs");
const uuid = require("uuid");
const auth = require("../services/authentication");

const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const path = require("path");


router.post("/generateReport", auth.authenticateToken, async (req, res) => {
  const generatedUuid = uuid.v1();
  const orderDetails = req.body;
  let productDetailsReport = orderDetails.product_details;

  if (typeof productDetailsReport === "string") {
    try {
      productDetailsReport = JSON.parse(productDetailsReport);
    } catch (err) {
      console.error("Error parsing product_details:", err);
      return res.status(400).send("Invalid product_details format");
    }
  }

  const query = `
    INSERT INTO "bill" (name, uuid, email, contact_number, payment_method, total, product_details, createdby) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  const values = [
    orderDetails.name,
    generatedUuid,
    orderDetails.email,
    orderDetails.contact_number,
    orderDetails.payment_method,
    orderDetails.totalAmount,
    JSON.stringify(orderDetails.product_details),
    res.locals.email,
  ];

  try {
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(500).json({ message: "Failed to insert bill details" });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Restaurant Header Section
    page.drawText("Restaurant Name", {
      x: 50,
      y: height - 40,
      size: 24,
      font: titleFont,
      color: rgb(0.2, 0.4, 0.8), // Blue color for title
    });
    page.drawText("Restaurant Address: 123 Street Name, City, State", {
      x: 50,
      y: height - 60,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText("Phone: +1 234 567 890", {
      x: 50,
      y: height - 80,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Restaurant Promo Section
    page.drawText("Special Offer: 20% OFF Your Next Order!", {
      x: 50,
      y: height - 120,
      size: 16,
      font: titleFont,
      color: rgb(1, 0.5, 0), // Orange color for promotion
    });
    page.drawText("Use Promo Code: DISCOUNT20", {
      x: 50,
      y: height - 140,
      size: 14,
      font,
      color: rgb(0, 0.5, 0), // Green for promo code
    });

    // Invoice Title
    page.drawText("Invoice", {
      x: width - 100,
      y: height - 40,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });

    // Customer Information
    page.drawText(`Customer Name: ${orderDetails.name}`, {
      x: 50,
      y: height - 180,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(`Email: ${orderDetails.email}`, {
      x: 50,
      y: height - 200,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(`Contact: ${orderDetails.contact_number}`, {
      x: 50,
      y: height - 220,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    // Order Details Table
    const startY = height - 260;
    const lineHeight = 20;

    page.drawText("Product Name", {
      x: 50,
      y: startY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText("Qty", {
      x: 300,
      y: startY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText("Unit Price", {
      x: 400,
      y: startY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText("Total", {
      x: 500,
      y: startY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    let yOffset = startY - lineHeight;

    productDetailsReport.forEach((product, index) => {
      page.drawText(product.name, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      page.drawText(product.quantity.toString(), {
        x: 300,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      page.drawText(`$${product.price}`, {
        x: 400,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      page.drawText(`$${(product.price * product.quantity).toFixed(2)}`, {
        x: 500,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yOffset -= lineHeight;
    });

    // Total Amount Section
    page.drawText(`Subtotal: $${orderDetails.totalAmount.toFixed(2)}`, {
      x: 400,
      y: yOffset,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    yOffset -= lineHeight;
    page.drawText(
      `Tax (10%): $${(orderDetails.totalAmount * 0.1).toFixed(2)}`,
      { x: 400, y: yOffset, size: 14, font, color: rgb(0, 0, 0) }
    );
    yOffset -= lineHeight;
    page.drawText(`Total: $${(orderDetails.totalAmount * 1.1).toFixed(2)}`, {
      x: 400,
      y: yOffset,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    // Payment Method
    yOffset -= lineHeight;
    page.drawText(`Payment Method: ${orderDetails.payment_method}`, {
      x: 50,
      y: yOffset,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfPath = `./generated_pdf/${generatedUuid}.pdf`;
    fs.writeFileSync(pdfPath, pdfBytes);

    return res.status(200).json({ uuid: generatedUuid });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error generating invoice", error: err.message || err });
  }
});

router.post("/getPdf", auth.authenticateToken, async (req, res) => {
  try {
    const orderDetails = req.body;
    let productDetailsReport = orderDetails.product_details;
    const pdfPath = `./generated_pdf/${orderDetails.uuid}.pdf`;

    // Check if the PDF already exists
    if (fs.existsSync(pdfPath)) {
      res.contentType("application/pdf");
      return fs.createReadStream(pdfPath).pipe(res);
    }

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
    return res
      .status(500)
      .json({ message: "Error fetching bills", error: err.message });
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
    return res
      .status(500)
      .json({ message: "Error deleting bill", error: err.message });
  }
});

module.exports = router;
