const express = require("express");
const router = express.Router();
const { isValidId, isValidAmount } = require("../lib/validation");

module.exports = function ({ db, deposits, approvedDeposits, saveDeposits }) {

  /* =========================
     DEV DEPOSIT
  ========================= */

  router.post("/dev-deposit", (req, res) => {
    const adminKey = req.body && req.body.key;

    if (adminKey !== process.env.DEV_KEY) {
      return res.send("forbidden");
    }

    const trader = req.body && req.body.trader_id;
    const amount = parseFloat(req.body && req.body.amount || 25);

    if (trader && !isValidId(trader)) {
      return res.send("invalid trader_id");
    }

    if (!isValidAmount(amount)) {
      return res.send("invalid amount");
    }

    if (trader) {
      if (!deposits[trader] || amount > deposits[trader]) {
        deposits[trader] = amount;
      }
      console.log("🧪 TEST депозит:", trader, "+", amount);
    }

    res.send("ok");
  });

  /* =========================
     РЕАЛ ДЕПОЗИТ
  ========================= */

  router.get("/deposit", (req, res) => {
    const trader = req.query.trader_id;
    const amount = parseFloat(req.query.amount || 0);

    if (trader && !isValidId(trader)) {
      return res.send("invalid trader_id");
    }

    if (amount && !isValidAmount(amount)) {
      return res.send("invalid amount");
    }

    if (trader && amount) {
      deposits[trader] = amount;
      console.log("💰 депозит:", trader, "+", amount);
    }

    res.send("OK");
  });

  /* =========================
     ПРОВЕРКА РЕГИСТРАЦИИ
  ========================= */

  router.get("/check", async (req, res) => {
    const trader = req.query.trader_id;

    if (!trader || !isValidId(trader)) {
      return res.json({ ok: false });
    }

    try {
      if (!db) {
        console.log("❌ DB NOT CONNECTED");
        return res.send("db error");
      }

      const ref = await db.collection("referrals").doc(trader).get();

      if (ref.exists) {
        return res.json({ ok: true, trader_id: trader });
      }
    } catch (e) {
      console.log("firebase check error", e);
    }

    return res.json({ ok: false });
  });

  /* =========================
     ПРОВЕРКА ДЕПОЗИТА
  ========================= */

  router.get("/check-deposit", async (req, res) => {
    const trader = req.query.trader_id;

    if (!trader || !isValidId(trader)) {
      return res.json({ ok: false, amount: 0 });
    }

    try {
      if (!db) {
        console.log("❌ DB NOT CONNECTED");
        return res.json({ ok: false, amount: 0 });
      }

      const ref = await db.collection("referrals").doc(trader).get();

      if (ref.exists) {
        const data = ref.data();
        const amount = parseFloat(data.deposit || 0);

        if (amount >= 10) {
          return res.json({ ok: true, amount: amount });
        }
      }
    } catch (e) {
      console.log("firebase check deposit error", e);
    }

    return res.json({ ok: false, amount: 0 });
  });

  /* =========================
     ПРОВЕРКА АПРУВА
  ========================= */

  router.get("/check-approve", (req, res) => {
    const trader = req.query.trader_id;

    if (!trader) {
      return res.json({ ok: false });
    }

    if (approvedDeposits[trader]) {
      console.log("✅ approve found:", trader);
      return res.json({ ok: true });
    }

    res.json({ ok: false });
  });

  return router;
};
