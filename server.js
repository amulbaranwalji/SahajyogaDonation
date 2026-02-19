import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// DATABASE CONNECTION
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "mysecret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

// ===============================
// AUTH MIDDLEWARE
// ===============================
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

// ===============================
// PAGE ROUTES
// ===============================
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "donorlogin.html"))
);

app.get("/dashboard", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "dashboard.html"))
);

app.get("/donors-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "donors.html"))
);

app.get("/new-donor-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-donor.html"))
);

app.get("/programs-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "programs.html"))
);

app.get("/new-program-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-program.html"))
);

app.get("/donations-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "donations.html"))
);

app.get("/new-donation-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-donation.html"))
);

app.get("/expenses-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "expenses.html"))
);

app.get("/new-expense-page", isAuthenticated, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-expense.html"))
);

// ===============================
// LOGIN / LOGOUT
// ===============================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM admins WHERE username=$1",
      [username]
    );

    if (result.rows.length === 0)
      return res.send("Invalid username");

    const user = result.rows[0];

    if (password !== user.password)
      return res.send("Invalid password");

    req.session.user = user;
    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.send("Login error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ===============================
// DONATIONS
// ===============================

// Create Donation
app.post("/donations/new", isAuthenticated, async (req, res) => {
  const { donor_id, program_id, donation_amount, donation_date, payment_mode, remarks } = req.body;

  try {
    await pool.query(
      `INSERT INTO donations
      (donor_id, program_id, donation_amount, donation_date, payment_mode, remarks)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [donor_id, program_id, donation_amount, donation_date, payment_mode, remarks]
    );

    res.redirect("/donations-page");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating donation");
  }
});

// Fetch Donations
app.get("/donations-list", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  try {
    let query = `
      SELECT 
        d.id,
        d.receipt_number,
        d.donation_amount,
        d.donation_date,
        d.payment_mode,
        d.remarks,
        d.created_at,
        dn.first_name,
        dn.last_name,
        p.program_name
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      LEFT JOIN programs p ON d.program_id = p.id
    `;

    const values = [];

    if (year && year !== "All") {
      query += ` WHERE EXTRACT(YEAR FROM d.donation_date) = $1`;
      values.push(year);
    }

    query += " ORDER BY d.donation_date DESC, d.id DESC";

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching donations" });
  }
});

// Export Donations CSV
app.get("/donations-export", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  try {
    let query = `
      SELECT 
        d.receipt_number,
        dn.first_name,
        dn.last_name,
        p.program_name,
        d.donation_amount,
        d.donation_date,
        d.payment_mode,
        d.remarks
      FROM donations d
      JOIN donors dn ON d.donor_id = dn.id
      LEFT JOIN programs p ON d.program_id = p.id
    `;

    const values = [];

    if (year && year !== "All") {
      query += ` WHERE EXTRACT(YEAR FROM d.donation_date) = $1`;
      values.push(year);
    }

    query += " ORDER BY d.donation_date DESC, d.id DESC";

    const result = await pool.query(query, values);

    if (result.rows.length === 0)
      return res.send("No data available");

    const headers = [
      "Receipt Number",
      "First Name",
      "Last Name",
      "Program",
      "Amount",
      "Donation Date",
      "Payment Mode",
      "Remarks"
    ].join(",");

    const csvRows = result.rows.map(r =>
      [
        r.receipt_number,
        r.first_name,
        r.last_name,
        r.program_name,
        r.donation_amount,
        r.donation_date,
        r.payment_mode,
        r.remarks
      ].map(v => `"${v ?? ""}"`).join(",")
    );

    const csv = [headers, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=donations.csv");
    res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error exporting CSV");
  }
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
