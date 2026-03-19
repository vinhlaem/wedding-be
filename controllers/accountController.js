const Account = require("../models/Account");

// Projection to return only needed fields
const ACCOUNT_PROJECTION = {
  bankName: 1,
  accountNumber: 1,
  accountHolder: 1,
  createdAt: 1,
  updatedAt: 1,
};

const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({}, ACCOUNT_PROJECTION).lean();
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAccount = async (req, res) => {
  try {
    const payload = req.body || {};
    const account = await Account.create(payload);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const account = await Account.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!account)
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    res.status(200).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);
    if (!account)
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    await account.deleteOne();
    res.status(200).json({ success: true, message: "Account deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
};
