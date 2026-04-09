const Budget = require("../models/Budget");

const VALID_CATEGORIES = ["dam-hoi", "dam-cuoi"];
const VALID_STATUSES = ["chua-coc", "da-coc-mot-phan", "hoan-thanh"];

const BUDGET_PROJECTION = {
  category: 1,
  itemName: 1,
  estimatedCost: 1,
  depositPaid: 1,
  remainingCost: 1,
  address: 1,
  phone: 1,
  note: 1,
  status: 1,
  createdAt: 1,
  updatedAt: 1,
};

const getBudgets = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category && VALID_CATEGORIES.includes(category)) {
      filter.category = category;
    }
    const budgets = await Budget.find(filter, BUDGET_PROJECTION)
      .sort({ createdAt: 1 })
      .lean();
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.status(200).json({ success: true, data: budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBudget = async (req, res) => {
  try {
    const {
      category,
      itemName,
      estimatedCost,
      depositPaid,
      address,
      phone,
      note,
      status,
    } = req.body || {};

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }
    if (!itemName || typeof itemName !== "string" || itemName.trim().length === 0) {
      return res.status(400).json({ success: false, message: "itemName is required" });
    }
    if (estimatedCost == null || Number(estimatedCost) < 0) {
      return res.status(400).json({ success: false, message: "Invalid estimatedCost" });
    }

    const estNum = Number(estimatedCost);
    const depNum = depositPaid != null ? Number(depositPaid) : 0;

    const budget = await Budget.create({
      category,
      itemName: itemName.trim(),
      estimatedCost: estNum,
      depositPaid: depNum,
      remainingCost: estNum - depNum,
      address: address || "",
      phone: phone || "",
      note: note || "",
      status: status && VALID_STATUSES.includes(status) ? status : "chua-coc",
    });

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    if (payload.estimatedCost != null) {
      payload.estimatedCost = Number(payload.estimatedCost);
      if (payload.estimatedCost < 0) {
        return res.status(400).json({ success: false, message: "Invalid estimatedCost" });
      }
    }
    if (payload.depositPaid != null) {
      payload.depositPaid = Number(payload.depositPaid);
      if (payload.depositPaid < 0) {
        return res.status(400).json({ success: false, message: "Invalid depositPaid" });
      }
    }
    if (payload.itemName != null) {
      payload.itemName = String(payload.itemName).trim();
    }
    if (payload.status && !VALID_STATUSES.includes(payload.status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // Re-compute remainingCost if either cost field changed
    const existing = await Budget.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Budget item not found" });
    }
    const estNum =
      payload.estimatedCost != null ? payload.estimatedCost : existing.estimatedCost;
    const depNum =
      payload.depositPaid != null ? payload.depositPaid : existing.depositPaid;
    payload.remainingCost = estNum - depNum;

    const budget = await Budget.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id);
    if (!budget) {
      return res.status(404).json({ success: false, message: "Budget item not found" });
    }
    await budget.deleteOne();
    res.status(200).json({ success: true, message: "Budget item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};

const BUDGET_PROJECTION = {
  category: 1,
  name: 1,
  estimatedCost: 1,
  deposit: 1,
  address: 1,
  phone: 1,
  note: 1,
  status: 1,
  createdAt: 1,
  updatedAt: 1,
};

const getBudgets = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category && VALID_CATEGORIES.includes(category)) {
      filter.category = category;
    }
    const budgets = await Budget.find(filter, BUDGET_PROJECTION)
      .sort({ createdAt: 1 })
      .lean();
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.status(200).json({ success: true, data: budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBudget = async (req, res) => {
  try {
    const {
      category,
      name,
      estimatedCost,
      deposit,
      address,
      phone,
      note,
      status,
    } = req.body || {};

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }
    if (estimatedCost == null || Number(estimatedCost) < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid estimated cost" });
    }

    const budget = await Budget.create({
      category,
      name: name.trim(),
      estimatedCost: Number(estimatedCost),
      deposit: deposit != null ? Number(deposit) : 0,
      address: address || "",
      phone: phone || "",
      note: note || "",
      status: status || "Chưa cọc",
    });

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    // Sanitize numeric fields
    if (payload.estimatedCost != null) {
      payload.estimatedCost = Number(payload.estimatedCost);
      if (payload.estimatedCost < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid estimated cost" });
      }
    }
    if (payload.deposit != null) {
      payload.deposit = Number(payload.deposit);
      if (payload.deposit < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid deposit" });
      }
    }
    if (payload.name != null) {
      payload.name = String(payload.name).trim();
    }

    const budget = await Budget.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!budget)
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });

    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id);
    if (!budget)
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });

    await budget.deleteOne();
    res.status(200).json({ success: true, message: "Budget item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
