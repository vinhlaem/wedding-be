const ClassMember = require("../models/ClassMember");
const Registration = require("../models/Registration");
const ReunionPlan = require("../models/ReunionPlan");
const ReunionPlanVote = require("../models/ReunionPlanVote");
const classMemberNames = require("../data/classMembers");
const { normalizeFacebookName } = require("../utils/normalizeFacebookName");

let bootstrapPromise = null;

/**
 * Idempotent database bootstrap for serverless deployments.
 *
 * createIndexes() only adds declared indexes; unlike syncIndexes(), it does
 * not remove unrelated indexes. Member upserts use a stable seedKey, so every
 * Vercel cold-start is safe and never creates duplicate master data.
 */
const ensureReunionDatabase = () => {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await ClassMember.createIndexes();
    await Registration.createIndexes();
    await ReunionPlan.createIndexes();
    await ReunionPlanVote.createIndexes();

    const operations = classMemberNames.map((fullName, index) => ({
      updateOne: {
        filter: { seedKey: `class-2026-${String(index + 1).padStart(2, "0")}` },
        update: {
          $set: {
            fullName,
            normalizedFullName: normalizeFacebookName(fullName),
            isAdmin: ["Vinh Trương", "Vĩnh Hoà"].includes(fullName),
          },
          $setOnInsert: { metadata: null },
        },
        upsert: true,
      },
    }));

    await ClassMember.bulkWrite(operations, { ordered: false });
    console.log(
      `[reunion] Database ready; ${classMemberNames.length} members ensured.`,
    );
  })().catch((error) => {
    // Allow a later invocation in the same warm instance to retry.
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
};

module.exports = { ensureReunionDatabase };
