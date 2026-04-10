const Budget = require("../models/Budget");

const VALID_CATEGORIES = ["dam-hoi", "dam-cuoi"];
const VALID_STATUSES = ["chua-coc", "da-coc-mot-phan", "hoan-thanh"];

const BUDGET_PROJECTION = {
  category: 1,
  itemName: 1,
  estimatedCost: 1,
  depositPaid: 1,
  remainingCost: 1,
  note: 1,
  status: 1,
  vendors: 1,
  deadline: 1,
  notifyStage: 1,
  lastNotificationSent: 1,
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
      note,
      status,
      deadline,
    } = req.body || {};

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }
    if (
      !itemName ||
      typeof itemName !== "string" ||
      itemName.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "itemName is required" });
    }
    if (estimatedCost == null || Number(estimatedCost) < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid estimatedCost" });
    }

    const estNum = Number(estimatedCost);
    const depNum = depositPaid != null ? Number(depositPaid) : 0;

    const budget = await Budget.create({
      category,
      itemName: itemName.trim(),
      estimatedCost: estNum,
      depositPaid: depNum,
      remainingCost: estNum - depNum,
      note: note || "",
      status: status && VALID_STATUSES.includes(status) ? status : "chua-coc",
      deadline: deadline ? new Date(deadline) : null,
      vendors: [],
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

    // Strip vendor management — use dedicated vendor endpoints
    delete payload.vendors;

    if (payload.estimatedCost != null) {
      payload.estimatedCost = Number(payload.estimatedCost);
      if (payload.estimatedCost < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid estimatedCost" });
      }
    }
    if (payload.depositPaid != null) {
      payload.depositPaid = Number(payload.depositPaid);
      if (payload.depositPaid < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid depositPaid" });
      }
    }
    if (payload.itemName != null) {
      payload.itemName = String(payload.itemName).trim();
    }
    if (payload.status && !VALID_STATUSES.includes(payload.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const existing = await Budget.findById(id).lean();
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });
    }
    const estNum =
      payload.estimatedCost != null
        ? payload.estimatedCost
        : existing.estimatedCost;
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
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });
    }
    await budget.deleteOne();
    res.status(200).json({ success: true, message: "Budget item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Vendor sub-document controllers ─────────────────────────────────────────

const addVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, price } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Vendor name is required" });
    }
    if (price == null || Number(price) < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid vendor price" });
    }

    const budget = await Budget.findById(id);
    if (!budget) {
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });
    }

    const isFirst = budget.vendors.length === 0;
    budget.vendors.push({
      name: name.trim(),
      address: address || "",
      phone: phone || "",
      price: Number(price),
      isDefault: isFirst, // first vendor auto becomes default
    });
    await budget.save();

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateVendor = async (req, res) => {
  try {
    const { id, vendorId } = req.params;
    const { name, address, phone, price } = req.body || {};

    const budget = await Budget.findById(id);
    if (!budget) {
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });
    }

    const vendor = budget.vendors.id(vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    if (name != null) vendor.name = String(name).trim();
    if (address != null) vendor.address = String(address);
    if (phone != null) vendor.phone = String(phone);
    if (price != null) {
      const p = Number(price);
      if (p < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid vendor price" });
      }
      vendor.price = p;
    }

    await budget.save();
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const { id, vendorId } = req.params;

    const budget = await Budget.findById(id);
    if (!budget) {
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });
    }

    const vendor = budget.vendors.id(vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const wasDefault = vendor.isDefault;
    vendor.deleteOne();

    // If deleted vendor was default, assign default to the cheapest remaining
    if (wasDefault && budget.vendors.length > 0) {
      const cheapest = budget.vendors.reduce((a, b) =>
        a.price <= b.price ? a : b,
      );
      cheapest.isDefault = true;
    }

    await budget.save();
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const setDefaultVendor = async (req, res) => {
  try {
    const { id, vendorId } = req.params;

    const budget = await Budget.findById(id);
    if (!budget) {
      return res
        .status(404)
        .json({ success: false, message: "Budget item not found" });
    }

    const vendor = budget.vendors.id(vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    budget.vendors.forEach((v) => {
      v.isDefault = v._id.toString() === vendorId;
    });

    await budget.save();
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  addVendor,
  updateVendor,
  deleteVendor,
  setDefaultVendor,
};
