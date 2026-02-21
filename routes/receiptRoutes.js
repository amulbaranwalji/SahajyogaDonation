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
PROFESSIONAL NGO RECEIPT (IMPROVED UI)
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

    /* ===============================
       SMALL RECEIPT SIZE
       (Thermal style, not A4)
    =============================== */
    const doc = new PDFDocument({
      size: [320, 560],
      margin: 25
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt-${receipt}.pdf`
    );

    doc.pipe(res);

    const wine = "#722F37";

    /* ===============================
       CLEAN OUTER BORDER
    =============================== */
    doc
      .rect(10, 10, 300, 540)
      .lineWidth(2)
      .stroke(wine);

    /* ===============================
       HEADER BAR
    =============================== */
    doc
      .rect(10, 10, 300, 50)
      .fill(wine);

    doc
      .fillColor("white")
      .fontSize(16)
      .text("DONATION RECEIPT", 0, 28, { align: "center" });

    doc.moveDown(4);
    doc.fillColor("black");

    /* ===============================
       CENTER DETAILS
    =============================== */
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(data.center_legal_name, { align: "center" });

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(data.center_address || "", { align: "center" });

    doc.text(
      `Phone: ${data.center_phone || "-"}`
    , { align: "center" });

    doc.text(
      `Website: ${data.website || "-"}`
    , { align: "center" });

    doc.moveDown(1);

    doc
      .moveTo(25, doc.y)
      .lineTo(295, doc.y)
      .stroke(wine);

    doc.moveDown(1);

    /* ===============================
       RECEIPT INFO SECTION
    =============================== */
    doc.fontSize(10);

    doc.text(`Receipt No: ${data.receipt_number}`);
    doc.text(
      `Date: ${new Date(data.donation_date).toLocaleDateString("en-GB")}`
    );

    doc.moveDown();

    doc.text(`Donor Name: ${data.first_name} ${data.last_name}`);
    doc.text(`Mobile: ${mobile}`);
    doc.text(`Email: ${data.email || "-"}`);
    doc.text(`Address: ${data.city || ""} ${data.state || ""}`);

    doc.moveDown(1);

    doc
      .moveTo(25, doc.y)
      .lineTo(295, doc.y)
      .stroke(wine);

    doc.moveDown(1.5);

    /* ===============================
       DONATION AMOUNT (HIGHLIGHTED)
    =============================== */
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(wine)
      .text("Donation Amount", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(22)
      .text(`₹ ${parseFloat(data.donation_amount).toFixed(2)}`, { align: "center" });

    doc.fillColor("black");
    doc.moveDown(2);

    /* ===============================
       FOOTER NOTE
    =============================== */
    doc
      .moveTo(25, doc.y)
      .lineTo(295, doc.y)
      .stroke(wine);

    doc.moveDown(1);

    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        "This is a computer generated receipt and does not require a physical signature.",
        { align: "center" }
      );

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating receipt");
  }

});

export default router;
