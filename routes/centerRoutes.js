import express from "express";
import pool from "../config/db.js";
import { isAdmin } from "../middleware/auth.js";

const router = express.Router();

/*
====================================================
GET ALL CENTERS
====================================================
*/
router.get("/centers", isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM centers ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch centers error:", err);
    res.status(500).json({ error: "Error fetching centers" });
  }
});


/*
====================================================
CREATE CENTER (WITH FULL DETAILS)
====================================================
*/
router.post("/centers/create", isAdmin, async (req, res) => {
  const {
    center_name,
    center_code,
    center_legal_name,
    center_address,
    center_email,
    center_phone,
    gst_number,
    website
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO centers
       (center_name, center_code, center_legal_name,
        center_address, center_email, center_phone,
        gst_number, website)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        center_name,
        center_code,
        center_legal_name,
        center_address,
        center_email,
        center_phone,
        gst_number,
        website
      ]
    );

    res.redirect("/admin-manager");

  } catch (err) {
    console.error("Create center error:", err);
    res.status(500).send("Center creation failed");
  }
});


/*
====================================================
CREATE CENTER ADMIN USER
====================================================
*/
router.post("/admin/create-user", isAdmin, async (req, res) => {
  const { username, password, center_id } = req.body;

  try {
    await pool.query(
      `INSERT INTO admins (username, password, role, center_id)
       VALUES ($1,$2,'CenterAdmin',$3)`,
      [username, password, center_id]
    );

    res.redirect("/admin-manager");

  } catch (err) {
    console.error("Create center admin error:", err);
    res.status(500).send("Center admin creation failed");
  }
});


/*
====================================================
LIST ALL CENTER ADMINS
====================================================
*/
router.get("/admin/list", isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.username,
        c.center_name,
        c.center_code
      FROM admins a
      LEFT JOIN centers c ON a.center_id = c.id
      WHERE a.role = 'CenterAdmin'
      ORDER BY a.id DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error("Fetch admin list error:", err);
    res.status(500).json({ error: "Error fetching admin list" });
  }
});


/*
====================================================
RESET CENTER ADMIN PASSWORD
====================================================
*/
router.post("/admin/reset-password", isAdmin, async (req, res) => {
  const { adminId, newPassword } = req.body;

  try {
    await pool.query(
      "UPDATE admins SET password=$1 WHERE id=$2",
      [newPassword, adminId]
    );

    res.send("Password reset successfully");

  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).send("Password reset failed");
  }
});

export default router;
