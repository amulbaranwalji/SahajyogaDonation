import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import centerRoutes from "./routes/centerRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "mysecret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

// ✅ ADD THIS
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "donorlogin.html"));
});

// Register routes
app.use(authRoutes);
app.use(centerRoutes);
app.use(donorRoutes);
app.use(donationRoutes);
app.use(programRoutes);
app.use(expenseRoutes);

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
