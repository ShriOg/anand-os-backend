/**
 * TEMP DEV MODE — Seed menu data
 * Run: node scripts/seedMenu.js
 * Inserts initial menu items if the collection is empty.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

const SEED_ITEMS = [
  // ── Starters ──
  {
    name: 'Paneer Tikka',
    category: 'Starters',
    prices: [
      { label: 'Half', value: 180 },
      { label: 'Full', value: 320 }
    ],
    special: true,
    active: true
  },
  {
    name: 'Veg Spring Roll',
    category: 'Starters',
    prices: [
      { label: 'Half', value: 120 },
      { label: 'Full', value: 200 }
    ],
    special: false,
    active: true
  },
  {
    name: 'Chicken Tikka',
    category: 'Starters',
    prices: [
      { label: 'Half', value: 220 },
      { label: 'Full', value: 400 }
    ],
    special: false,
    active: true
  },

  // ── Main Course ──
  {
    name: 'Butter Chicken',
    category: 'Main Course',
    prices: [
      { label: 'Half', value: 280 },
      { label: 'Full', value: 480 }
    ],
    special: true,
    active: true
  },
  {
    name: 'Dal Makhani',
    category: 'Main Course',
    prices: [
      { label: 'Half', value: 180 },
      { label: 'Full', value: 300 }
    ],
    special: false,
    active: true
  },
  {
    name: 'Palak Paneer',
    category: 'Main Course',
    prices: [
      { label: 'Half', value: 200 },
      { label: 'Full', value: 350 }
    ],
    special: false,
    active: true
  },

  // ── Breads ──
  {
    name: 'Butter Naan',
    category: 'Breads',
    prices: [{ label: 'Regular', value: 50 }],
    special: false,
    active: true
  },
  {
    name: 'Garlic Naan',
    category: 'Breads',
    prices: [{ label: 'Regular', value: 60 }],
    special: false,
    active: true
  },
  {
    name: 'Tandoori Roti',
    category: 'Breads',
    prices: [{ label: 'Regular', value: 30 }],
    special: false,
    active: true
  },

  // ── Rice ──
  {
    name: 'Veg Biryani',
    category: 'Rice',
    prices: [
      { label: 'Half', value: 180 },
      { label: 'Full', value: 320 }
    ],
    special: false,
    active: true
  },
  {
    name: 'Chicken Biryani',
    category: 'Rice',
    prices: [
      { label: 'Half', value: 220 },
      { label: 'Full', value: 400 }
    ],
    special: true,
    active: true
  },
  {
    name: 'Jeera Rice',
    category: 'Rice',
    prices: [
      { label: 'Half', value: 100 },
      { label: 'Full', value: 180 }
    ],
    special: false,
    active: true
  },

  // ── Beverages ──
  {
    name: 'Masala Chai',
    category: 'Beverages',
    prices: [{ label: 'Regular', value: 40 }],
    special: false,
    active: true
  },
  {
    name: 'Cold Coffee',
    category: 'Beverages',
    prices: [
      { label: 'Regular', value: 80 },
      { label: 'Large', value: 120 }
    ],
    special: false,
    active: true
  },
  {
    name: 'Mango Lassi',
    category: 'Beverages',
    prices: [{ label: 'Regular', value: 70 }],
    special: true,
    active: true
  },

  // ── Desserts ──
  {
    name: 'Gulab Jamun',
    category: 'Desserts',
    prices: [
      { label: 'Half', value: 80 },
      { label: 'Full', value: 140 }
    ],
    special: false,
    active: true
  },
  {
    name: 'Rasgulla',
    category: 'Desserts',
    prices: [
      { label: 'Half', value: 70 },
      { label: 'Full', value: 120 }
    ],
    special: false,
    active: true
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const count = await MenuItem.countDocuments();
    if (count > 0) {
      console.log(`Menu already has ${count} items — skipping seed.`);
      process.exit(0);
    }

    await MenuItem.insertMany(SEED_ITEMS);
    console.log(`Seeded ${SEED_ITEMS.length} menu items.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
