function isValidId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

function isValidAmount(amount) {
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000;
}

module.exports = { isValidId, isValidAmount };
