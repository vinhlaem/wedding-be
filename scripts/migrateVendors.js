/**
 * Migration: convert old single-vendor fields to the new `vendors` array.
 *
 * Old schema had:  vendorName, address, phone  (flat strings on Budget doc)
 * New schema has:  vendors[]  { name, address, phone, price, isDefault }
 *
 * Rules:
 *  - Only touch documents that still have the old flat fields OR have an
 *    empty vendors array.
 *  - If vendorName is non-empty → create one vendor entry with:
 *      name    = vendorName
 *      address = address
 *      phone   = phone
 *      price   = estimatedCost   (best guess for existing data)
 *      isDefault = true
 *  - If vendorName is empty but address/phone are set → vendor name becomes
 *    "Nhà cung cấp" as a placeholder.
 *  - If all three old fields are empty → leave vendors: [] unchanged.
 *  - Unset the old flat fields after migration.
 *  - estimatedCost stays as-is (it is the budget owner's estimate, independent
 *    of any vendor price).
 *
 * Run:
 *   node scripts/migrateVendors.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌  MONGODB_URI env variable is not set.");
  process.exit(1);
}

// ── Raw schema definition (bypass model cache issues in scripts) ─────────────
const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    address: { type: String, default: "", maxlength: 500 },
    phone: { type: String, default: "", maxlength: 20 },
    price: { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const budgetSchema = new mongoose.Schema(
  {
    category: String,
    itemName: String,
    estimatedCost: Number,
    depositPaid: Number,
    remainingCost: Number,
    note: String,
    status: String,
    deadline: Date,
    vendors: { type: [vendorSchema], default: [] },
    notifyStage: Number,
    lastNotificationSent: Date,
    // Legacy fields — kept here so Mongoose doesn't strip them on read
    vendorName: String,
    address: String,
    phone: String,
  },
  { timestamps: true, strict: false },
);

const Budget = mongoose.models.Budget || mongoose.model("Budget", budgetSchema);

async function migrate() {
  console.log("🔗  Connecting to MongoDB…");
  await mongoose.connect(MONGO_URI, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10_000,
  });
  console.log("✅  Connected.\n");

  // Find docs that still have the old layout:
  //   - have at least one of the legacy fields set, OR
  //   - were created before vendors array existed (vendors undefined / empty)
  const candidates = await Budget.find({
    $or: [
      { vendorName: { $exists: true } },
      { address: { $exists: true } },
      { phone: { $exists: true } },
    ],
  }).lean();

  console.log(`📋  Found ${candidates.length} document(s) to inspect.\n`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of candidates) {
    const hasVendors = Array.isArray(doc.vendors) && doc.vendors.length > 0;

    // Already migrated — just unset legacy fields
    if (hasVendors) {
      await Budget.updateOne(
        { _id: doc._id },
        { $unset: { vendorName: "", address: "", phone: "" } },
      );
      skipped++;
      continue;
    }

    const name = (doc.vendorName || "").trim();
    const address = (doc.address || "").trim();
    const phone = (doc.phone || "").trim();

    const hasAnyInfo = name || address || phone;

    const update = {
      $unset: { vendorName: "", address: "", phone: "" },
    };

    if (hasAnyInfo) {
      const vendor = {
        name: name || "Nhà cung cấp",
        address,
        phone,
        price: doc.estimatedCost ?? 0,
        isDefault: true,
      };
      update.$push = { vendors: vendor };
    }

    await Budget.updateOne({ _id: doc._id }, update);
    migrated++;

    const label = name || "(không tên)";
    console.log(
      `  ✔  [${doc._id}] "${doc.itemName}" — ${hasAnyInfo ? `tạo vendor "${label}"` : "không có vendor, chỉ xóa fields cũ"}`,
    );
  }

  console.log(
    `\n🎉  Xong! ${migrated} doc đã migrate, ${skipped} doc đã có vendors (chỉ xóa legacy fields).`,
  );
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("❌  Migration failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
