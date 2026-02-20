import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ==============================
   PROFILE PAGE VIEW
================================= */
router.get("/profile-page", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/profile.html"));
});

/* ==============================
   GET PROFILE DATA
================================= */
router.get("/profile-data", isAuthenticated, async (req, res) => {
  try {

    // Master Admin
    if (req.session.user.role === "Admin") {
      return res.json({
        center_legal_name: "Master Admin",
        center_address: "All Centers Access",
        gst_number: "-",
        center_email: "-",
        center_phone: "-",
        website: "-"
      });
    }

    const result = await pool.query(
      `SELECT 
          center_legal_name,
          center_address,
          gst_number,
          center_email,
          center_phone,
          website
       FROM centers
       WHERE id = $1`,
      [req.session.user.center_id]
    );

    res.json(result.rows[0] || {});

  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

export default router;
