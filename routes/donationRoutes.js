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
GET DONATIONS LIST (PAGINATION + YEAR + CENTER)
====================================================
*/
router.get("/donations-list", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {

    let baseQuery = `
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      LEFT JOIN programs p ON d.program_id = p.id
    `;

    let conditions = [];
    let values = [];

    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`d.center_id = $${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    if (year && year !== "All") {
      conditions.push(`EXTRACT(YEAR FROM d.donation_date) = $${values.length + 1}`);
      values.push(year);
    }

    let whereClause = conditions.length
      ? " WHERE " + conditions.join(" AND ")
      : "";

    // TOTAL COUNT
    const totalResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery} ${whereClause}`,
      values
    );

    const total = parseInt(totalResult.rows[0].count);

    // 🔥 FIXED DATA QUERY (Added dn.mobile)
    const dataQuery = `
      SELECT 
        d.id,
        d.receipt_number,
        d.donation_amount,
        d.donation_date,
        d.payment_mode,
        d.remarks,
        dn.first_name,
        dn.last_name,
        dn.mobile,            -- ✅ ADDED THIS LINE
        p.program_name
      ${baseQuery}
      ${whereClause}
      ORDER BY d.donation_date DESC, d.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    const result = await pool.query(dataQuery, values);

    res.json({
      data: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

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
GET SINGLE DONATION (FOR EDIT PAGE)
====================================================
*/
router.get("/donations/:id", isAuthenticated, async (req, res) => {

  const donationId = req.params.id;

  try {

    let query = `
      SELECT 
        d.*,
        dn.first_name,
        dn.last_name,
        dn.mobile,
        p.program_name
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      LEFT JOIN programs p ON d.program_id = p.id
      WHERE d.id = $1
    `;

    let values = [donationId];

    // Center restriction (VERY IMPORTANT)
    if (req.session.user.role === "CenterAdmin") {
      query += " AND d.center_id = $2";
      values.push(req.session.user.center_id);
    }

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Donation not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Fetch donation error:", err);
    res.status(500).json({ error: "Error fetching donation" });
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

    let baseQuery = `
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      LEFT JOIN programs p ON d.program_id = p.id
    `;

    let conditions = [];
    let values = [];

    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`d.center_id = $${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    if (year && year !== "All") {
      conditions.push(`EXTRACT(YEAR FROM d.donation_date) = $${values.length + 1}`);
      values.push(year);
    }

    let whereClause = conditions.length
      ? " WHERE " + conditions.join(" AND ")
      : "";

    const query = `
      SELECT 
        d.receipt_number,
        dn.first_name,
        dn.last_name,
        p.program_name,
        d.donation_amount,
        d.donation_date,
        d.payment_mode,
        d.remarks
      ${baseQuery}
      ${whereClause}
      ORDER BY d.donation_date DESC
    `;

    const result = await pool.query(query, values);

    if (!result.rows.length)
      return res.send("No data available");

    const headers = [
      "Receipt Number",
      "First Name",
      "Last Name",
      "Program",
      "Amount",
      "Donation Date",
      "Payment Mode",
      "Remarks"
    ].join(",");

    const rows = result.rows.map(r =>
      [
        r.receipt_number,
        r.first_name,
        r.last_name,
        r.program_name,
        r.donation_amount,
        r.donation_date,
        r.payment_mode,
        r.remarks
      ]
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
