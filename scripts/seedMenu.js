/**
 * Seed menu data — matches the static frontend menu exactly.
 * Run: node scripts/seedMenu.js
 * Drops existing menu items and re-seeds with the correct data.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

const SEED_ITEMS = [
  // ── Steam ──
  { id: 1,  name: 'Veg Momos',                       desc: 'Freshly steamed vegetable momos',   category: 'steam',   prices: [{ label: '5 Pcs', value: 30 }, { label: '10 Pcs', value: 50 }],  special: false, active: true },
  { id: 2,  name: 'Paneer Momos',                    desc: 'Soft paneer filling with spices',   category: 'steam',   prices: [{ label: '5 Pcs', value: 50 }, { label: '10 Pcs', value: 90 }],  special: false, active: true },
  { id: 3,  name: 'Soya Momos',                      desc: 'Protein-rich soya momos',           category: 'steam',   prices: [{ label: '5 Pcs', value: 30 }, { label: '10 Pcs', value: 50 }],  special: false, active: true },
  { id: 4,  name: 'Cheese Sweet Corn Momos',         desc: 'Cheesy corn delight',               category: 'steam',   prices: [{ label: '5 Pcs', value: 70 }, { label: '10 Pcs', value: 120 }], special: true,  active: true },

  // ── Fried ──
  { id: 5,  name: 'Veg Fried Momos',                 desc: 'Crispy golden fried momos',         category: 'fried',   prices: [{ label: '5 Pcs', value: 40 }, { label: '10 Pcs', value: 60 }],  special: false, active: true },
  { id: 6,  name: 'Paneer Fried Momos',              desc: 'Crunchy paneer momos',              category: 'fried',   prices: [{ label: '5 Pcs', value: 60 }, { label: '10 Pcs', value: 100 }], special: false, active: true },
  { id: 7,  name: 'Soya Fried Momos',                desc: 'Crispy soya momos',                 category: 'fried',   prices: [{ label: '5 Pcs', value: 40 }, { label: '10 Pcs', value: 60 }],  special: false, active: true },
  { id: 8,  name: 'Cheese Sweet Corn Fried Momos',   desc: 'Crispy cheese corn momos',          category: 'fried',   prices: [{ label: '5 Pcs', value: 80 }, { label: '10 Pcs', value: 140 }], special: true,  active: true },

  // ── Gravy ──
  { id: 9,  name: 'Veg Gravy Momos',                 desc: 'Momos in spicy gravy',              category: 'gravy',   prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }],   special: false, active: true },
  { id: 10, name: 'Paneer Gravy Momos',              desc: 'Paneer momos in rich gravy',        category: 'gravy',   prices: [{ label: '5 Pcs', value: 70 }, { label: '8 Pcs', value: 100 }],  special: false, active: true },
  { id: 11, name: 'Soya Gravy Momos',                desc: 'Soya momos in tasty gravy',         category: 'gravy',   prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }],   special: false, active: true },
  { id: 12, name: 'Cheese Sweet Corn Gravy Momos',   desc: 'Cheese corn momos in gravy',        category: 'gravy',   prices: [{ label: '5 Pcs', value: 90 }, { label: '8 Pcs', value: 140 }],  special: true,  active: true },

  // ── Kurkure ──
  { id: 13, name: 'Veg Kurkure Momos',               desc: 'Extra crispy kurkure style',        category: 'kurkure', prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }],   special: false, active: true },
  { id: 14, name: 'Paneer Kurkure Momos',            desc: 'Paneer kurkure special',            category: 'kurkure', prices: [{ label: '5 Pcs', value: 70 }, { label: '8 Pcs', value: 100 }],  special: false, active: true },
  { id: 15, name: 'Soya Kurkure Momos',              desc: 'Soya kurkure delight',              category: 'kurkure', prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }],   special: false, active: true },
  { id: 16, name: 'Cheese Sweet Corn Kurkure Momos', desc: 'Ultimate kurkure experience',       category: 'kurkure', prices: [{ label: '5 Pcs', value: 90 }, { label: '8 Pcs', value: 140 }],  special: true,  active: true },

  // ── Noodles ──
  { id: 17, name: 'Veg Noodles',                     desc: 'Classic veg noodles',               category: 'noodles', prices: [{ label: 'Half', value: 40 }, { label: 'Full', value: 70 }],      special: false, active: true },
  { id: 18, name: 'Hakka Noodles',                   desc: 'Authentic hakka style',             category: 'noodles', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 100 }],     special: false, active: true },
  { id: 19, name: 'Chilli Garlic Noodles',           desc: 'Spicy garlic flavor',               category: 'noodles', prices: [{ label: 'Half', value: 60 }, { label: 'Full', value: 90 }],      special: false, active: true },
  { id: 20, name: 'Malaysian Noodles',               desc: 'Exotic Malaysian style',            category: 'noodles', prices: [{ label: 'Half', value: 90 }, { label: 'Full', value: 140 }],     special: true,  active: true },
  { id: 21, name: 'Schezwan Noodles',                desc: 'Hot & spicy schezwan',              category: 'noodles', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 100 }],     special: false, active: true },
  { id: 22, name: 'Butter Garlic Noodles',           desc: 'Buttery garlic goodness',           category: 'noodles', prices: [{ label: 'Half', value: 80 }, { label: 'Full', value: 120 }],     special: false, active: true },
  { id: 23, name: 'Singapuri Noodles',               desc: 'Singapore special',                 category: 'noodles', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 100 }],     special: false, active: true },
  { id: 24, name: 'Hongkong Noodles',                desc: 'Premium Hongkong style',            category: 'noodles', prices: [{ label: 'Half', value: 100 }, { label: 'Full', value: 150 }],    special: true,  active: true },

  // ── Potato ──
  { id: 25, name: 'French Fry',                      desc: 'Crispy golden fries',               category: 'potato',  prices: [{ label: 'Half', value: 30 }, { label: 'Full', value: 60 }],     special: false, active: true },
  { id: 26, name: 'Honey Chilli Potato',             desc: 'Sweet & spicy combo',               category: 'potato',  prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 120 }],    special: true,  active: true },
  { id: 27, name: 'Chilli Potato',                   desc: 'Spicy potato bites',                category: 'potato',  prices: [{ label: 'Half', value: 50 }, { label: 'Full', value: 90 }],     special: false, active: true },
  { id: 28, name: 'Schezwan Chilli Potato',          desc: 'Schezwan spicy potato',             category: 'potato',  prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 120 }],    special: false, active: true },

  // ── Rolls ──
  { id: 29, name: 'Veg Roll',                        desc: 'Fresh veg wrap',                    category: 'rolls',   prices: [{ label: '1 Pc', value: 30 }, { label: '2 Pcs', value: 60 }],    special: false, active: true },
  { id: 30, name: 'Chowmein Spring Roll',            desc: 'Noodles in a roll',                 category: 'rolls',   prices: [{ label: '1 Pc', value: 30 }, { label: '2 Pcs', value: 50 }],    special: false, active: true },
  { id: 31, name: 'Veg Paneer Roll',                 desc: 'Paneer wrap delight',               category: 'rolls',   prices: [{ label: '1 Pc', value: 60 }, { label: '2 Pcs', value: 110 }],   special: false, active: true },
  { id: 32, name: 'Kathi Roll',                      desc: 'Authentic kathi roll',              category: 'rolls',   prices: [{ label: '1 Pc', value: 60 }, { label: '2 Pcs', value: 120 }],   special: false, active: true },
  { id: 33, name: 'Today Spl. Roll',                 desc: "Chef's special of the day",         category: 'rolls',   prices: [{ label: '1 Pc', value: 70 }],                                   special: true,  active: true },
  { id: 34, name: 'Veg Kurkure Roll',                desc: 'Crispy veg roll',                   category: 'rolls',   prices: [{ label: '1 Pc', value: 50 }, { label: '2 Pcs', value: 80 }],    special: false, active: true },
  { id: 35, name: 'Chowmin Kurkure Roll',            desc: 'Crispy noodle roll',                category: 'rolls',   prices: [{ label: '1 Pc', value: 40 }, { label: '2 Pcs', value: 70 }],    special: false, active: true },
  { id: 36, name: 'Paneer Kurkure Roll',             desc: 'Crispy paneer roll',                category: 'rolls',   prices: [{ label: '1 Pc', value: 60 }, { label: '2 Pcs', value: 100 }],   special: false, active: true },

  // ── Chilli ──
  { id: 37, name: 'Veg Chilli Momos',                desc: 'Momos in chilli sauce',             category: 'chilli',  prices: [{ label: '5 Pcs', value: 50 }, { label: '10 Pcs', value: 90 }],  special: false, active: true },
  { id: 38, name: 'Veg Soya Chilli Momos',           desc: 'Soya in chilli sauce',              category: 'chilli',  prices: [{ label: '5 Pcs', value: 50 }, { label: '10 Pcs', value: 90 }],  special: false, active: true },
  { id: 39, name: 'Paneer Chilli Momos',             desc: 'Paneer chilli fusion',              category: 'chilli',  prices: [{ label: '5 Pcs', value: 70 }, { label: '10 Pcs', value: 120 }], special: false, active: true },

  // ── Main ──
  { id: 40, name: 'Veg Fried Rice',                  desc: 'Classic fried rice',                category: 'main',    prices: [{ label: 'Half', value: 50 }, { label: 'Full', value: 80 }],     special: false, active: true },
  { id: 41, name: 'Paneer Fried Rice',               desc: 'Paneer fried rice',                 category: 'main',    prices: [{ label: 'Half', value: 60 }, { label: 'Full', value: 100 }],    special: false, active: true },
  { id: 42, name: 'Singapuri Fried Rice',            desc: 'Singapore style rice',              category: 'main',    prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 120 }],    special: false, active: true },
  { id: 43, name: 'Veg Manchurian',                  desc: 'Veg balls in manchurian sauce',     category: 'main',    prices: [{ label: 'Half', value: 50 }, { label: 'Full', value: 90 }],     special: false, active: true },
  { id: 44, name: 'Paneer Manchurian',               desc: 'Paneer in manchurian sauce',        category: 'main',    prices: [{ label: 'Half', value: 80 }, { label: 'Full', value: 140 }],    special: true,  active: true },
  { id: 45, name: 'Paneer Chilli',                   desc: 'Spicy paneer dish',                 category: 'main',    prices: [{ label: 'Half', value: 80 }, { label: 'Full', value: 140 }],    special: true,  active: true },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    await MenuItem.deleteMany({});
    await MenuItem.insertMany(SEED_ITEMS);
    console.log(`Seeded ${SEED_ITEMS.length} menu items.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
