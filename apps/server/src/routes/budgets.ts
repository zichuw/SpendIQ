import { Router } from "express";
import { Pool } from "pg";
import { parseMonthToBounds, validateBudgetLines } from "../logic/budgets";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --------------------
// 1. Get all budgets for a user (with lines and category names)
// --------------------
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const budgetsRes = await pool.query(
      `SELECT id, user_id, period_start, period_end, total_budget_amount, created_at
       FROM budgets
       WHERE user_id = $1
       ORDER BY period_start DESC`,
      [user_id]
    );

    const budgets = budgetsRes.rows;

    const withLines = await Promise.all(
      budgets.map(async (b) => {
        const linesRes = await pool.query(
          `SELECT bl.id, bl.category_id, bl.planned_amount, c.name AS category_name, c.parent_id
           FROM budget_lines bl
           JOIN categories c ON c.id = bl.category_id
           WHERE bl.budget_id = $1`,
          [b.id]
        );
        return { ...b, lines: linesRes.rows };
      })
    );

    res.json(withLines);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching budgets:", message);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

// --------------------
// 2. Create a budget (header + lines)
// --------------------
router.post("/", async (req, res) => {
  const { user_id, period_start, period_end, total_budget_amount, lines } = req.body;

  if (!user_id || !period_start || !period_end) {
    return res.status(400).json({
      error: "Missing required fields: user_id, period_start, period_end (YYYY-MM-DD).",
    });
  }

  if (!validateBudgetLines(lines)) {
    return res.status(400).json({
      error: "lines must be an array of { category_id, planned_amount }.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const budgetRes = await client.query(
      `INSERT INTO budgets (user_id, period_start, period_end, total_budget_amount)
       VALUES ($1, $2::date, $3::date, $4)
       ON CONFLICT (user_id, period_start) DO UPDATE SET period_end = $3::date, total_budget_amount = $4
       RETURNING id, user_id, period_start, period_end, total_budget_amount, created_at`,
      [user_id, period_start, period_end, total_budget_amount ?? null]
    );
    const budget = budgetRes.rows[0];
    const budget_id = budget.id;

    for (const line of lines as Array<{ category_id: number; planned_amount: number }>) {
      await client.query(
        `INSERT INTO budget_lines (budget_id, category_id, planned_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (budget_id, category_id) DO UPDATE SET planned_amount = $3`,
        [budget_id, line.category_id, line.planned_amount]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(budget);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating budget:", message);
    res.status(500).json({ error: "Failed to create budget" });
  } finally {
    client.release();
  }
});

// --------------------
// 3. Update a budget (header and/or replace lines)
// PATCH body: totalBudgetAmount (camelCase) or period_start, period_end, total_budget_amount, lines (snake_case)
// --------------------
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    period_start,
    period_end,
    total_budget_amount,
    totalBudgetAmount,
    lines,
  } = req.body;

  const totalAmount =
    total_budget_amount !== undefined ? total_budget_amount : totalBudgetAmount;

  if (!period_start && !period_end && totalAmount === undefined && !lines) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (period_start || period_end || totalAmount !== undefined) {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (period_start) {
        updates.push(`period_start = $${idx++}::date`);
        values.push(period_start);
      }
      if (period_end) {
        updates.push(`period_end = $${idx++}::date`);
        values.push(period_end);
      }
      if (totalAmount !== undefined) {
        updates.push(`total_budget_amount = $${idx++}`);
        values.push(totalAmount);
      }
      values.push(id);
      await client.query(
        `UPDATE budgets SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id`,
        values
      );
    }

    if (Array.isArray(lines)) {
      if (!validateBudgetLines(lines)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "lines must be an array of { category_id, planned_amount }.",
        });
      }
      // Replace lines: delete existing, insert new
      await client.query("DELETE FROM budget_lines WHERE budget_id = $1", [id]);
      for (const line of lines as Array<{ category_id: number; planned_amount: number }>) {
        await client.query(
          `INSERT INTO budget_lines (budget_id, category_id, planned_amount) VALUES ($1, $2, $3)`,
          [id, line.category_id, line.planned_amount]
        );
      }
    }

    await client.query("COMMIT");

    const result = await pool.query(
      "SELECT id, user_id, period_start, period_end, total_budget_amount, created_at FROM budgets WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Budget not found" });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error updating budget:", message);
    res.status(500).json({ error: "Failed to update budget" });
  } finally {
    client.release();
  }
});

// --------------------
// 4. Delete a budget (cascade deletes budget_lines)
// --------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM budgets WHERE id = $1 RETURNING id", [id]);

    if (result.rowCount === 0) return res.status(404).json({ error: "Budget not found" });

    res.json({ message: "Budget deleted", id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error deleting budget:", message);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

export default router;
