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
// DONORS
// ===============================
app.get("/donors", isAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search || "";
  const limit = 5;
  const offset = (page - 1) * limit;

  try {
    let baseQuery = "FROM donors";
    let values = [];
    let whereClause = "";

    if (search) {
      whereClause = `
        WHERE mobile ILIKE $1
        OR first_name ILIKE $1
        OR last_name ILIKE $1
      `;
      values.push(`%${search}%`);
    }

    const finalQuery = `
      SELECT * ${baseQuery}
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    const result = await pool.query(finalQuery, values);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching donors" });
  }
});

app.post("/donors/new", isAuthenticated, async (req, res) => {
  const { first_name, last_name, email, mobile, city, state, remarks } = req.body;
  const donorId = "DN" + Date.now();

  try {
    await pool.query(
      `INSERT INTO donors
      (donor_id, first_name, last_name, email, mobile, city, state, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [donorId, first_name, last_name, email, mobile, city, state, remarks]
    );

    res.redirect("/donors-page");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating donor");
  }
});

// ===============================
// PROGRAMS
// ===============================
app.get("/programs", isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, program_name, description, program_date, created_at FROM programs ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching programs" });
  }
});

app.post("/programs/new", isAuthenticated, async (req, res) => {
  const { program_name, description, program_date } = req.body;

  try {
    await pool.query(
      "INSERT INTO programs (program_name, description, program_date) VALUES ($1,$2,$3)",
      [program_name, description, program_date]
    );
    res.redirect("/programs-page");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating program");
  }
});

// ===============================
// DONATIONS (Updated with Receipt)
// ===============================
app.get("/donations-list", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  try {
    let query = `
      SELECT 
        d.receipt_number,
        d.donation_amount,
        d.donation_date,
        d.payment_mode,
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

    query += " ORDER BY d.donation_date DESC";

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching donations" });
  }
});

// ===============================
// EXPENSES
// ===============================
app.get("/expenses-list", isAuthenticated, async (req, res) => {
  const { year } = req.query;

  try {
    let query = `
      SELECT e.*, p.program_name
      FROM expenses e
      LEFT JOIN programs p ON e.program_id = p.id
    `;

    const values = [];

    if (year && year !== "All") {
      query += ` WHERE EXTRACT(YEAR FROM e.expense_date) = $1`;
      values.push(year);
    }

    query += " ORDER BY e.id DESC";

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching expenses" });
  }
});

// Create Expense
app.post("/expenses/new", isAuthenticated, async (req, res) => {
  const { program_id, expense_amount, expense_date, expense_description, submitted_by, status, remarks } = req.body;

  try {
    await pool.query(
      `INSERT INTO expenses
      (program_id, expense_amount, expense_date, expense_description, submitted_by, status, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        program_id,
        expense_amount,
        expense_date,
        expense_description,
        submitted_by,
        status,
        remarks
      ]
    );

    res.redirect("/expenses-page");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating expense");
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
