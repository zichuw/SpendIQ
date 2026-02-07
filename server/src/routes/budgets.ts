import { Router } from "express";
import { Pool } from "pg";
import { createBudget, updateBudgetLogic } from "../logic/budgets"; // adjust imports based on your logic file

const router = Router();

// Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --------------------
// 1. Get all budgets for a user
// --------------------
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, category, limit_amount, period, created_at FROM budgets WHERE user_id = $1",
      [user_id]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error("Error fetching budgets:", err.message);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

// --------------------
// 2. Create a new budget
// --------------------
router.post("/", async (req, res) => {
  const { user_id, category, limit_amount, period } = req.body;

  if (!user_id || !category || !limit_amount || !period) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Optionally call your logic layer for validation/creation
    const newBudget = createBudget({ user_id, category, limit_amount, period });

    const result = await pool.query(
      `INSERT INTO budgets (user_id, category, limit_amount, period, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, category, limit_amount, period, created_at`,
      [user_id, category, limit_amount, period]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Error creating budget:", err.message);
    res.status(500).json({ error: "Failed to create budget" });
  }
});

// --------------------
// 3. Update an existing budget
// --------------------
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { category, limit_amount, period } = req.body;

  if (!category && !limit_amount && !period) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    // Optionally validate/update via logic layer
    updateBudgetLogic({ id, category, limit_amount, period });

    // Build dynamic query
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (category) { fields.push(`category=$${idx++}`); values.push(category); }
    if (limit_amount) { fields.push(`limit_amount=$${idx++}`); values.push(limit_amount); }
    if (period) { fields.push(`period=$${idx++}`); values.push(period); }

    values.push(id);

    const query = `UPDATE budgets SET ${fields.join(", ")} WHERE id=$${idx} RETURNING id, category, limit_amount, period, created_at`;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) return res.status(404).json({ error: "Budget not found" });

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Error updating budget:", err.message);
    res.status(500).json({ error: "Failed to update budget" });
  }
});

// --------------------
// 4. Delete a budget
// --------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM budgets WHERE id=$1 RETURNING id", [id]);

    if (result.rowCount === 0) return res.status(404).json({ error: "Budget not found" });

    res.json({ message: "Budget deleted", id });
  } catch (err: any) {
    console.error("Error deleting budget:", err.message);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

export default router;