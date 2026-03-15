const express = require("express");
const fs = require("fs");
const simpleGit = require("simple-git");

const app = express();
const git = simpleGit();

const PARTNER_BOT_ADMIN = 838408932; // твой телеграм

let approvedDeposits = {};

/* =========================
LOAD APPROVED
========================= */

try{
const data = fs.readFileSync("approved.json","utf8");
approvedDeposits = JSON.parse(data);
console.log("💾 approved loaded");
}catch(e){
console.log("⚠️ approved.json not found");
}

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

let clickPartners = {};
let traderPartners = {};
let partnerStats = {};


/* =========================
   FIREBASE
========================= */

const admin = require("firebase-admin");

let db = null;

try{

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
credential: admin.credential.cert(serviceAccount)
});

db = admin.firestore();

console.log("🔥 Firebase connected");

}catch(e){

console.log("⚠️ Firebase disabled (serviceAccountKey.json not found)");

}


/* =========================
   RAM БАЗА
========================= */

let registeredUsers = {};
let deposits = {};

try{
const data = fs.readFileSync("deposits.json","utf8");
deposits = JSON.parse(data);
console.log("💾 deposits loaded");
}catch(e){
console.log("⚠️ deposits.json not found");
}

/* =========================
   STATS LOAD
========================= */

let stats = 
{"users":25328,"profit":41657191,"win":87,"loss":13,"time":"15:00"}


try{
const data = fs.readFileSync("stats.json","utf8");
stats = JSON.parse(data);
console.log("📊 stats loaded");
}catch(e){
console.log("⚠️ stats.json not found, creating...");
fs.writeFileSync("stats.json", JSON.stringify(stats,null,2));
}

function saveStats(){
try{

const tmp = "stats.tmp";

fs.writeFileSync(tmp, JSON.stringify(stats,null,2));
fs.renameSync(tmp, "stats.json");

}catch(e){
console.log("stats save error", e);
}
}

let liveTrades = [];
let totalTrades = 0;

let winChance = 0.74;

const DEV_MODE = true;


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

const path = require("path");

const pages = [
"index",
"login",
"register",
"signals",
"history",
"rules",
"deposit",
"pocket",
"instruction",
"delete",
"about",

];

pages.forEach(page=>{

app.get("/"+page,(req,res)=>{
res.sendFile(path.join(__dirname,"public",page+".html"));
});

});


/* =========================
   DEV DEPOSIT
========================= */

app.get("/dev-deposit",(req,res)=>{

const adminKey = req.query.key;

if(adminKey !== process.env.DEV_KEY){
return res.send("forbidden");
}

const trader = req.query.trader_id;
const amount = parseFloat(req.query.amount || 25);

if(trader){

if(!deposits[trader] || amount > deposits[trader]){
deposits[trader] = amount;
}

console.log("🧪 TEST депозит:",trader,"+",amount);

}

res.send("ok");

});



/* =========================
   РЕАЛ ДЕПОЗИТ
========================= */

app.get("/deposit",(req,res)=>{

const trader = req.query.trader_id;
const amount = parseFloat(req.query.amount || 0);

if(trader && amount){

deposits[trader] = amount;

console.log("💰 депозит:",trader,"+",amount);

}

res.send("OK");

});


/* =========================
   ПРОВЕРКА ID
========================= */

app.get("/check", async (req,res)=>{

const traderInput = req.query.trader_id;

if(!traderInput){
return res.json({ok:false});
}

/* RAM */
const foundRAM = registeredUsers[traderInput];

if(foundRAM){
return res.json({
ok:true,
trader_id:traderInput
});
}

/* FIREBASE */
if(db){

try{

const snap = await db
.collection("users")
.where("trader_id","==",traderInput)
.get();

if(!snap.empty){

return res.json({
ok:true,
trader_id:traderInput
});

}

}catch(e){
console.log("firebase check error",e);
}

}

res.json({ok:false});

});


/* =========================
   ПРОВЕРКА ДЕПОЗИТА
========================= */

