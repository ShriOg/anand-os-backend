const MenuItem = require('../models/MenuItem');

const MENU_ITEMS = [
  // ── Steam ──
  { name: 'Veg Momos', category: 'steam', prices: [{ label: '5 Pcs', value: 30 }, { label: '10 Pcs', value: 50 }], special: false, active: true },
  { name: 'Paneer Momos', category: 'steam', prices: [{ label: '5 Pcs', value: 50 }, { label: '10 Pcs', value: 90 }], special: false, active: true },
  { name: 'Soya Momos', category: 'steam', prices: [{ label: '5 Pcs', value: 30 }, { label: '10 Pcs', value: 50 }], special: false, active: true },
  { name: 'Cheese Sweet Corn Momos', category: 'steam', prices: [{ label: '5 Pcs', value: 70 }, { label: '10 Pcs', value: 120 }], special: true, active: true },

  // ── Fried ──
  { name: 'Veg Fried Momos', category: 'fried', prices: [{ label: '5 Pcs', value: 40 }, { label: '10 Pcs', value: 60 }], special: false, active: true },
  { name: 'Paneer Fried Momos', category: 'fried', prices: [{ label: '5 Pcs', value: 60 }, { label: '10 Pcs', value: 100 }], special: false, active: true },
  { name: 'Soya Fried Momos', category: 'fried', prices: [{ label: '5 Pcs', value: 40 }, { label: '10 Pcs', value: 60 }], special: false, active: true },
  { name: 'Cheese Sweet Corn Fried Momos', category: 'fried', prices: [{ label: '5 Pcs', value: 80 }, { label: '10 Pcs', value: 140 }], special: true, active: true },

  // ── Gravy ──
  { name: 'Veg Gravy Momos', category: 'gravy', prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }], special: false, active: true },
  { name: 'Paneer Gravy Momos', category: 'gravy', prices: [{ label: '5 Pcs', value: 70 }, { label: '8 Pcs', value: 100 }], special: false, active: true },
  { name: 'Soya Gravy Momos', category: 'gravy', prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }], special: false, active: true },
  { name: 'Cheese Sweet Corn Gravy Momos', category: 'gravy', prices: [{ label: '5 Pcs', value: 90 }, { label: '8 Pcs', value: 140 }], special: true, active: true },

  // ── Kurkure ──
  { name: 'Veg Kurkure Momos', category: 'kurkure', prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }], special: false, active: true },
  { name: 'Paneer Kurkure Momos', category: 'kurkure', prices: [{ label: '5 Pcs', value: 70 }, { label: '8 Pcs', value: 100 }], special: false, active: true },
  { name: 'Soya Kurkure Momos', category: 'kurkure', prices: [{ label: '5 Pcs', value: 50 }, { label: '8 Pcs', value: 70 }], special: false, active: true },
  { name: 'Cheese Sweet Corn Kurkure Momos', category: 'kurkure', prices: [{ label: '5 Pcs', value: 90 }, { label: '8 Pcs', value: 140 }], special: true, active: true },

  // ── Noodles ──
  { name: 'Veg Noodles', category: 'noodles', prices: [{ label: 'Half', value: 40 }, { label: 'Full', value: 70 }], special: false, active: true },
  { name: 'Hakka Noodles', category: 'noodles', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 100 }], special: false, active: true },
  { name: 'Chilli Garlic Noodles', category: 'noodles', prices: [{ label: 'Half', value: 60 }, { label: 'Full', value: 90 }], special: false, active: true },
  { name: 'Malaysian Noodles', category: 'noodles', prices: [{ label: 'Half', value: 90 }, { label: 'Full', value: 140 }], special: true, active: true },
  { name: 'Schezwan Noodles', category: 'noodles', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 100 }], special: false, active: true },
  { name: 'Butter Garlic Noodles', category: 'noodles', prices: [{ label: 'Half', value: 80 }, { label: 'Full', value: 120 }], special: false, active: true },
  { name: 'Singapuri Noodles', category: 'noodles', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 100 }], special: false, active: true },
  { name: 'Hongkong Noodles', category: 'noodles', prices: [{ label: 'Half', value: 100 }, { label: 'Full', value: 150 }], special: true, active: true },

  // ── Potato ──
  { name: 'French Fry', category: 'potato', prices: [{ label: 'Half', value: 30 }, { label: 'Full', value: 60 }], special: false, active: true },
  { name: 'Honey Chilli Potato', category: 'potato', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 120 }], special: true, active: true },
  { name: 'Chilli Potato', category: 'potato', prices: [{ label: 'Half', value: 50 }, { label: 'Full', value: 90 }], special: false, active: true },
  { name: 'Schezwan Chilli Potato', category: 'potato', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 120 }], special: false, active: true },

  // ── Rolls ──
  { name: 'Veg Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 30 }, { label: '2 Pcs', value: 60 }], special: false, active: true },
  { name: 'Chowmein Spring Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 30 }, { label: '2 Pcs', value: 50 }], special: false, active: true },
  { name: 'Veg Paneer Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 60 }, { label: '2 Pcs', value: 110 }], special: false, active: true },
  { name: 'Kathi Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 60 }, { label: '2 Pcs', value: 120 }], special: false, active: true },
  { name: 'Today Spl. Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 70 }], special: true, active: true },
  { name: 'Veg Kurkure Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 50 }, { label: '2 Pcs', value: 80 }], special: false, active: true },
  { name: 'Chowmin Kurkure Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 40 }, { label: '2 Pcs', value: 70 }], special: false, active: true },
  { name: 'Paneer Kurkure Roll', category: 'rolls', prices: [{ label: '1 Pc', value: 60 }, { label: '2 Pcs', value: 100 }], special: false, active: true },

  // ── Chilli ──
  { name: 'Veg Chilli Momos', category: 'chilli', prices: [{ label: '5 Pcs', value: 50 }, { label: '10 Pcs', value: 90 }], special: false, active: true },
  { name: 'Veg Soya Chilli Momos', category: 'chilli', prices: [{ label: '5 Pcs', value: 50 }, { label: '10 Pcs', value: 90 }], special: false, active: true },
  { name: 'Paneer Chilli Momos', category: 'chilli', prices: [{ label: '5 Pcs', value: 70 }, { label: '10 Pcs', value: 120 }], special: false, active: true },

  // ── Main ──
  { name: 'Veg Fried Rice', category: 'main', prices: [{ label: 'Half', value: 50 }, { label: 'Full', value: 80 }], special: false, active: true },
  { name: 'Paneer Fried Rice', category: 'main', prices: [{ label: 'Half', value: 60 }, { label: 'Full', value: 100 }], special: false, active: true },
  { name: 'Singapuri Fried Rice', category: 'main', prices: [{ label: 'Half', value: 70 }, { label: 'Full', value: 120 }], special: false, active: true },
  { name: 'Veg Manchurian', category: 'main', prices: [{ label: 'Half', value: 50 }, { label: 'Full', value: 90 }], special: false, active: true },
  { name: 'Paneer Manchurian', category: 'main', prices: [{ label: 'Half', value: 80 }, { label: 'Full', value: 140 }], special: true, active: true },
  { name: 'Paneer Chilli', category: 'main', prices: [{ label: 'Half', value: 80 }, { label: 'Full', value: 140 }], special: true, active: true }
];

async function autoSeedMenu() {
  try {
    const count = await MenuItem.countDocuments();
    if (count > 0) {
      console.log(`[MenuSeed] Menu already has ${count} items — skipping seed.`);
      return;
    }

    await MenuItem.insertMany(MENU_ITEMS);
    console.log(`[MenuSeed] Seeded ${MENU_ITEMS.length} menu items.`);
  } catch (err) {
    console.error('[MenuSeed] Auto-seed failed:', err.message);
  }
}

module.exports = autoSeedMenu;
