import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/donors", isAuthenticated, async (req, res) => {
  const { page = 1, search = "" } = req.query;
  const limit = 5;
  const offset = (page - 1) * limit;

  let conditions = [];
  let values = [];

  if (req.session.user.role === "CenterAdmin") {
    conditions.push(`center_id=$${values.length + 1}`);
    values.push(req.session.user.center_id);
  }

  if (search) {
    conditions.push(`(mobile ILIKE $${values.length + 1}
      OR first_name ILIKE $${values.length + 1})`);
    values.push(`%${search}%`);
  }

  let query = "SELECT * FROM donors";
  if (conditions.length)
    query += " WHERE " + conditions.join(" AND ");

  query += ` ORDER BY id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  res.json(result.rows);
});

router.post("/donors/new", isAuthenticated, async (req, res) => {
  const { first_name, last_name, email, mobile, city, state, remarks } = req.body;
  const donorId = "DN" + Date.now();

  await pool.query(
    `INSERT INTO donors
    (donor_id, first_name, last_name, email, mobile, city, state, remarks, center_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [donorId, first_name, last_name, email, mobile, city, state, remarks, req.session.user.center_id]
  );

  res.redirect("/donors-page");
});

export default router;
