import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import plaidRoutes from './routes/plaid';
import budgetRoutes from "./routes/budgets";

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT NOW()")
  .then(res => console.log("Postgres connected:", res.rows))
  .catch(err => console.error("Postgres connection error:", err));

const app = express();
app.use(cors());
app.use(express.json());

app.use('/plaid', plaidRoutes);
app.use("/budgets", budgetRoutes);

app.get('/', (_, res) => res.send('Spendiq backend running'));

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});