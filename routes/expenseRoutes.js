import express from "express";
import pool from "../config/db.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/*
====================================================
GET EXPENSES (Pagination + Year + Center Filter)
====================================================
*/
router.get("/expenses-list", isAuthenticated, async (req, res) => {

  const { year } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {

    let baseQuery = `
      FROM expenses e
      LEFT JOIN programs p ON e.program_id = p.id
    `;

    let conditions = [];
    let values = [];

    // Center filter
    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`e.center_id = $${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    // Year filter
    if (year && year !== "All") {
      conditions.push(`EXTRACT(YEAR FROM e.expense_date) = $${values.length + 1}`);
      values.push(year);
    }

    let whereClause = conditions.length
      ? " WHERE " + conditions.join(" AND ")
      : "";

    // TOTAL COUNT
    const totalResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery} ${whereClause}`,
      values
    );

    const total = parseInt(totalResult.rows[0].count);

    // DATA QUERY
    const dataQuery = `
      SELECT e.*, p.program_name
      ${baseQuery}
      ${whereClause}
      ORDER BY e.expense_date DESC, e.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const dataValues = [...values, limit, offset];

    const result = await pool.query(dataQuery, dataValues);

    res.json({
      data: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error("Expense pagination error:", err);
    res.status(500).json({ error: "Error fetching expenses" });
  }
});

/*
====================================================
GET SINGLE EXPENSE
====================================================
*/

router.get("/expenses/:id", isAuthenticated, async (req, res) => {

const expenseId = req.params.id;

try {

let query = "SELECT * FROM expenses WHERE id = $1";
let values = [expenseId];

if (req.session.user.role === "CenterAdmin") {
query += " AND center_id = $2";
values.push(req.session.user.center_id);
}

const result = await pool.query(query, values);

if(!result.rows.length){
return res.status(404).json({error:"Expense not found"});
}

res.json(result.rows[0]);

} catch (err) {
console.error(err);
res.status(500).json({error:"Error fetching expense"});
}

});

/*
====================================================
UPDATE SINGLE EXPENSE
====================================================
*/
router.post("/expenses/update/:id", isAuthenticated, async (req, res) => {

const expenseId = req.params.id;
const {
program_id,
expense_amount,
expense_date,
status,
submitted_by,
remarks
} = req.body;

try {

if(!expense_amount || parseFloat(expense_amount) <= 0){
return res.status(400).send("Expense amount must be greater than zero.");
}

let query = `
UPDATE expenses
SET program_id=$1,
expense_amount=$2,
expense_date=$3,
status=$4,
submitted_by=$5,
remarks=$6
WHERE id=$7
`;

let values = [
program_id,
expense_amount,
expense_date,
status || null,
submitted_by || null,
remarks || null,
expenseId
];

if(req.session.user.role === "CenterAdmin"){
query += " AND center_id=$8";
values.push(req.session.user.center_id);
}

await pool.query(query, values);

res.redirect("/expenses-page");

} catch(err){
console.error(err);
res.status(500).send("Expense update failed");
}

});



/*
====================================================
CREATE EXPENSE
====================================================
*/
router.post("/expenses/new", isAuthenticated, async (req, res) => {

  const {
    program_id,
    expense_amount,
    expense_date,
    expense_description,
    submitted_by,
    status,
    remarks
  } = req.body;

  try {

    // 🔒 Server-side validation
    if (!expense_amount || parseFloat(expense_amount) <= 0) {
      return res.status(400).send("Expense amount must be greater than zero.");
    }

    if (!expense_date) {
      return res.status(400).send("Expense date is required.");
    }

    if (!submitted_by || submitted_by.trim() === "") {
      return res.status(400).send("Submitted By is required.");
    }

    await pool.query(
      `INSERT INTO expenses
       (program_id, expense_amount, expense_date,
        expense_description, submitted_by, status,
        remarks, center_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        program_id,
        expense_amount,
        expense_date,
        expense_description,
        submitted_by,
        status,
        remarks,
        req.session.user.center_id
      ]
    );

    res.redirect("/expenses-page");

  } catch (err) {
    console.error("Expense create error:", err);
    res.status(500).send("Expense creation failed");
  }
});


/*
====================================================
EXPORT EXPENSE CSV
====================================================
*/
router.get("/expenses-export", isAuthenticated, async (req, res) => {

  const { year } = req.query;

  try {

    let query = `
      SELECT 
        p.program_name,
        e.expense_amount,
        e.expense_date,
        e.expense_description,
        e.submitted_by,
        e.status,
        e.remarks
      FROM expenses e
      LEFT JOIN programs p ON e.program_id = p.id
    `;

    let conditions = [];
    let values = [];

    if (req.session.user.role === "CenterAdmin") {
      conditions.push(`e.center_id = $${values.length + 1}`);
      values.push(req.session.user.center_id);
    }

    if (year && year !== "All") {
      conditions.push(`EXTRACT(YEAR FROM e.expense_date) = $${values.length + 1}`);
      values.push(year);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY e.expense_date DESC";

    const result = await pool.query(query, values);

    if (!result.rows.length)
      return res.send("No data available");

    const headers = Object.keys(result.rows[0]).join(",");
    const rows = result.rows.map(r =>
      Object.values(r).map(v => `"${v ?? ""}"`).join(",")
    );

    const csv = [headers, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
    res.send(csv);

  } catch (err) {
    console.error("Expense export error:", err);
    res.status(500).send("CSV export failed");
  }
});

export default router;
