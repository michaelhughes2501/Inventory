'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// Static files (before rate limiter so assets are never counted against the limit)
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting (applies to API routes only)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use(limiter);

// ---- In-memory data store ----

const CATEGORIES = [
  'Housing Supplies',
  'Food & Hygiene',
  'Clothing',
  'Electronics',
  'Legal Documents',
  'Employment',
  'Medical',
  'Other',
];

let idCounter = 13;

function newId() {
  return idCounter++;
}

function now() {
  return new Date().toISOString();
}

let items = [
  {
    id: 1,
    name: 'Toothbrushes',
    category: 'Food & Hygiene',
    quantity: 48,
    unit: 'each',
    location: 'Storage Room A',
    notes: 'Standard adult size, soft bristle',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 2,
    name: 'Toothpaste (travel size)',
    category: 'Food & Hygiene',
    quantity: 36,
    unit: 'each',
    location: 'Storage Room A',
    notes: 'Mint flavor',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 3,
    name: "Men's T-Shirts (M/L)",
    category: 'Clothing',
    quantity: 22,
    unit: 'each',
    location: 'Closet B',
    notes: 'Assorted colors, medium and large sizes',
    createdAt: '2026-05-02T09:00:00.000Z',
    updatedAt: '2026-05-02T09:00:00.000Z',
  },
  {
    id: 4,
    name: "Men's Jeans (32x30)",
    category: 'Clothing',
    quantity: 4,
    unit: 'each',
    location: 'Closet B',
    notes: 'Running low — please reorder',
    createdAt: '2026-05-02T09:00:00.000Z',
    updatedAt: '2026-06-10T14:30:00.000Z',
  },
  {
    id: 5,
    name: 'Sleeping Bags',
    category: 'Housing Supplies',
    quantity: 10,
    unit: 'each',
    location: 'Storage Room C',
    notes: 'Rated for 40°F',
    createdAt: '2026-05-03T11:00:00.000Z',
    updatedAt: '2026-05-03T11:00:00.000Z',
  },
  {
    id: 6,
    name: 'Disposable Razors',
    category: 'Food & Hygiene',
    quantity: 60,
    unit: 'each',
    location: 'Storage Room A',
    notes: '5-pack sets',
    createdAt: '2026-05-05T08:00:00.000Z',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 7,
    name: 'USB Phone Chargers',
    category: 'Electronics',
    quantity: 3,
    unit: 'each',
    location: 'Office Desk',
    notes: 'USB-A to USB-C; check condition before distributing',
    createdAt: '2026-05-06T13:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
  },
  {
    id: 8,
    name: 'Resume Paper (100-sheet)',
    category: 'Employment',
    quantity: 5,
    unit: 'pack',
    location: 'Office Cabinet',
    notes: '24 lb bright white, printer-ready',
    createdAt: '2026-05-08T10:00:00.000Z',
    updatedAt: '2026-05-08T10:00:00.000Z',
  },
  {
    id: 9,
    name: 'State ID Application Packets',
    category: 'Legal Documents',
    quantity: 2,
    unit: 'each',
    location: 'Filing Cabinet',
    notes: 'Includes instructions and fee waiver form',
    createdAt: '2026-05-10T15:00:00.000Z',
    updatedAt: '2026-06-14T10:00:00.000Z',
  },
  {
    id: 10,
    name: 'Ibuprofen 200mg (50-count)',
    category: 'Medical',
    quantity: 8,
    unit: 'bottle',
    location: 'First Aid Cabinet',
    notes: 'Check expiration dates monthly',
    createdAt: '2026-05-12T12:00:00.000Z',
    updatedAt: '2026-05-12T12:00:00.000Z',
  },
  {
    id: 11,
    name: 'Bus Passes (30-day)',
    category: 'Other',
    quantity: 6,
    unit: 'each',
    location: 'Safe',
    notes: 'Downtown Metro; requires supervisor sign-off to distribute',
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 12,
    name: 'Pillow Cases',
    category: 'Housing Supplies',
    quantity: 18,
    unit: 'each',
    location: 'Storage Room C',
    notes: 'Standard size, white cotton',
    createdAt: '2026-05-20T11:00:00.000Z',
    updatedAt: '2026-05-20T11:00:00.000Z',
  },
];

// ---- API routes ----

// Health check — exempt from heavy rate limiting
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: now() });
});

// GET /api/categories
app.get('/api/categories', (_req, res) => {
  res.json(CATEGORIES);
});

// GET /api/items
app.get('/api/items', (req, res) => {
  const { category, search, lowStock } = req.query;

  let result = [...items];

  if (category && CATEGORIES.includes(category)) {
    result = result.filter((i) => i.category === category);
  }

  if (typeof search === 'string' && search) {
    const q = search.toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q)) ||
        (i.location && i.location.toLowerCase().includes(q))
    );
  }

  if (lowStock === 'true') {
    result = result.filter((i) => i.quantity < 5);
  }

  res.json(result);
});

// POST /api/items
app.post('/api/items', (req, res) => {
  const { name, category, quantity, unit, location, notes } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!category || !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'valid category is required' });
  }
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 0) {
    return res.status(400).json({ error: 'quantity must be a non-negative number' });
  }

  const item = {
    id: newId(),
    name: name.trim(),
    category,
    quantity: qty,
    unit: (unit || 'each').trim(),
    location: (location || '').trim(),
    notes: (notes || '').trim(),
    createdAt: now(),
    updatedAt: now(),
  };

  items.push(item);
  res.status(201).json(item);
});

// PUT /api/items/:id
app.put('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'item not found' });
  }

  const { name, category, quantity, unit, location, notes } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name must be a non-empty string' });
    }
    items[idx].name = name.trim();
  }
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'invalid category' });
    }
    items[idx].category = category;
  }
  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative number' });
    }
    items[idx].quantity = qty;
  }
  if (unit !== undefined) items[idx].unit = String(unit).trim();
  if (location !== undefined) items[idx].location = String(location).trim();
  if (notes !== undefined) items[idx].notes = String(notes).trim();

  items[idx].updatedAt = now();
  res.json(items[idx]);
});

// DELETE /api/items/:id
app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'item not found' });
  }
  items.splice(idx, 1);
  res.status(204).end();
});

// SPA fallback
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Inventory server running on http://localhost:${PORT}`);
});
