import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import centerRoutes from "./routes/centerRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "mysecret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

app.use(authRoutes);
app.use(centerRoutes);
app.use(donorRoutes);
app.use(donationRoutes);

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
