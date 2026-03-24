const express = require("express");
const fs = require("fs");
const router = express.Router();

module.exports = function ({ stats, saveStats }) {

  let currentPrice = 1.18420;
  let currentPair = "EUR/USD";
  let liveTrades = [];
  let winChance = 0.74;

  /* =========================
     ДВИЖЕНИЕ ЦЕНЫ
  ========================= */

  function movePrice() {
    let baseMove = (Math.random() - 0.5) * 0.00025;
    let trend = (Math.random() > 0.5 ? 1 : -1) * 0.00005;

    currentPrice += baseMove + trend;
    currentPrice += (Math.random() - 0.5) * 0.00003;

    if (currentPrice < 1) currentPrice = 1.1;
  }

  setInterval(movePrice, 900);

  /* =========================
     ЗАДЕРЖКА ПО ВРЕМЕНИ
  ========================= */

  function getMarketDelay() {
    let hour = new Date().getHours();

    if (hour >= 0 && hour < 7) return 7000 + Math.random() * 4000;
    if (hour >= 7 && hour < 12) return 4000 + Math.random() * 2000;
    if (hour >= 12 && hour < 18) return 2000 + Math.random() * 1000;
    if (hour >= 18 && hour < 23) return 1200 + Math.random() * 600;

    return 3000 + Math.random() * 1500;
  }

  /* =========================
     ГЕНЕРАЦИЯ СДЕЛКИ
  ========================= */

  function generateTrade() {
    let pairs = ["EUR/USD", "GBP/USD", "BTC", "ETH", "GOLD", "USD/JPY"];
    let pair = pairs[Math.floor(Math.random() * pairs.length)];

    let end = Math.floor(100 + Math.random() * 900);
    let id = "ID 12****" + end;

    let amount;
    let r = Math.random();

    if (r < 0.65) {
      amount = Math.floor(Math.random() * 120) + 40;
    } else if (r < 0.9) {
      amount = Math.floor(Math.random() * 600) + 200;
    } else if (r < 0.98) {
      amount = Math.floor(Math.random() * 1200) + 600;
    } else {
      amount = Math.floor(Math.random() * 2000) + 2000;
    }

    if (Math.random() > 0.9) {
      winChance += (Math.random() - 0.5) * 0.02;
    }

    if (winChance > 0.89) winChance = 0.89;
    if (winChance < 0.63) winChance = 0.63;

    let isWin = Math.random() < winChance;
    let result = isWin ? "win" : "loss";

    if (isWin) {
      stats.profit += Math.floor(amount * 0.7);
    } else {
      stats.profit -= Math.floor(amount * 0.3);
    }

    if (Math.random() > 0.92) {
      stats.users += 1;
    }

    let kyiv = new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" });
    let hour = new Date(kyiv).getHours().toString().padStart(2, "0");
    stats.time = hour + ":00";

    liveTrades.push({ id, pair, amount, result, time: Date.now() });

    if (liveTrades.length > 40) {
      liveTrades = liveTrades.slice(-40);
    }

    stats.win = Math.round(winChance * 100);
    stats.loss = 100 - stats.win;

    saveStats();

    console.log("📈 trade generated");

    setTimeout(generateTrade, getMarketDelay());
  }

  generateTrade();

  /* =========================
     МАРШРУТЫ
  ========================= */

  router.get("/price", (req, res) => {
    res.json({ price: currentPrice, pair: currentPair });
  });

  router.get("/setpair", (req, res) => {
    const pair = req.query.pair;
    if (pair) currentPair = pair;
    res.json({ ok: true });
  });

  router.get("/get-entry", (req, res) => {
    let wait = 3000 + Math.random() * 5000;

    setTimeout(() => {
      let entry = currentPrice;
      entry += (Math.random() - 0.5) * 0.00015;
      res.json({ entry: entry, pair: currentPair });
    }, wait);
  });

  router.get("/stats", (req, res) => {
    try {
      const data = fs.readFileSync("stats.json", "utf8");
      Object.assign(stats, JSON.parse(data));
    } catch (e) {
      console.log("stats reload error", e);
    }
    res.json(stats);
  });

  router.get("/live", (req, res) => {
    res.json(liveTrades);
  });

  return router;
};
