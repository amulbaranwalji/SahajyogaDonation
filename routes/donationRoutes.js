import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/*
====================================================
SEARCH DONOR BY MOBILE
====================================================
*/
router.get("/donors/search", isAuthenticated, async (req, res) => {
  const { mobile } = req.query;

  try {
    let query = `
      SELECT id, first_name, last_name, email, mobile
      FROM donors
      WHERE mobile = $1
    `;
    let values = [mobile];

    // Restrict to center if CenterAdmin
    if (req.session.user.role === "CenterAdmin") {
      query += " AND center_id = $2";
      values.push(req.session.user.center_id);
    }

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error("Donor search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});


/*
====================================================
GET DONATIONS LIST (WITH YEAR + CENTER FILTER)
====================================================
*/
router.get("/donations-list", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  try {
    let query = `
      SELECT 
        d.id,
        d.receipt_number,
        d.donation_amount,
        d.donation_date,
        d.payment_mode,
        d.remarks,
        dn.first_name,
        dn.last_name,
        p.program_name
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      LEFT JOIN programs p ON d.program_id = p.id
    `;

    let conditions = [];
    let values = [];

    // Center filter
    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`d.center_id = $${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    // Year filter
    if (year && year !== "All") {
      conditions.push(`EXTRACT(YEAR FROM d.donation_date) = $${values.length + 1}`);
      values.push(year);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY d.donation_date DESC, d.id DESC";

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error("Donation list error:", err);
    res.status(500).json({ error: "Error fetching donations" });
  }
});


/*
====================================================
CREATE NEW DONATION
====================================================
*/
router.post("/donations/new", isAuthenticated, async (req, res) => {
  const {
    donor_id,
    program_id,
    donation_amount,
    donation_date,
    payment_mode,
    remarks
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO donations
       (donor_id, program_id, donation_amount,
        donation_date, payment_mode, remarks, center_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        donor_id,
        program_id,
        donation_amount,
        donation_date,
        payment_mode,
        remarks,
        req.session.user.center_id
      ]
    );

    res.redirect("/donations-page");

  } catch (err) {
    console.error("Donation create error:", err);
    res.status(500).send("Donation creation failed");
  }
});


/*
====================================================
EXPORT DONATIONS CSV
====================================================
*/
router.get("/donations-export", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  try {
    let query = `
      SELECT 
        d.receipt_number,
        dn.first_name,
        dn.last_name,
        p.program_name,
        d.donation_amount,
        d.donation_date,
        d.payment_mode,
        d.remarks
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      LEFT JOIN programs p ON d.program_id = p.id
    `;

    let conditions = [];
    let values = [];

    // Center filter
    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`d.center_id = $${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    // Year filter
    if (year && year !== "All") {
      conditions.push(`EXTRACT(YEAR FROM d.donation_date) = $${values.length + 1}`);
      values.push(year);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY d.donation_date DESC, d.id DESC";

    const result = await pool.query(query, values);

    if (!result.rows.length)
      return res.send("No data available");

    // Convert to CSV
    const headers = Object.keys(result.rows[0]).join(",");
    const rows = result.rows.map(row =>
      Object.values(row)
        .map(val => `"${val ?? ""}"`)
        .join(",")
    );

    const csv = [headers, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=donations.csv");
    res.send(csv);

  } catch (err) {
    console.error("Donation export error:", err);
    res.status(500).send("CSV export failed");
  }
});

export default router;
