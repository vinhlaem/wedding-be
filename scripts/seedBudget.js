const Budget = require("../models/Budget");

const DEFAULT_BUDGETS = [
  // ── Đám hỏi ──────────────────────────────────────────────────────────────
  {
    category: "dam-hoi",
    itemName: "Tráp hỏi",
    estimatedCost: 8_500_000,
    depositPaid: 0,
    remainingCost: 8_500_000,
    address: "",
    phone: "",
    note: "heo quay + lễ Quảng Trị",
    status: "chua-coc",
  },
  {
    category: "dam-hoi",
    itemName: "Xe di chuyển",
    estimatedCost: 5_500_000,
    depositPaid: 0,
    remainingCost: 5_500_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-hoi",
    itemName: "Áo dài dâu rể",
    estimatedCost: 2_000_000,
    depositPaid: 0,
    remainingCost: 2_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-hoi",
    itemName: "Nhẫn cưới",
    estimatedCost: 15_000_000,
    depositPaid: 0,
    remainingCost: 15_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-hoi",
    itemName: "Đội bưng lễ",
    estimatedCost: 1_500_000,
    depositPaid: 0,
    remainingCost: 1_500_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-hoi",
    itemName: "Chụp hình lễ hỏi",
    estimatedCost: 3_000_000,
    depositPaid: 0,
    remainingCost: 3_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  // ── Đám cưới ─────────────────────────────────────────────────────────────
  {
    category: "dam-cuoi",
    itemName: "Studio cưới + váy + vest",
    estimatedCost: 13_000_000,
    depositPaid: 0,
    remainingCost: 13_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Tráp cưới",
    estimatedCost: 8_500_000,
    depositPaid: 0,
    remainingCost: 8_500_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Xe di chuyển",
    estimatedCost: 6_000_000,
    depositPaid: 0,
    remainingCost: 6_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Khách sạn nhà gái",
    estimatedCost: 3_500_000,
    depositPaid: 0,
    remainingCost: 3_500_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Xe rước dâu",
    estimatedCost: 3_000_000,
    depositPaid: 0,
    remainingCost: 3_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Decor gia tiên",
    estimatedCost: 4_000_000,
    depositPaid: 0,
    remainingCost: 4_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Bàn trang điểm",
    estimatedCost: 2_500_000,
    depositPaid: 0,
    remainingCost: 2_500_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Nệm",
    estimatedCost: 5_000_000,
    depositPaid: 0,
    remainingCost: 5_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Chăn ga gối",
    estimatedCost: 2_000_000,
    depositPaid: 0,
    remainingCost: 2_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Tủ quần áo",
    estimatedCost: 5_000_000,
    depositPaid: 0,
    remainingCost: 5_000_000,
    address: "",
    phone: "",
    note: "",
    status: "chua-coc",
  },
  {
    category: "dam-cuoi",
    itemName: "Điều hòa",
    estimatedCost: 8_000_000,
    depositPaid: 0,
    remainingCost: 8_000_000,
    address: "",
    phone: "",
    note: "mua sau",
    status: "chua-coc",
  },
];

/**
 * Idempotent seed: inserts defaults only if the collection is empty.
 * Safe to call on every startup.
 */
const seedBudgets = async () => {
  try {
    const count = await Budget.countDocuments();
    if (count > 0) {
      console.log(`[seed] Budget collection already has ${count} items — skipping seed.`);
      return;
    }
    await Budget.insertMany(DEFAULT_BUDGETS);
    console.log(`[seed] Inserted ${DEFAULT_BUDGETS.length} default budget items.`);
  } catch (err) {
    console.error("[seed] Budget seed failed:", err.message);
  }
};

module.exports = { seedBudgets };