app.get("/check-deposit",(req,res)=>{

const trader = req.query.trader_id;

if(!trader){
return res.json({ok:false,amount:0});
}

const amount = parseFloat(deposits[trader] || 0);

if(amount >= 10){

console.log("✅ депозит есть:",trader,amount);

res.json({
ok:true,
amount:amount
});

}else{

console.log("⛔ депозита нет:",trader);

res.json({
ok:false,
amount:0
});

}

});


/* =========================
   ПРОВЕРКА АПРУВА
========================= */

app.get("/check-approve",(req,res)=>{

const trader = req.query.trader_id;

if(!trader){
return res.json({ok:false});
}

if(approvedDeposits[trader]){
console.log("✅ approve found:", trader);

return res.json({
ok:true
});
}

res.json({
ok:false
});

});



/* =========================
   РЫНОК
========================= */

let currentPrice = 1.18420;
let currentPair = "EUR/USD";

function movePrice(){

let baseMove = (Math.random()-0.5)*0.00025;
let trend = (Math.random()>0.5?1:-1)*0.00005;

currentPrice += baseMove + trend;
currentPrice += (Math.random()-0.5)*0.00003;

if(currentPrice < 1) currentPrice = 1.1;

}

setInterval(movePrice,900);


/* =========================
   ПОЛУЧЕНИЕ ЦЕНЫ
========================= */

app.get("/price",(req,res)=>{
res.json({
price: currentPrice,
pair: currentPair
});
});


/* =========================
   SET PAIR (для signals)
========================= */

app.get("/setpair",(req,res)=>{

const pair = req.query.pair;

if(pair){
currentPair = pair;
}

res.json({ok:true});

});


/* =========================
   ENTRY
========================= */

app.get("/get-entry",(req,res)=>{

let wait = 3000 + Math.random()*5000;

setTimeout(()=>{

let entry = currentPrice;
entry += (Math.random()-0.5)*0.00015;

res.json({
entry: entry,
pair: currentPair
});

},wait);

});


/* =========================
   BLOCK DIRECT HTML ACCESS
========================= */

app.get(/\.html$/, (req,res)=>{
res.redirect("/");
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
console.log("🚀 SERVER START");
console.log("PORT:",PORT);
console.log("🧪 DEV MODE:",DEV_MODE);
});

/* =========================
   REAL MARKET SIMULATOR
========================= */

function getMarketDelay(){

let hour = new Date().getHours();

/* ночь */
if(hour >=0 && hour <7){
return 7000 + Math.random()*4000;
}

/* утро */
if(hour >=7 && hour <12){
return 4000 + Math.random()*2000;
}

/* день */
if(hour >=12 && hour <18){
return 2000 + Math.random()*1000;
}

/* вечер пик */
if(hour >=18 && hour <23){
return 1200 + Math.random()*600;
}

/* поздний вечер */
return 3000 + Math.random()*1500;

}

function generateTrade(){

let pairs = ["EUR/USD","GBP/USD","BTC","ETH","GOLD","USD/JPY"];

let pair = pairs[Math.floor(Math.random()*pairs.length)];

let end = Math.floor(100 + Math.random()*900);
let id = "ID 12****" + end;

/* суммы */

let amount;
let r = Math.random();

if(r < 0.65){
amount = Math.floor(Math.random()*120)+40;
}else if(r < 0.9){
amount = Math.floor(Math.random()*600)+200;
}else if(r < 0.98){
amount = Math.floor(Math.random()*1200)+600;
}else{
amount = Math.floor(Math.random()*2000)+2000;
}

/* плавный винрейт */

if(Math.random()>0.9){
winChance += (Math.random()-0.5)*0.02;
}

if(winChance > 0.89) winChance = 0.89;
if(winChance < 0.63) winChance = 0.63;

let isWin = Math.random() < winChance;
let result = isWin ? "win":"loss";

/* обновляем прибыль */

if(isWin){
stats.profit += Math.floor(amount*0.7);
}else{
stats.profit -= Math.floor(amount*0.3);
}

/* рост пользователей */

if(Math.random()>0.92){
stats.users += 1;
}

/* время */

let kyiv = new Date().toLocaleString("en-US",{timeZone:"Europe/Kyiv"});
let hour = new Date(kyiv).getHours().toString().padStart(2,"0");

stats.time = hour+":00";

/* сделки */

liveTrades.push({
id,
pair,
amount,
result,
time:Date.now()
});

if(liveTrades.length>40){
liveTrades = liveTrades.slice(-40);
}

/* winrate */

stats.win = Math.round(winChance*100);
stats.loss = 100 - stats.win;

/* сохранить */

saveStats();

console.log("📈 trade generated");

/* следующая сделка */

setTimeout(generateTrade, getMarketDelay());

}

