const express = require("express");
const connection = require("../connection");
const router = express.Router();

const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");
const auth = require("../services/authentication");

router.post("/generateReport", auth.authenticateToken,async (req, res) => {
  const generatedUuid = uuid.v1();
  const orderDetails = req.body;
  let productDetailsReport = orderDetails.productDetails;
  if (typeof productDetailsReport === 'string') {
    try {
        productDetailsReport = JSON.parse(productDetailsReport);
    } catch (err) {
        console.error("Error parsing productDetails:", err);
        return res.status(400).send("Invalid productDetails format");
    }
}
  //const productDetailsReport = JSON.parse(orderDetails.productDetails);

//   const productDetailsReport = typeof orderDetails.productDetails === 'string'
//   ? JSON.parse(orderDetails.productDetails)
//   : orderDetails.productDetails;
//   let productDetailsReport;
//   try {
//     this.productDetailsReport = typeof orderDetails.productDetails === 'string'
//       ? JSON.parse(orderDetails.productDetails)
//       : orderDetails.productDetails;
//   } catch (error) {
//     console.error('Error parsing productDetails:', error);
//     this.dataSource = [];
//   }

  const query =
    "INSERT INTO bill (name, uuid, email, contactNumber, paymentMethod, total, productDetails, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

  connection.query(
    query,
    [
      orderDetails.name,
      generatedUuid,
      orderDetails.email,
      orderDetails.contactNumber,
      orderDetails.paymentMethod,
      orderDetails.totalAmount,
      orderDetails.productDetails,
      res.locals.email,
    ],
    async (err, results) => {
      if (err) {
        return res.status(500).json(err);
      }

      try {
        // Render EJS to HTML
        const htmlContent = await ejs.renderFile(
          path.join(__dirname, "report.ejs"),
          {
            productDetails: productDetailsReport,
            name: orderDetails.name,
            email: orderDetails.email,
            contactNumber: orderDetails.contactNumber,
            paymentMethod: orderDetails.paymentMethod,
            totalAmount: orderDetails.totalAmount,
          }
        );

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
        return res.status(500).json(err);
      }
    }
  );
});

router.post("/getPdf",auth.authenticateToken,async (req, res) => {
  try {
    const orderDetails = req.body;
    let productDetailsReport = orderDetails.productDetails;
    const pdfPath = `./generated_pdf/${orderDetails.uuid}.pdf`;

    if (fs.existsSync(pdfPath)) {
      res.contentType("application/pdf");
      return fs.createReadStream(pdfPath).pipe(res);
    }
    if (typeof productDetailsReport === 'string') {
        try {
            productDetailsReport = JSON.parse(productDetailsReport);
        } catch (err) {
            console.error("Error parsing productDetails:", err);
            return res.status(400).send("Invalid productDetails format");
        }
    }
    // If PDF does not exist, generate it
    //const productDetailsReport = JSON.parse(orderDetails.productDetails);
    // const productDetailsReport = typeof orderDetails.productDetails === 'string'
    // ? JSON.parse(orderDetails.productDetails)
    // : orderDetails.productDetails;
    // let productDetailsReport;
    // try {
    //   this.productDetailsReport = typeof orderDetails.productDetails === 'string'
    //     ? JSON.parse(orderDetails.productDetails)
    //     : orderDetails.productDetails;
    // } catch (error) {
    //   console.error('Error parsing productDetails:', error);
    //   this.productDetailsReport = [];
    // }
    const htmlContent = await ejs.renderFile(
      path.join(__dirname, "report.ejs"),
      {
        productDetails: productDetailsReport,
        name: orderDetails.name,
        email: orderDetails.email,
        contactNumber: orderDetails.contactNumber,
        paymentMethod: orderDetails.paymentMethod,
        totalAmount: orderDetails.totalAmount,
      }
    );

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

router.get("/getBills", auth.authenticateToken, (req, res, next) => {
  var query = "select * from bill order by id DESC";
  connection.query(query, (err, results) => {
    if (!err) {
      return res.status(200).json(results);
    } else {
      return res.status(500).json(err);
    }
  });
});

router.delete("/delete/:id", auth.authenticateToken, (req, res, next) => {
  const id = req.params.id;
  var query = "delete from bill where id=?";
  connection.query(query, [id], (err, results) => {
    if (!err) {
      if (results.affectedRows == 0) {
        return res.status(404).json({ message: "Bill id does not found" });
      }
      return res.status(200).json({ message: "Bill Deleted Successfully" });
    } else {
      return res.status(500).json(err);
    }
  });
});

module.exports = router;
