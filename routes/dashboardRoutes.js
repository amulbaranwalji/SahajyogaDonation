// ===============================
// DASHBOARD STATS
// ===============================
app.get("/dashboard-stats", isAuthenticated, async (req, res) => {
  try {

    let centerCondition = "";
    let values = [];

    if (req.session.user.role === "CenterAdmin") {
      centerCondition = "WHERE center_id = $1";
      values.push(req.session.user.center_id);
    }

    const totalDonations = await pool.query(
      `SELECT COUNT(*) FROM donations ${centerCondition}`,
      values
    );

    const totalPrograms = await pool.query(
      `SELECT COUNT(*) FROM programs ${centerCondition}`,
      values
    );

    const totalDonors = await pool.query(
      `SELECT COUNT(*) FROM donors ${centerCondition}`,
      values
    );

    const totalExpenses = await pool.query(
      `SELECT COUNT(*) FROM expenses ${centerCondition}`,
      values
    );

    res.json({
      totalDonations: totalDonations.rows[0].count,
      totalPrograms: totalPrograms.rows[0].count,
      totalDonors: totalDonors.rows[0].count,
      totalExpenses: totalExpenses.rows[0].count
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});
