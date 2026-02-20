import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/*
====================================================
GET PROGRAMS (Pagination + Center Filter)
====================================================
*/
router.get("/programs", isAuthenticated, async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {

    let baseQuery = `FROM programs`;
    let conditions = [];
    let values = [];

    // Center filter
    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`center_id = $${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    let whereClause = conditions.length
      ? " WHERE " + conditions.join(" AND ")
      : "";

    // =============================
    // TOTAL COUNT
    // =============================
    const totalResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery} ${whereClause}`,
      values
    );

    const total = parseInt(totalResult.rows[0].count);

    // =============================
    // DATA QUERY
    // =============================
    const dataQuery = `
      SELECT *
      ${baseQuery}
      ${whereClause}
      ORDER BY id DESC
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
    console.error("Program pagination error:", err);
    res.status(500).json({ error: "Error fetching programs" });
  }
});


/*
====================================================
CREATE PROGRAM
====================================================
*/
router.post("/programs/new", isAuthenticated, async (req, res) => {
  const { program_name, description, program_date } = req.body;

  try {
    await pool.query(
      `INSERT INTO programs
       (program_name, description, program_date, center_id)
       VALUES ($1,$2,$3,$4)`,
      [
        program_name,
        description,
        program_date,
        req.session.user.center_id
      ]
    );

    res.redirect("/programs-page");

  } catch (err) {
    console.error("Program create error:", err);
    res.status(500).send("Program creation failed");
  }
});

export default router;
