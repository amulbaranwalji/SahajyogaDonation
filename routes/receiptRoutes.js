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
GENERATE SMALL WINE STYLE RECEIPT PDF
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
       Width: 320
       Height: 520
    =============================== */
    const doc = new PDFDocument({
      size: [320, 520],
      margin: 20
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt-${receipt}.pdf`
    );

    doc.pipe(res);

    const wine = "#722F37";

    /* ===============================
       OUTER WINE BORDER
    =============================== */
    doc.rect(5, 5, 310, 510)
       .lineWidth(3)
       .stroke(wine);

    /* ===============================
       HEADER STRIP
    =============================== */
    doc.rect(5, 5, 310, 45)
       .fill(wine);

    doc.fillColor("white")
       .fontSize(14)
       .text("DONATION RECEIPT", 0, 20, { align: "center" });

    doc.moveDown(3);

    doc.fillColor("black");

    /* ===============================
       CENTER DETAILS
    =============================== */
    doc.fontSize(11)
       .text(data.center_legal_name, { align: "center" });

    doc.fontSize(9)
       .text(data.center_address || "", { align: "center" });

    doc.text(
      `Phone: ${data.center_phone || "-"}`
    , { align: "center" });

    doc.text(
      `Website: ${data.website || "-"}`
    , { align: "center" });

    doc.moveDown();

    doc.moveTo(20, doc.y)
       .lineTo(300, doc.y)
       .strokeColor(wine)
       .stroke();

    doc.moveDown();

    /* ===============================
       RECEIPT DETAILS
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

    doc.moveDown();

    doc.moveTo(20, doc.y)
       .lineTo(300, doc.y)
       .strokeColor(wine)
       .stroke();

    doc.moveDown();

    /* ===============================
       AMOUNT HIGHLIGHT
    =============================== */
    doc.fillColor(wine)
       .fontSize(14)
       .text(`Donation Amount`, { align: "center" });

    doc.moveDown(0.3);

    doc.fontSize(18)
       .text(`₹ ${data.donation_amount}`, { align: "center" });

    doc.fillColor("black");

    doc.moveDown(2);

    /* ===============================
       FOOTER
    =============================== */
    doc.moveTo(20, doc.y)
       .lineTo(300, doc.y)
       .strokeColor(wine)
       .stroke();

    doc.moveDown();

    doc.fontSize(8)
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
