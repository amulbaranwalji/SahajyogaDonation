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
GENERATE PROFESSIONAL NGO RECEIPT PDF
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

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt-${receipt}.pdf`
    );

    doc.pipe(res);

    /* ===============================
       NGO HEADER
    =============================== */

    doc
      .fontSize(18)
      .text(data.center_legal_name.toUpperCase(), { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .text(data.center_address, { align: "center" });

    doc.text(
      `Phone: ${data.center_phone || "-"} | Website: ${data.website || "-"}`,
      { align: "center" }
    );

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc
      .fontSize(16)
      .text("DONATION RECEIPT", { align: "center" });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    /* ===============================
       RECEIPT INFORMATION (2 COLUMN)
    =============================== */

    doc.fontSize(11);

    doc.text(`Receipt No: ${data.receipt_number}`, 50, doc.y, {
      continued: true
    });

    doc.text(
      `Date: ${new Date(data.donation_date).toLocaleDateString("en-GB")}`,
      { align: "right" }
    );

    doc.moveDown();

    doc.text(`Donor Name: ${data.first_name} ${data.last_name}`, {
      continued: true
    });

    doc.text(`Donation Amount: ₹ ${data.donation_amount}`, {
      align: "right"
    });

    doc.moveDown();

    /* ===============================
       DONOR DETAILS
    =============================== */

    doc.moveDown();
    doc.fontSize(12).text("Donor Details:", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11);
    doc.text(`Email: ${data.email || "-"}`);
    doc.text(`Mobile: ${mobile}`);
    doc.text(`Address: ${data.city || ""} ${data.state || ""}`);

    doc.moveDown();

    /* ===============================
       FOOTER SECTION
    =============================== */

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc
      .fontSize(9)
      .text(
        "This is a computer generated receipt and does not require a physical signature.",
        { align: "center" }
      );

    doc.moveDown();

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating receipt");
  }

});

export default router;
