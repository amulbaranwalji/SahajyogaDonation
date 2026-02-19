import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";


const router = express.Router();

// Get Programs
router.get("/programs", isAuthenticated, async (req, res) => {
  let query = "SELECT * FROM programs";
  let values = [];

  if (req.session.user.role === "CenterAdmin") {
    query += " WHERE center_id=$1";
    values.push(req.session.user.center_id);
  }

  query += " ORDER BY id DESC";

  const result = await pool.query(query, values);
  res.json(result.rows);
});

// Create Program
router.post("/programs/new", isAuthenticated, async (req, res) => {
  const { program_name, description, program_date } = req.body;

  await pool.query(
    `INSERT INTO programs
     (program_name, description, program_date, center_id)
     VALUES ($1,$2,$3,$4)`,
    [program_name, description, program_date, req.session.user.center_id]
  );

  res.redirect("/programs-page");
});

export default router;
