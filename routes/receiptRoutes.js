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
PROFESSIONAL RECEIPT (FIXED BORDER CUTTING)
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

    // Increased width slightly
    const doc = new PDFDocument({
      size: [340, 580],
      margin: 30
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt-${receipt}.pdf`
    );

    doc.pipe(res);

    const pageWidth = 340;
    const innerWidth = pageWidth - 80; // safe content area

    /* ===============================
       SAFE BORDER (NOT CUTTING TEXT)
    =============================== */
    doc
      .rect(15, 15, pageWidth - 30, 550)
      .lineWidth(1.5)
      .stroke(wine);

    /* ===============================
       HEADER BAR
    =============================== */
    doc
      .rect(15, 15, pageWidth - 30, 55)
      .fill(wine);

    doc
      .fillColor("white")
      .fontSize(16)
      .text("DONATION RECEIPT", 0, 35, { align: "center" });

    doc.moveDown(4);
    doc.fillColor("black");

    /* ===============================
       CENTER DETAILS
    =============================== */
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(data.center_legal_name, {
        align: "center",
        width: innerWidth
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(data.center_address || "", {
        align: "center",
        width: innerWidth
      });

    doc.text(
      `Phone: ${data.center_phone || "-"}`
    , { align: "center", width: innerWidth });

    doc.text(
      `Website: ${data.website || "-"}`
    , { align: "center", width: innerWidth });

    doc.moveDown();

    doc
      .moveTo(30, doc.y)
      .lineTo(pageWidth - 30, doc.y)
      .stroke(wine);

    doc.moveDown(1);

    /* ===============================
       RECEIPT INFO
    =============================== */
    doc.fontSize(10);

    doc.text(`Receipt No: ${data.receipt_number}`, {
      width: innerWidth
    });

    doc.text(
      `Date: ${new Date(data.donation_date).toLocaleDateString("en-GB")}`,
      { width: innerWidth }
    );

    doc.moveDown();

    doc.text(`Donor Name: ${data.first_name} ${data.last_name}`, {
      width: innerWidth
    });

    doc.text(`Mobile: ${mobile}`, {
      width: innerWidth
    });

    doc.text(`Email: ${data.email || "-"}`, {
      width: innerWidth
    });

    doc.text(`Address: ${data.city || ""} ${data.state || ""}`, {
      width: innerWidth
    });

    doc.moveDown(1.5);

    doc
      .moveTo(30, doc.y)
      .lineTo(pageWidth - 30, doc.y)
      .stroke(wine);

    doc.moveDown(1.5);

    /* ===============================
       DONATION AMOUNT
    =============================== */
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(wine)
      .text("Donation Amount", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(22)
      .text(`₹ ${parseFloat(data.donation_amount).toFixed(2)}`, {
        align: "center"
      });

    doc.fillColor("black");

    doc.moveDown(2);

    /* ===============================
       FOOTER
    =============================== */
    doc
      .moveTo(30, doc.y)
      .lineTo(pageWidth - 30, doc.y)
      .stroke(wine);

    doc.moveDown();

    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        "This is a computer generated receipt and does not require a physical signature.",
        {
          align: "center",
          width: innerWidth
        }
      );

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating receipt");
  }

});

export default router;
