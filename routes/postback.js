const express = require("express");
const router = express.Router();
const { isValidId, isValidAmount } = require("../lib/validation");

module.exports = function ({ db, deposits, traders, approvedDeposits, clickPartners, traderPartners, registeredUsers, saveDeposits, saveTraders, saveApproved }) {

  router.get("/postback", async (req, res) => {

    /* postback secret verification */
    const postbackToken = req.query.token || req.headers["x-postback-token"];
    if (process.env.POSTBACK_SECRET && postbackToken !== process.env.POSTBACK_SECRET) {
      return res.status(403).send("forbidden");
    }

    const click =
      req.query.click_id ||
      req.query.clickid ||
      req.query.cid;

    const trader =
      req.query.trader_id ||
      req.query.sub1 ||
      req.query.sub2;

    const amount = parseFloat(
      req.query.amount ||
      req.query.sum ||
      req.query.payout ||
      req.query.profit ||
      0
    );

    /* validate inputs */
    if (click && !isValidId(click)) {
      return res.send("invalid click_id");
    }
    if (trader && !isValidId(trader)) {
      return res.send("invalid trader_id");
    }
    if (amount && !isValidAmount(amount)) {
      return res.send("invalid amount");
    }

    const type =
      req.query.type ||
      req.query.event ||
      req.query.status ||
      "ftd";

    /* =========================
       REGISTRATION
    ========================= */

    if (click && trader && String(click).length > 3) {

      registeredUsers[click] = trader;

      if (db) {
        try {
          await db.collection("referrals").doc(trader).set({
            trader_id: trader,
            click_id: click,
            created: Date.now()
          });
          console.log("🔥 saved referral:", trader);
        } catch (e) {
          console.log("firebase save error", e);
        }
      }

      traders[trader] = {
        click_id: click,
        created: Date.now()
      };

      saveTraders();

      if (clickPartners[click]) {
        traderPartners[trader] = clickPartners[click];
      }

      console.log("👤 REG:", click, "→", trader);
    }

    /* =========================
       FIRST DEPOSIT (FTD)
    ========================= */

    if (trader && amount > 0 && type !== "redeposit") {

      deposits[trader] = amount;

      console.log("💰 FTD:", trader, "+", amount);

      saveDeposits();

      if (db) {
        try {
          await db.collection("referrals").doc(trader).set({
            deposit: amount,
            deposit_at: Date.now()
          }, { merge: true });

          console.log("🔥 deposit saved to firebase:", trader);
        } catch (e) {
          console.log("firebase deposit save error", e);
        }
      }
    }

    /* =========================
       REDEPOSIT (APPROVE)
    ========================= */

    if (type === "redeposit" && trader) {

      if (approvedDeposits[trader]) {
        return res.send("already approved");
      }

      console.log("🔥 REDEPOSIT:", trader, amount);

      let partner = null;

      try {
        if (!db) {
          console.log("❌ DB NOT CONNECTED");
          return res.send("db error");
        }

        const ref = await db.collection("referrals").doc(trader).get();

        if (ref.exists) {
          partner = ref.data().click_id;
        }
      } catch (e) {
        console.log("firebase partner error", e);
      }

      console.log("👤 PARTNER:", partner);

      if (!partner) {
        return res.send("no partner");
      }

      try {
        const { approveTrader } = require("../public/bot/partnerBot");
        approveTrader(trader, partner, amount);
      } catch (e) {
        console.log("bot redeposit error", e);
      }

      approvedDeposits[trader] = true;
      saveApproved();

      console.log("🔥 REDEPOSIT APPROVED:", trader, amount);
    }

    res.send("OK");
  });

  return router;
};
