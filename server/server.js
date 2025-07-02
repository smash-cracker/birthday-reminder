// server/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

/* ---------- 1. DB pool ---------- */
const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'birthdays',
  port:     process.env.PGPORT     || 5432,
});
pool.on('connect', () => console.log('🗄️  PostgreSQL connected'));

/* ---------- 2. App ---------- */
const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

/* ---------- 3. Routes ---------- */

// GET all
app.get('/api/birthdays', async (_, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM birthdays ORDER BY date');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST new
app.post('/api/birthdays', async (req, res, next) => {
  try {
    const { name, date, message = null, status = 'Not Sent' } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO birthdays (name, date, message, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, date, message, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT update
app.put('/api/birthdays/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, date, message, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE birthdays
         SET name=$1, date=$2, message=$3, status=$4
       WHERE id=$5 RETURNING *`,
      [name, date, message, status, id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE
app.delete('/api/birthdays/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM birthdays WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

/* ---------- 4. Health ---------- */
app.get('/', (_, res) => res.send('🎂 Birthday‑API up'));

/* ---------- 5. Errors ---------- */
app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

/* ---------- 6. Start ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 API ready → http://localhost:${PORT}`)
);
