// server/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import os from 'os';
import path from 'path';

dotenv.config();
const { Pool } = pkg;

/* ---------- Helper to get Host LAN IP ---------- */
function getHostIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}
const lanIP = getHostIP();

/* ---------- 1. DB pool ---------- */
const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'birthdays',
  port:     process.env.PGPORT     || 5432,
});
pool.on('connect', () => console.log('🗄️  PostgreSQL connected'));

/* ---------- 2. App Setup ---------- */
const app = express();

app.use(cors({
  origin: [
    `http://${lanIP}:5173`,
    `http://${lanIP}:3000`,
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

/* ---------- 3. API Routes ---------- */

// GET all
app.get('/api/birthdays', async (_, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM birthdays ORDER BY date');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST new
app.post('/api/birthdays', async (req, res, next) => {
  try {
    const { name, date, email, status = 'Not Sent' } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO birthdays (name, date, email, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, date, email, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT update
app.put('/api/birthdays/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, date, email, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE birthdays
         SET name=$1, date=$2, email=$3, status=$4
       WHERE id=$5 RETURNING *`,
      [name, date, email, status, id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE
app.delete('/api/birthdays/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM birthdays WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ---------- 4. Health Check ---------- */
app.get('/', (_, res) => res.send('🎂 Birthday‑API up and running'));

/* ---------- 5. Error Handler ---------- */
app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ---------- 6. Start Server ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://${lanIP}:${PORT}`);
});
