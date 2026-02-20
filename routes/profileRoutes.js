import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/*
====================================================
PROFILE PAGE VIEW
====================================================
*/
router.get("/profile-page", isAuthenticated, (req, res) => {
  res.sendFile("profile.html", { root: "views" });
});

/*
====================================================
GET PROFILE DATA
====================================================
*/
router.get("/profile-data", isAuthenticated, async (req, res) => {

  try {

    // If Admin (Master Admin)
    if (req.session.user.role === "Admin") {
      return res.json({
        center_legal_name: "Master Admin",
        center_address: "All Centers Access",
        center_pan: "-",
        center_email: "-",
        center_phone: "-",
        center_website: "-"
      });
    }

    // Center Admin
    const result = await pool.query(
      `SELECT 
          center_legal_name,
          center_address,
          center_pan,
          center_email,
          center_phone,
          center_website
       FROM centers
       WHERE id = $1`,
      [req.session.user.center_id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }

});

export default router;
