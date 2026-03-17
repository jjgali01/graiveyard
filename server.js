const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data and uploads directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dataFile = path.join(dataDir, 'memorials.json');
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');

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

function readMemorials() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeMemorials(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// GET all memorials (newest first so they appear on the left)
app.get('/api/memorials', (req, res) => {
  const memorials = readMemorials();
  memorials.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(memorials);
});

// POST new memorial
app.post('/api/memorials', upload.single('image'), (req, res) => {
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

  const memorials = readMemorials();
  memorials.unshift(memorial);
  writeMemorials(memorials);

  res.json(memorial);
});

// POST lay flowers on a memorial
app.post('/api/memorials/:id/flowers', (req, res) => {
  const memorials = readMemorials();
  const memorial = memorials.find(m => m.id === req.params.id);
  if (!memorial) return res.status(404).json({ error: 'Not found' });

  memorial.flowers = (memorial.flowers || 0) + 1;
  writeMemorials(memorials);
  res.json({ flowers: memorial.flowers });
});

app.listen(PORT, () => {
  console.log(`The Graiveyard running at http://localhost:${PORT}`);
});
