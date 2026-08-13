const REUNION_START = "2026-08-29";
const REUNION_END = "2026-08-30";
const PAYMENT_DEADLINE = "2026-08-22";
const AMOUNT_ENTRY_AVAILABLE_FROM = "2026-08-23T00:00:00+07:00";

const amountEntryIsAvailable = (now = new Date()) =>
  now.getTime() >= new Date(AMOUNT_ENTRY_AVAILABLE_FROM).getTime();

module.exports = {
  REUNION_START,
  REUNION_END,
  PAYMENT_DEADLINE,
  AMOUNT_ENTRY_AVAILABLE_FROM,
  amountEntryIsAvailable,
};
