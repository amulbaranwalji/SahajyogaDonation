import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/*
====================================================
DASHBOARD STATS (Center + Financial Year Support)
====================================================
*/
router.get("/dashboard-stats", isAuthenticated, async (req, res) => {

  const { fy } = req.query; // Example: 2024-2025

  try {

    let donationConditions = [];
    let donationValues = [];

    let simpleCenterCondition = "";
    let simpleCenterValues = [];

    // ==========================
    // CENTER FILTER
    // ==========================
    if (req.session.user.role === "CenterAdmin") {

      simpleCenterCondition = "WHERE center_id = $1";
      simpleCenterValues.push(req.session.user.center_id);

      donationConditions.push(`center_id = $${donationValues.length + 1}`);
      donationValues.push(req.session.user.center_id);
    }

    // ==========================
    // FINANCIAL YEAR FILTER
    // ==========================
    if (fy) {
      const [startYear] = fy.split("-");

      const startDate = `${startYear}-04-01`;
      const endDate = `${parseInt(startYear) + 1}-03-31`;

      donationConditions.push(
        `donation_date BETWEEN $${donationValues.length + 1} AND $${donationValues.length + 2}`
      );

      donationValues.push(startDate, endDate);
    }

    const donationWhereClause =
      donationConditions.length
        ? "WHERE " + donationConditions.join(" AND ")
        : "";

    // ==========================
    // TOTAL COUNTS
    // ==========================

    const totalDonors = await pool.query(
      `SELECT COUNT(*) FROM donors ${simpleCenterCondition}`,
      simpleCenterValues
    );

    const totalPrograms = await pool.query(
      `SELECT COUNT(*) FROM programs ${simpleCenterCondition}`,
      simpleCenterValues
    );

    const totalExpenses = await pool.query(
      `SELECT COUNT(*) FROM expenses ${simpleCenterCondition}`,
      simpleCenterValues
    );

    const donationStats = await pool.query(
      `
      SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(donation_amount),0) as total_amount
      FROM donations
      ${donationWhereClause}
      `,
      donationValues
    );

    // ==========================
    // RESPONSE
    // ==========================

    res.json({
      totalDonors: totalDonors.rows[0].count,
      totalPrograms: totalPrograms.rows[0].count,
      totalExpenses: totalExpenses.rows[0].count,
      totalDonations: donationStats.rows[0].total_donations,
      totalAmount: donationStats.rows[0].total_amount
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }

});

export default router;
