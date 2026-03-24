const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const { loadJSON, saveJSON } = require("./lib/persistence");

const app = express();

/* =========================
   ERROR HANDLERS
========================= */

process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION", err);
});

process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION", err);
});

app.use(express.json());

/* =========================
   FIREBASE
========================= */

let db = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log("🔥 Firebase connected");
} catch (e) {
  console.log("⚠️ Firebase disabled (FIREBASE_KEY not set)");
}

/* =========================
   DATA
========================= */

let deposits = loadJSON("deposits.json", "deposits") || {};
let traders = loadJSON("traders.json", "traders") || {};
let approvedDeposits = loadJSON("approved.json", "approved") || {};

let stats = loadJSON("stats.json", "stats") ||
  { users: 31236, profit: 52902375, win: 70, loss: 30, time: "01:00" };

let registeredUsers = {};
let clickPartners = {};
let traderPartners = {};

const DEV_MODE = process.env.DEV_MODE === "true";

function saveDeposits() { saveJSON("deposits.json", deposits); }
function saveTraders() { saveJSON("traders.json", traders); }
function saveApproved() { saveJSON("approved.json", approvedDeposits); }
function saveStats() { saveJSON("stats.json", stats); }

/* =========================
   STATIC
========================= */

app.set("etag", true);

app.use(express.static("public", {
  maxAge: "6h"
}));

/* =========================
   CLEAN ROUTES (без .html)
========================= */

const pages = [
  "index", "login", "register", "signals", "history",
  "rules", "deposit", "pocket", "instruction", "delete", "about",
];

pages.forEach(page => {
  app.get("/" + page, (req, res) => {
    res.sendFile(path.join(__dirname, "public", page + ".html"));
  });
});

/* =========================
   ROUTE MODULES
========================= */

const shared = { db, deposits, traders, approvedDeposits, clickPartners, traderPartners, registeredUsers, saveDeposits, saveTraders, saveApproved };

app.use(require("./routes/deposit")({ ...shared }));
app.use(require("./routes/market")({ stats, saveStats }));
app.use(require("./routes/postback")({ ...shared }));

/* =========================
   BLOCK DIRECT HTML ACCESS
========================= */

app.get(/\.html$/, (req, res) => {
  res.redirect("/");
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 SERVER START");
  console.log("PORT:", PORT);
  console.log("🧪 DEV MODE:", DEV_MODE);
});

/* =========================
   BOTS
========================= */

require("./public/bot/bot").setup(app);
require("./public/bot/partnerBot").setup(app);

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: "server_error" });
});
