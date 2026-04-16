const Budget = require("../models/Budget");
const User = require("../models/User");

const VALID_CATEGORIES = ["dam-hoi", "dam-cuoi"];
const VALID_STATUSES = ["chua-coc", "da-coc-mot-phan", "hoan-thanh"];

/**
 * Sync estimatedCost from the default vendor price.
 * Falls back to baseEstimatedCost when no vendors remain.
 */
function syncEstimatedCost(budget) {
  const vendors = budget.vendors || [];
  if (vendors.length > 0) {
    const def = vendors.find((v) => v.isDefault);
    const source =
      def || vendors.reduce((a, b) => (a.price <= b.price ? a : b));
    budget.estimatedCost = source.price;
  } else {
    // Revert to the original user-set estimate
    if (budget.baseEstimatedCost != null) {
      budget.estimatedCost = budget.baseEstimatedCost;
    }
  }
  budget.remainingCost = Math.max(
    0,
    budget.estimatedCost - (budget.depositPaid || 0),
  );
}

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

/**
 * Returns all owners whose workspace this requester can access:
 * - their own userId, PLUS
 * - any User whose sharedWith array contains this requester's id.
 */
async function getAccessibleOwnerIds(requesterId) {
  const sharedOwners = await User.find(
    { sharedWith: requesterId },
    { _id: 1 },
  ).lean();
  return [requesterId, ...sharedOwners.map((u) => u._id.toString())];
}

