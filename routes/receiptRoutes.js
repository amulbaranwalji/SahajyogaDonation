import express from "express";
import pool from "../config/db.js";
import PDFDocument from "pdfkit";

const router = express.Router();

/*
=========================================
VALIDATE RECEIPT
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
GENERATE PDF RECEIPT
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

    // Header
    doc.fontSize(18).text("Donation Receipt", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);

    // Two Column Layout
    doc.text(`Receipt No: ${data.receipt_number}`, { continued: true });
    doc.text(`Donation Date: ${new Date(data.donation_date).toLocaleDateString()}`, { align: "right" });

    doc.moveDown();

    doc.text(`Donor Name: ${data.first_name} ${data.last_name}`, { continued: true });
    doc.text(`Donation Amount: ₹ ${data.donation_amount}`, { align: "right" });

    doc.moveDown();

    doc.text(`Donor Email: ${data.email || "-"}`);
    doc.text(`Donor Address: ${data.city || ""} ${data.state || ""}`);

    doc.moveDown(2);

    // Footer
    doc.moveDown(3);
    doc.fontSize(10).text("--------------------------------------------------");
    doc.text(`${data.center_legal_name}`);
    doc.text(`${data.center_address}`);
    doc.text(`Phone: ${data.center_phone}`);
    doc.text(`Website: ${data.website}`);
    doc.moveDown();
    doc.text("This is a computer generated receipt.");

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating receipt");
  }

});

export default router;
