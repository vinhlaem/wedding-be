const normalizeFacebookName = (name) =>
  typeof name === "string" ? name.trim().replace(/\s+/g, " ").toLowerCase() : "";

module.exports = { normalizeFacebookName };
