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

export default router;
