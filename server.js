import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Route Imports
import authRoutes from "./routes/authRoutes.js";
import centerRoutes from "./routes/centerRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";

import dashboardRoutes from "./routes/dashboardRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";






dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false
}));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// ROOT ROUTE (Login Page)
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "donorlogin.html"));
});

// ===============================
// PAGE ROUTES (Protected HTML)
// ===============================
app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "dashboard.html"))
);

app.get("/admin-manager", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "admin-manager.html"))
);

app.get("/donors-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "donors.html"))
);

app.get("/new-donor-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-donor.html"))
);

app.get("/programs-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "programs.html"))
);

app.get("/new-program-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-program.html"))
);

app.get("/donations-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "donations.html"))
);

app.get("/new-donation-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-donation.html"))
);

app.get("/expenses-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "expenses.html"))
);

app.get("/new-expense-page", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "new-expense.html"))
);

// ===============================
// REGISTER API ROUTES
// ===============================
app.use(authRoutes);
app.use(centerRoutes);
app.use(donorRoutes);
app.use(donationRoutes);
app.use(programRoutes);
app.use(expenseRoutes);
app.use("/", dashboardRoutes);
app.use("/", profileRoutes);

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
