import express from "express";
import pool from "../config/db.js";
import { isAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/centers", async (req, res) => {
  const result = await pool.query("SELECT * FROM centers ORDER BY id DESC");
  res.json(result.rows);
});

router.post("/centers/create", isAdmin, async (req, res) => {
  const { center_name, center_code } = req.body;

  await pool.query(
    "INSERT INTO centers (center_name, center_code) VALUES ($1,$2)",
    [center_name, center_code]
  );

  res.redirect("/admin-manager");
});

router.post("/admin/create-user", isAdmin, async (req, res) => {
  const { username, password, center_id } = req.body;

  await pool.query(
    `INSERT INTO admins (username, password, role, center_id)
     VALUES ($1,$2,'CenterAdmin',$3)`,
    [username, password, center_id]
  );

  res.redirect("/admin-manager");
});


router.get("/admin/list", isAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT a.id, a.username, c.center_name
    FROM admins a
    LEFT JOIN centers c ON a.center_id = c.id
    WHERE a.role = 'CenterAdmin'
    ORDER BY a.id DESC
  `);

  res.json(result.rows);
});

/* LIST CENTER ADMIN */
router.get("/admin/list", isAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT a.id, a.username, c.center_name
    FROM admins a
    LEFT JOIN centers c ON a.center_id = c.id
    WHERE a.role = 'CenterAdmin'
    ORDER BY a.id DESC
  `);

  res.json(result.rows);
});

/* RESET PASSWORD */

router.post("/admin/reset-password", isAdmin, async (req, res) => {
  const { adminId, newPassword } = req.body;

  await pool.query(
    "UPDATE admins SET password=$1 WHERE id=$2",
    [newPassword, adminId]
  );

  res.send("Password reset successfully");
});


export default router;
