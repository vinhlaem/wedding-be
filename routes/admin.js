/**
 * One-time admin routes — protected by ADMIN_SECRET env variable.
 * Call these via HTTP after deploying, then remove the route registration
 * from index.js when done.
 *
 * Usage:
 *   POST /api/admin/migrate-vendors
 *   Headers: x-admin-secret: <your ADMIN_SECRET value>
 */

const express = require("express");
const router = express.Router();

// Guard: every request must carry the correct secret header.
router.use((req, res, next) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return res
      .status(503)
      .json({ success: false, message: "ADMIN_SECRET not configured" });
  }
  if (req.headers["x-admin-secret"] !== secret) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
});

// POST /api/admin/migrate-vendors
router.post("/migrate-vendors", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const Budget = require("../models/Budget");

    // Use raw queries so we can read legacy fields (strict: false is set on model)
    const candidates = await mongoose.connection.db
      .collection("budgets")
      .find({
        $or: [
          { vendorName: { $exists: true } },
          { address: { $exists: true } },
          { phone: { $exists: true } },
        ],
      })
      .toArray();

    let migrated = 0;
    let skipped = 0;
    const log = [];

    for (const doc of candidates) {
      const hasVendors =
        Array.isArray(doc.vendors) && doc.vendors.length > 0;

      if (hasVendors) {
        // Already has vendors — just remove legacy fields
        await mongoose.connection.db.collection("budgets").updateOne(
          { _id: doc._id },
          { $unset: { vendorName: "", address: "", phone: "" } },
        );
        skipped++;
        log.push({ id: String(doc._id), action: "unset-only (already has vendors)" });
        continue;
      }

      const name = (doc.vendorName || "").trim();
      const address = (doc.address || "").trim();
      const phone = (doc.phone || "").trim();
      const hasAnyInfo = name || address || phone;

      const update = {
        $unset: { vendorName: "", address: "", phone: "" },
        $set: { baseEstimatedCost: doc.estimatedCost ?? 0 },
      };

      if (hasAnyInfo) {
        const vendor = {
          _id: new mongoose.Types.ObjectId(),
          name: name || "Nhà cung cấp",
          address,
          phone,
          price: doc.estimatedCost ?? 0,
          isDefault: true,
        };
        update.$push = { vendors: vendor };
        log.push({
          id: String(doc._id),
          itemName: doc.itemName,
          action: `created vendor "${vendor.name}" price=${vendor.price}`,
        });
      } else {
        log.push({
          id: String(doc._id),
          itemName: doc.itemName,
          action: "no vendor info — only unset legacy fields",
        });
      }

      await mongoose.connection.db
        .collection("budgets")
        .updateOne({ _id: doc._id }, update);
      migrated++;
    }

    return res.status(200).json({
      success: true,
      summary: {
        inspected: candidates.length,
        migrated,
        skipped,
      },
      log,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
