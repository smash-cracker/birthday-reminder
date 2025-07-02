// server.js
// ---------------------------------------------
// One‑file Express + PostgreSQL backend
// ---------------------------------------------
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
dotenv.config();

const { Pool } = pkg;

/* 1. PostgreSQL pool */
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'birthdays',
  port: process.env.PGPORT || 5432,
});

pool.on('connect', () => console.log('🗄️  Connected to PostgreSQL'));

/* 2. Express app & middleware */
const app = express();
app.use(cors({ origin: 'http://localhost:5173' })); // adjust if needed
app.use(express.json());

/* 3. Helper — keep only birthdays still to come this year */
const upcomingOnly = (rows) =>
  rows.filter(
    (b) => new Date(b.date).setFullYear(new Date().getFullYear()) >= Date.now()
  );

/* 4. Route handlers (CRUD) */
app.get('/api/birthdays', async (_, res) => {
  const { rows } = await pool.query('SELECT * FROM birthdays ORDER BY date');
  res.json(rows);
});

app.get('/api/birthdays/upcoming', async (_, res) => {
  const { rows } = await pool.query('SELECT * FROM birthdays ORDER BY date');
  res.json(upcomingOnly(rows));
});

app.post('/api/birthdays', async (req, res) => {
  const { name, date, message } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO birthdays (name, date, message)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, date, message]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/birthdays/:id', async (req, res) => {
  const { id } = req.params;
  const { name, date, message, status } = req.body;
  const { rows } = await pool.query(
    `UPDATE birthdays
       SET name=$1, date=$2, message=$3, status=$4
     WHERE id=$5 RETURNING *`,
    [name, date, message, status, id]
  );
  res.json(rows[0]);
});

app.delete('/api/birthdays/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM birthdays WHERE id=$1', [id]);
  res.status(204).send();
});

/* 5. Health check */
app.get('/', (_, res) => res.send('🎂 Birthday‑API is alive'));

/* 6. Spin up the server after DB is ready */
const PORT = process.env.PORT || 5000;
pool
  .connect()
  .then(() =>
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error('❌ Database connection failed →', err));