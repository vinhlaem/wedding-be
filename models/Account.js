const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    // Bank details
    bankName: { type: String, default: null },
    accountNumber: { type: String, default: null },
    accountHolder: { type: String, default: null },
  },
  { timestamps: true },
);

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
