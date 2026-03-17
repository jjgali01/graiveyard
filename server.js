const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- PostgreSQL setup (used on Render when DATABASE_URL is set) ---
let db = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  db.query(`
    CREATE TABLE IF NOT EXISTS memorials (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      image TEXT,
      flowers INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      x REAL,
      y REAL
    )
  `).catch(err => console.error('DB init error:', err));
}

// --- File-based fallback (local development) ---
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dataFile = path.join(dataDir, 'memorials.json');
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');

function readMemorialsFile() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeMemorialsFile(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function rowToMemorial(row) {
  return {
    id: row.id,
    text: row.text,
    image: row.image,
    flowers: row.flowers,
    createdAt: row.created_at,
    x: row.x,
    y: row.y
  };
}

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET all memorials (newest first so they appear on the left)
app.get('/api/memorials', async (req, res) => {
  try {
    if (db) {
      const result = await db.query('SELECT * FROM memorials ORDER BY created_at DESC');
      return res.json(result.rows.map(rowToMemorial));
    }
    const memorials = readMemorialsFile();
    memorials.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(memorials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load memorials' });
  }
});

// POST new memorial
app.post('/api/memorials', upload.single('image'), async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const memorial = {
    id: uuidv4(),
    text: text.trim().slice(0, 300),
    image: req.file ? `/uploads/${req.file.filename}` : null,
    flowers: 0,
    createdAt: new Date().toISOString(),
    x: Math.random() * 80 + 5,  // random % position 5-85%
    y: Math.random() * 22 + 70  // random % position 70-92% (on grass)
  };

  try {
    if (db) {
      await db.query(
        'INSERT INTO memorials (id, text, image, flowers, created_at, x, y) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [memorial.id, memorial.text, memorial.image, memorial.flowers, memorial.createdAt, memorial.x, memorial.y]
      );
      return res.json(memorial);
    }
    const memorials = readMemorialsFile();
    memorials.unshift(memorial);
    writeMemorialsFile(memorials);
    res.json(memorial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save memorial' });
  }
});

// POST lay flowers on a memorial
app.post('/api/memorials/:id/flowers', async (req, res) => {
  try {
    if (db) {
      const result = await db.query(
        'UPDATE memorials SET flowers = flowers + 1 WHERE id = $1 RETURNING flowers',
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({ flowers: result.rows[0].flowers });
    }
    const memorials = readMemorialsFile();
    const memorial = memorials.find(m => m.id === req.params.id);
    if (!memorial) return res.status(404).json({ error: 'Not found' });
    memorial.flowers = (memorial.flowers || 0) + 1;
    writeMemorialsFile(memorials);
    res.json({ flowers: memorial.flowers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update flowers' });
  }
});

app.listen(PORT, () => {
  console.log(`The Graiveyard running at http://localhost:${PORT}`);
  if (db) console.log('Using PostgreSQL for storage');
  else console.log('Using file-based storage (no DATABASE_URL set)');
});
