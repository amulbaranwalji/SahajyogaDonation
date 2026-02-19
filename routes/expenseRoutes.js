import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";


const router = express.Router();

// ===============================
// GET EXPENSES (With Year + Center Filter)
// ===============================
router.get("/expenses-list", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  let query = `
    SELECT e.*, p.program_name
    FROM expenses e
    LEFT JOIN programs p ON e.program_id = p.id
  `;

  let conditions = [];
  let values = [];

  // Center filter
  if (req.session.user.role === "CenterAdmin") {
    conditions.push(`e.center_id = $${values.length + 1}`);
    values.push(req.session.user.center_id);
  }

  // Year filter
  if (year && year !== "All") {
    conditions.push(`EXTRACT(YEAR FROM e.expense_date) = $${values.length + 1}`);
    values.push(year);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY e.expense_date DESC";

  const result = await pool.query(query, values);
  res.json(result.rows);
});

// ===============================
// CREATE EXPENSE
// ===============================
router.post("/expenses/new", isAuthenticated, async (req, res) => {
  const {
    program_id,
    expense_amount,
    expense_date,
    expense_description,
    submitted_by,
    status,
    remarks
  } = req.body;

  await pool.query(
    `INSERT INTO expenses
     (program_id, expense_amount, expense_date,
      expense_description, submitted_by, status,
      remarks, center_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      program_id,
      expense_amount,
      expense_date,
      expense_description,
      submitted_by,
      status,
      remarks,
      req.session.user.center_id
    ]
  );

  res.redirect("/expenses-page");
});

// ===============================
// EXPORT EXPENSE CSV
// ===============================
router.get("/expenses-export", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  let query = `
    SELECT 
      p.program_name,
      e.expense_amount,
      e.expense_date,
      e.expense_description,
      e.submitted_by,
      e.status,
      e.remarks
    FROM expenses e
    LEFT JOIN programs p ON e.program_id = p.id
  `;

  let conditions = [];
  let values = [];

  if (req.session.user.role === "CenterAdmin") {
    conditions.push(`e.center_id = $${values.length + 1}`);
    values.push(req.session.user.center_id);
  }

  if (year && year !== "All") {
    conditions.push(`EXTRACT(YEAR FROM e.expense_date) = $${values.length + 1}`);
    values.push(year);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY e.expense_date DESC";

  const result = await pool.query(query, values);

  if (!result.rows.length)
    return res.send("No data available");

  const headers = Object.keys(result.rows[0]).join(",");
  const rows = result.rows.map(r =>
    Object.values(r).map(v => `"${v ?? ""}"`).join(",")
  );

  const csv = [headers, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
  res.send(csv);
});

export default router;
