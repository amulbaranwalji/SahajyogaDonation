import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/donations-list", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  let conditions = [];
  let values = [];

  if (req.session.user.role === "CenterAdmin") {
    conditions.push(`d.center_id=$${values.length + 1}`);
    values.push(req.session.user.center_id);
  }

  if (year) {
    conditions.push(`EXTRACT(YEAR FROM d.donation_date)=$${values.length + 1}`);
    values.push(year);
  }

  let query = `
    SELECT d.*, dn.first_name, dn.last_name, p.program_name
    FROM donations d
    JOIN donors dn ON d.donor_id=dn.id
    LEFT JOIN programs p ON d.program_id=p.id
  `;

  if (conditions.length)
    query += " WHERE " + conditions.join(" AND ");

  query += " ORDER BY d.donation_date DESC";

  const result = await pool.query(query, values);
  res.json(result.rows);
});

export default router;
