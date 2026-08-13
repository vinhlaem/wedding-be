require("dotenv").config();
const connectDB = require("../database");
const ClassMember = require("../models/ClassMember");
const Registration = require("../models/Registration");

async function migrate() {
  await connectDB();
  await ClassMember.syncIndexes();
  await Registration.syncIndexes();
  console.log("[migration] Reunion indexes are in sync.");
  process.exit(0);
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
