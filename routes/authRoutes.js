import express from "express";
import pool from "../config/db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM admins WHERE username=$1",
    [username]
  );

  if (!result.rows.length) return res.send("Invalid username");

  const user = result.rows[0];

  if (password !== user.password)
    return res.send("Invalid password");

  req.session.user = {
    id: user.id,
    role: user.role,
    center_id: user.center_id
  };

  user.role === "Admin"
    ? res.redirect("/admin-manager")
    : res.redirect("/dashboard");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

export default router;
