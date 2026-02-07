import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import plaidRoutes from "./routes/plaid";
import budgetRoutes from "./routes/budgets";
import insightsRoutes from "./routes/insights";
import homeRoutes from "./routes/home";
import transactionRoutes from "./routes/transactions";
import categoryRoutes from "./routes/categories";
import userSettingsRoutes from "./routes/user-settings";
import syncRoutes from "./routes/sync";

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT NOW()")
  .then(res => console.log("Postgres connected:", res.rows))
  .catch(err => console.error("Postgres connection error:", err));

const app = express();
app.use(cors());
app.use(express.json());

app.use("/insights", insightsRoutes);
app.use("/plaid", plaidRoutes);
app.use("/budgets", budgetRoutes);
app.use("/api/v1/budgets", budgetRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/home", homeRoutes);
app.use("/api/v1/user-settings", userSettingsRoutes);
app.use("/api/v1/sync", syncRoutes);

app.get('/', (_, res) => res.send('Spendiq backend running'));

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});