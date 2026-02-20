import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/*
====================================================
GET DONORS (Pagination + Search + Center Filter)
====================================================
*/
router.get("/donors", isAuthenticated, async (req, res) => {
  const { page = 1, search = "" } = req.query;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {

    let conditions = [];
    let values = [];

    // Center filter
    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`center_id=$${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    // Search filter
    if (search) {
      conditions.push(`(mobile ILIKE $${values.length + 1}
        OR first_name ILIKE $${values.length + 1}
        OR last_name ILIKE $${values.length + 1})`);
      values.push(`%${search}%`);
    }
    // donation amount validation
    if (!donation_amount || parseFloat(donation_amount) <= 0) {
    return res.status(400).send("Donation amount must be greater than zero.");
    }


    let query = "SELECT * FROM donors";
    if (conditions.length)
      query += " WHERE " + conditions.join(" AND ");

    query += ` ORDER BY id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error("Donor fetch error:", err);
    res.status(500).json({ error: "Failed to fetch donors" });
  }
});


/*
====================================================
GET SINGLE DONOR (For Edit Page)
====================================================
*/
router.get("/donors/:id", isAuthenticated, async (req, res) => {
  const donorId = req.params.id;

  try {

    let query = "SELECT * FROM donors WHERE id = $1";
    let values = [donorId];

    // Center protection
    if (req.session.user.role === "CenterAdmin") {
      query += " AND center_id = $2";
      values.push(req.session.user.center_id);
    }

    const result = await pool.query(query, values);

    if (!result.rows.length)
      return res.status(404).json({ error: "Donor not found" });

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Fetch donor error:", err);
    res.status(500).json({ error: "Error fetching donor" });
  }
});


/*
====================================================
UPDATE DONOR (Restricted Fields Only)
====================================================
*/
router.post("/donors/update/:id", isAuthenticated, async (req, res) => {

  const donorId = req.params.id;
  const { first_name, last_name, email, city, state, remarks } = req.body;

  try {

    // Validation
    if (!first_name || !last_name) {
      return res.status(400).send("First and Last name are required.");
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).send("Invalid email format.");
      }
    }

    let query = `
      UPDATE donors
      SET first_name=$1,
          last_name=$2,
          email=$3,
          city=$4,
          state=$5,
          remarks=$6
      WHERE id=$7
    `;

    let values = [
      first_name.trim(),
      last_name.trim(),
      email || null,
      city || null,
      state || null,
      remarks || null,
      donorId
    ];

    // Center security
    if (req.session.user.role === "CenterAdmin") {
      query += " AND center_id=$8";
      values.push(req.session.user.center_id);
    }

    await pool.query(query, values);

    res.redirect("/donors-page");

  } catch (err) {
    console.error("Donor update error:", err);
    res.status(500).send("Update failed");
  }
});


/*
====================================================
CREATE NEW DONOR (With Validation + Duplicate Check)
====================================================
*/
router.post("/donors/new", isAuthenticated, async (req, res) => {

  const { first_name, last_name, email, mobile, city, state, remarks } = req.body;
  const donorId = "DN" + Date.now();

  try {

    // 🔴 Mandatory Validation
    if (!first_name || !last_name || !mobile) {
      return res.status(400).send("First Name, Last Name and Mobile are mandatory.");
    }

    // 🔴 Mobile Validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).send("Mobile number must be exactly 10 digits.");
    }

    // 🔴 Email Validation (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).send("Invalid email format.");
      }
    }

    await pool.query(
      `INSERT INTO donors
      (donor_id, first_name, last_name, email, mobile, city, state, remarks, center_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        donorId,
        first_name.trim(),
        last_name.trim(),
        email || null,
        mobile,
        city || null,
        state || null,
        remarks || null,
        req.session.user.center_id
      ]
    );

    res.redirect("/donors-page");

  } catch (err) {

    // 🔴 Duplicate Mobile Handling (unique constraint error)
    if (err.code === "23505") {
      return res.status(400).send("This mobile number is already registered in your center.");
    }

    console.error("Donor create error:", err);
    res.status(500).send("Donor creation failed.");
  }

});

export default router;