/* запуск рынка */

generateTrade();

require("./public/bot/bot");
require("./public/bot/partnerBot");

app.get("/stats",(req,res)=>{

try{
const data = fs.readFileSync("stats.json","utf8");
stats = JSON.parse(data);
}catch(e){
console.log("stats reload error", e);
}

res.json(stats);

});
app.get("/live",(req,res)=>{
res.json(liveTrades);
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {

console.error("SERVER ERROR:", err);

res.status(500).json({
error: "server_error"
});

});

/* =========================
   AUTO SAVE STATS TO GIT
========================= */

setInterval(async()=>{

try{

await git.add("stats.json");

await git.commit("auto stats update");

await git.push();

console.log("📦 stats saved to git");

}catch(e){

console.log("git save error", e.message);

}

},300000);

app.get("/postback", async (req,res)=>{

const click =
req.query.click_id ||
req.query.clickid ||
req.query.cid;

const trader =
req.query.trader_id ||
req.query.sub1 ||
req.query.sub2;

const amount =
parseFloat(
req.query.amount ||
req.query.sum ||
req.query.payout ||
req.query.profit ||
0
);

const type =
req.query.type ||
req.query.event ||
req.query.status ||
"ftd";



/* =========================
REGISTRATION
========================= */

if(click && trader){

registeredUsers[click] = trader;

/* сохраняем trader */
traders[trader] = {
click_id: click,
created: Date.now()
};

saveTraders();


/* сохраняем партнера */

if(clickPartners[click]){
traderPartners[trader] = clickPartners[click];
}

console.log("👤 REG:", click,"→",trader);

}


/* =========================
FIRST DEPOSIT (FTD)
========================= */

if(trader && amount > 0 && type !== "redeposit"){

deposits[trader] = amount;

console.log("💰 FTD:", trader,"+",amount);

saveDeposits();

}


/* =========================
REDEPOSIT (APPROVE)
========================= */

if(type === "redeposit" && trader){

/* защита чтобы не платить дважды */

if(approvedDeposits[trader]){
return res.send("already approved");
}

approvedDeposits[trader] = true;
saveApproved();

console.log("🔥 REDEPOSIT APPROVED:", trader, amount);

const partner = traderPartners[trader];
const firstDeposit = deposits[trader] || 0;

if(partner){

try{

const { bot } = require("./public/bot/partnerBot");

await bot.sendMessage(
PARTNER_BOT_ADMIN,
`/autoapprove ${trader}`
);






}catch(e){
console.log("bot approve error",e);
}

}

}




res.send("OK");

});



function saveDeposits(){
fs.writeFileSync("deposits.json", JSON.stringify(deposits,null,2));
}

/* =========================
   TRADERS LOAD
========================= */

let traders = {};

try{
const data = fs.readFileSync("traders.json","utf8");
traders = JSON.parse(data);
console.log("💾 traders loaded");
}catch(e){
console.log("⚠️ traders.json not found");
}

function saveTraders(){
fs.writeFileSync("traders.json", JSON.stringify(traders,null,2));
}

function saveApproved(){
fs.writeFileSync("approved.json", JSON.stringify(approvedDeposits,null,2));
}

/* =========================
SAVE TRADER ID
========================= */

app.post("/save-trader", async (req,res)=>{

const trader = req.body.trader_id;

if(!trader){
return res.json({ok:false});
}

/* RAM */
registeredUsers[trader] = trader;

/* FIREBASE */
if(db){

try{

await db.collection("users")
.doc(trader)
.set({
trader_id: trader,
created_at: Date.now()
},{merge:true});

}catch(e){
console.log("firebase save error",e);
}

}

console.log("💾 trader saved:",trader);

res.json({ok:true});

});