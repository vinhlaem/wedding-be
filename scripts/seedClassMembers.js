require("dotenv").config();
const connectDB = require("../database");
const ClassMember = require("../models/ClassMember");
const names = require("../data/classMembers");
const { normalizeFacebookName } = require("../utils/normalizeFacebookName");

async function seed() {
  await connectDB();
  for (let index = 0; index < names.length; index += 1) {
    const fullName = names[index];
    await ClassMember.updateOne(
      { seedKey: `class-2026-${String(index + 1).padStart(2, "0")}` },
      { $set: { fullName, normalizedFullName: normalizeFacebookName(fullName), isAdmin: ["Vinh Trương", "Vĩnh Hoà"].includes(fullName) } },
      { upsert: true, runValidators: true },
    );
  }
  console.log(`[seed] Upserted ${names.length} class members.`);
  process.exit(0);
}
seed().catch((error) => { console.error(error); process.exit(1); });
