import express from "express";
import pool from "../config/db.js";
import PDFDocument from "pdfkit";

const router = express.Router();

/*
=========================================
VALIDATE RECEIPT (UNCHANGED)
=========================================
*/
router.get("/receipt-validate", async (req, res) => {

  const { receipt, mobile } = req.query;

  try {

    const result = await pool.query(`
      SELECT d.*, dn.first_name, dn.last_name, dn.email,
             c.center_legal_name, c.center_address,
             c.center_phone, c.website
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      JOIN centers c ON d.center_id = c.id
      WHERE d.receipt_number = $1
      AND dn.mobile = $2
    `, [receipt, mobile]);

    if(result.rows.length === 0){
      return res.json({ valid: false });
    }

    res.json({ valid: true });

  } catch (err) {
    console.error(err);
    res.json({ valid: false });
  }
});


/*
=========================================
HORIZONTAL PROFESSIONAL NGO RECEIPT
=========================================
*/
router.get("/receipt-pdf/:receipt/:mobile", async (req, res) => {

  const { receipt, mobile } = req.params;

  try {

    const result = await pool.query(`
      SELECT d.*, dn.first_name, dn.last_name, dn.email,
             dn.city, dn.state,
             c.center_legal_name, c.center_address,
             c.center_phone, c.website
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      JOIN centers c ON d.center_id = c.id
      WHERE d.receipt_number = $1
      AND dn.mobile = $2
    `, [receipt, mobile]);

    if(result.rows.length === 0){
      return res.status(404).send("Invalid Receipt");
    }

    const data = result.rows[0];
    const wine = "#722F37";

    // Landscape style layout
    const doc = new PDFDocument({
      size: [600, 380],
      margin: 40
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt-${receipt}.pdf`
    );

    doc.pipe(res);

    const pageWidth = 600;

    /* ===============================
       OUTER BORDER
    =============================== */
    doc
      .rect(20, 20, pageWidth - 40, 310)
      .lineWidth(2)
      .stroke(wine);

    /* ===============================
       HEADER STRIP
    =============================== */
    doc
      .rect(20, 20, pageWidth - 40, 60)
      .fill(wine);

    doc
      .fillColor("white")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("DONATION RECEIPT", 0, 45, { align: "center" });

    doc.moveDown(3);
    doc.fillColor("black");

    /* ===============================
       CENTER DETAILS
    =============================== */
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(data.center_legal_name, 40, 100);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(data.center_address || "", 40);

    doc.text(`Phone: ${data.center_phone || "-"}`);
    doc.text(`Website: ${data.website || "-"}`);

    /* ===============================
       LEFT COLUMN (DONOR INFO)
    =============================== */
    const leftStartY = 160;

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Receipt Details", 40, leftStartY);

    doc
      .font("Helvetica")
      .moveDown(0.5)
      .text(`Receipt No: ${data.receipt_number}`)
      .text(`Date: ${new Date(data.donation_date).toLocaleDateString("en-GB")}`)
      .moveDown()
      .text(`Donor Name: ${data.first_name} ${data.last_name}`)
      .text(`Mobile: ${mobile}`)
      .text(`Email: ${data.email || "-"}`)
      .text(`Address: ${data.city || ""} ${data.state || ""}`);

    /* ===============================
       RIGHT COLUMN (AMOUNT BOX)
    =============================== */
    const boxX = 360;
    const boxY = 150;
    const boxWidth = 200;
    const boxHeight = 120;

    doc
      .rect(boxX, boxY, boxWidth, boxHeight)
      .lineWidth(2)
      .stroke(wine);

    doc
      .fontSize(14)
      .fillColor(wine)
      .font("Helvetica-Bold")
      .text("Donation Amount", boxX + 20, boxY + 25);

    doc
      .fontSize(28)
      .text(`INR ${parseFloat(data.donation_amount).toFixed(2)}`)

    doc.fillColor("black");

    /* ===============================
       FOOTER
    =============================== */
    doc
      .moveTo(40, 300)
      .lineTo(pageWidth - 40, 300)
      .stroke(wine);

    doc
      .fontSize(9)
      .fillColor("gray")
      .text(
        "This is a computer generated receipt and does not require a physical signature.",
        0,
        310,
        { align: "center" }
      );

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating receipt");
  }

});

export default router;