const getBudgets = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category && VALID_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    const requester = req.user || {};
    if (requester.role !== "admin") {
      // show own items + items from workspaces shared with me
      const ownerIds = await getAccessibleOwnerIds(requester.sub);
      filter.owner = { $in: ownerIds };
    }

    const budgets = await Budget.find(filter, BUDGET_PROJECTION)
      .sort({ createdAt: 1 })
      .lean();
    res.set("Cache-Control", "no-store");
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

    const ownerId = req.user && req.user.sub;
    const budget = await Budget.create({
      category,
      itemName: itemName.trim(),
      estimatedCost: estNum,
      baseEstimatedCost: estNum,
      depositPaid: depNum,
      remainingCost: estNum - depNum,
      note: note || "",
      status: status && VALID_STATUSES.includes(status) ? status : "chua-coc",
      deadline: deadline ? new Date(deadline) : null,
      vendors: [],
      owner: ownerId,
    });

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBudgetsBulk = async (req, res) => {
  try {
    const { budgets } = req.body || {};

    if (!Array.isArray(budgets) || budgets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "budgets must be a non-empty array",
      });
    }

    const ownerId = req.user && req.user.sub;

    const validBudgets = [];
    const errors = [];

    budgets.forEach((item, index) => {
      const {
        category,
        itemName,
        estimatedCost,
        depositPaid,
        note,
        status,
        deadline,
      } = item;

      // validate category
      if (!category || !VALID_CATEGORIES.includes(category)) {
        errors.push({ index, message: "Invalid category" });
        return;
      }

      // validate itemName
      if (
        !itemName ||
        typeof itemName !== "string" ||
        itemName.trim().length === 0
      ) {
        errors.push({ index, message: "itemName is required" });
        return;
      }

      // validate estimatedCost
      if (estimatedCost == null || Number(estimatedCost) < 0) {
        errors.push({ index, message: "Invalid estimatedCost" });
        return;
      }

      const estNum = Number(estimatedCost);
      const depNum = depositPaid != null ? Number(depositPaid) : 0;

      validBudgets.push({
        category,
        itemName: itemName.trim(),
        estimatedCost: estNum,
        baseEstimatedCost: estNum,
        depositPaid: depNum,
        remainingCost: estNum - depNum,
        note: note || "",
        status: status && VALID_STATUSES.includes(status) ? status : "chua-coc",
        deadline: deadline ? new Date(deadline) : null,
        vendors: [],
        owner: ownerId,
      });
    });

    if (validBudgets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All items are invalid",
        errors,
      });
    }

    // insert bulk
    const createdBudgets = await Budget.insertMany(validBudgets);

    return res.status(201).json({
      success: true,
      data: createdBudgets,
      errors, // optional: trả về những item bị lỗi
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

    // Authorization: non-admins can edit if they own it or have workspace access
    const requester = req.user || {};
    const isOwner =
      existing.owner && existing.owner.toString() === requester.sub;
    // check workspace-level share: did the owner share their workspace with requester?
    const ownerUser = existing.owner
      ? await User.findById(existing.owner, { sharedWith: 1 }).lean()
      : null;
    const isWorkspaceCollaborator =
      ownerUser &&
      Array.isArray(ownerUser.sharedWith) &&
      ownerUser.sharedWith.some((id) => id.toString() === requester.sub);
    if (requester.role !== "admin" && !isOwner && !isWorkspaceCollaborator) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const hasVendors =
      Array.isArray(existing.vendors) && existing.vendors.length > 0;

    if (payload.estimatedCost != null) {
      // Always update the base (original) estimate regardless of vendors
      payload.baseEstimatedCost = payload.estimatedCost;
      // When vendors exist, estimatedCost is controlled by the default vendor — ignore manual input
      if (hasVendors) {
        delete payload.estimatedCost;
      }
    }

    const estNum =
      payload.estimatedCost != null
        ? payload.estimatedCost
        : existing.estimatedCost;
    const depNum =
      payload.depositPaid != null ? payload.depositPaid : existing.depositPaid;
    payload.remainingCost = Math.max(0, estNum - depNum);

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

    // Authorization: owner or workspace collaborator can delete
    const requester = req.user || {};
    const isOwner = budget.owner && budget.owner.toString() === requester.sub;
    const ownerUserDel = budget.owner
      ? await User.findById(budget.owner, { sharedWith: 1 }).lean()
      : null;
    const isWorkspaceCollabDel =
      ownerUserDel &&
      Array.isArray(ownerUserDel.sharedWith) &&
      ownerUserDel.sharedWith.some((id) => id.toString() === requester.sub);
    if (requester.role !== "admin" && !isOwner && !isWorkspaceCollabDel) {
      return res.status(403).json({ success: false, message: "Forbidden" });
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

    // Authorization for vendors: owner or workspace collaborator
    const requester = req.user || {};
    const isOwner = budget.owner && budget.owner.toString() === requester.sub;
    const ownerUserAdd = budget.owner
      ? await User.findById(budget.owner, { sharedWith: 1 }).lean()
      : null;
    const isWorkspaceCollabAdd =
      ownerUserAdd &&
      Array.isArray(ownerUserAdd.sharedWith) &&
      ownerUserAdd.sharedWith.some((id) => id.toString() === requester.sub);
    if (requester.role !== "admin" && !isOwner && !isWorkspaceCollabAdd) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const isFirst = budget.vendors.length === 0;
    budget.vendors.push({
      name: name.trim(),
      address: address || "",
      phone: phone || "",
      price: Number(price),
      isDefault: isFirst, // first vendor auto becomes default
    });
    syncEstimatedCost(budget);
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

    const requester = req.user || {};
    const isOwnerUpd =
      budget.owner && budget.owner.toString() === requester.sub;
    const ownerUserUpd = budget.owner
      ? await User.findById(budget.owner, { sharedWith: 1 }).lean()
      : null;
    const isWorkspaceCollabUpd =
      ownerUserUpd &&
      Array.isArray(ownerUserUpd.sharedWith) &&
      ownerUserUpd.sharedWith.some((id) => id.toString() === requester.sub);
    if (requester.role !== "admin" && !isOwnerUpd && !isWorkspaceCollabUpd) {
      return res.status(403).json({ success: false, message: "Forbidden" });
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

    syncEstimatedCost(budget);
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

    const requester = req.user || {};
    if (
      requester.role !== "admin" &&
      budget.owner &&
      budget.owner.toString() !== requester.sub
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
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

    syncEstimatedCost(budget);
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
    // Authorization: owner or workspace collaborator
    const requester = req.user || {};
    const isOwnerDef =
      budget.owner && budget.owner.toString() === requester.sub;
    const ownerUserDef = budget.owner
      ? await User.findById(budget.owner, { sharedWith: 1 }).lean()
      : null;
    const isWorkspaceCollabDef =
      ownerUserDef &&
      Array.isArray(ownerUserDef.sharedWith) &&
      ownerUserDef.sharedWith.some((id) => id.toString() === requester.sub);
    if (requester.role !== "admin" && !isOwnerDef && !isWorkspaceCollabDef) {
      return res.status(403).json({ success: false, message: "Forbidden" });
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

    syncEstimatedCost(budget);
    await budget.save();
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- Share endpoints (workspace-level) -----------------
const jwt = require("jsonwebtoken");

/**
 * POST /api/budgets/share
 * Creates a workspace share link for the current user — invitee gets access
 * to ALL of the owner's budget items.
 */
const createShareLink = async (req, res) => {
  try {
    const requester = req.user || {};
    if (!requester.sub)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const secret = process.env.SHARE_SECRET || process.env.JWT_SECRET;
    if (!secret)
      return res
        .status(500)
        .json({ success: false, message: "SHARE_SECRET not configured" });

    const payload = {
      workspaceOwnerId: requester.sub,
      inviterEmail: requester.email,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "7d" });
    const frontend = process.env.FRONTEND_URL_BUDGET || "http://localhost:3000";
    const link = `${frontend.replace(/\/$/, "")}?shareToken=${token}`;

    return res.status(200).json({ success: true, link, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/budgets/share/accept
 * Body: { token }
 * Adds the requester to the workspace owner's `sharedWith` list.
 */
const acceptShare = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "token is required" });

    const secret = process.env.SHARE_SECRET || process.env.JWT_SECRET;
    if (!secret)
      return res
        .status(500)
        .json({ success: false, message: "SHARE_SECRET not configured" });

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired share token" });
    }

    const { workspaceOwnerId } = payload;
    if (!workspaceOwnerId)
      return res
        .status(400)
        .json({ success: false, message: "Invalid share token format" });

    const requester = req.user || {};
    if (!requester.sub)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    // Prevent owner from adding themselves
    if (requester.sub === workspaceOwnerId)
      return res
        .status(400)
        .json({ success: false, message: "Cannot share with yourself" });

    const owner = await User.findById(workspaceOwnerId);
    if (!owner)
      return res
        .status(404)
        .json({ success: false, message: "Workspace owner not found" });

    const uid = requester.sub;
    const alreadyShared =
      Array.isArray(owner.sharedWith) &&
      owner.sharedWith.some((id) => id.toString() === uid);

    if (!alreadyShared) {
      owner.sharedWith.push(uid);
      await owner.save();
    }

    return res.status(200).json({
      success: true,
      data: { workspaceOwnerId, inviterEmail: payload.inviterEmail },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  createBudgetsBulk,
  updateBudget,
  deleteBudget,
  addVendor,
  updateVendor,
  deleteVendor,
  setDefaultVendor,
  createShareLink,
  acceptShare,
};
