const Budget = require("../models/Budget");

const VALID_CATEGORIES = ["dam-hoi", "dam-cuoi"];

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
