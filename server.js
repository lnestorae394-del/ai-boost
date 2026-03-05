const express = require("express");
const app = express();
const fs = require("fs");

app.use(express.json());

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

/* =========================
   STATS LOAD
========================= */

let stats = {
users: 4000,
profit: 900000,
win: 74,
loss: 26,
time: "12:00"
};

try{
const data = fs.readFileSync("stats.json","utf8");
stats = JSON.parse(data);
console.log("📊 stats loaded");
}catch(e){
console.log("⚠️ stats.json not found, creating...");
fs.writeFileSync("stats.json", JSON.stringify(stats,null,2));
}

function saveStats(){
fs.writeFileSync("stats.json", JSON.stringify(stats,null,2));
}

let liveTrades = [];
let totalTrades = 0;

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
   POSTBACK РЕГА
========================= */

app.get("/postback",(req,res)=>{

const click = req.query.click_id;
const trader = req.query.trader_id;

if(click && trader){

registeredUsers[click] = trader;

if(!deposits[trader]){
deposits[trader] = 0;
}

console.log("👤 регистрация:",click,"→",trader);

}

res.send("OK");

});


/* =========================
   DEV DEPOSIT
========================= */

app.get("/dev-deposit",(req,res)=>{

if(!DEV_MODE){
return res.send("dev mode off");
}

const trader = req.query.trader_id;
const amount = parseFloat(req.query.amount || 25);

if(trader){

deposits[trader] = amount;

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
const foundRAM = Object.values(registeredUsers).includes(traderInput);

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
   LOCAL STATS GENERATOR
========================= */

setInterval(()=>{

/* users */
if(Math.random() > 0.6){
stats.users += 1;
}

/* profit */
stats.profit += Math.floor(Math.random()*500);

/* winrate */
if(Math.random()>0.8){
stats.win += Math.random()>0.5 ? 1 : -1;
}

if(stats.win>87) stats.win=87;
if(stats.win<63) stats.win=63;

stats.loss = 100 - stats.win;

/* время Киев */
let kyiv = new Date().toLocaleString("en-US",{timeZone:"Europe/Kyiv"});
let hour = new Date(kyiv).getHours().toString().padStart(2,"0");

stats.time = hour+":00";

/* сохраняем */
saveStats();

console.log("📈 stats updated");

},15000);
app.get("/ping",(req,res)=>{
res.send("ok");
});

/* =========================
   REAL MARKET SIMULATOR
========================= */

setInterval(()=>{

let pairs = ["EUR/USD","GBP/USD","BTC","ETH","GOLD","USD/JPY"];

let pair = pairs[Math.floor(Math.random()*pairs.length)];

let end = Math.floor(100 + Math.random()*900);

let id = "ID 12****" + end;

/* сумма сделки */
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

/* win / loss */
let winrateTarget = 0.63 + Math.random()*0.26;
let isWin = Math.random() < winrateTarget;

let result = isWin ? "win":"loss";

/* обновляем статистику */

totalTrades++;

if(isWin){
stats.profit += Math.floor(amount*0.7);
stats.win++;
}else{
stats.profit -= Math.floor(amount*0.5);
stats.loss++;
}

/* winrate */

let total = stats.win + stats.loss;

let winrate = Math.floor((stats.win/total)*100);

if(winrate > 87) winrate = 87;
if(winrate < 63) winrate = 63;

stats.win = winrate;
stats.loss = 100-winrate;

/* users растут */

if(Math.random()>0.85){
stats.users += Math.floor(Math.random()*2)+1;
}

/* время */

let kyiv = new Date().toLocaleString("en-US",{timeZone:"Europe/Kyiv"});
let hour = new Date(kyiv).getHours().toString().padStart(2,"0");

stats.time = hour+":00";

/* push trade */

liveTrades.push({
id,
pair,
amount,
result,
time:Date.now()
});

if(liveTrades.length > 40){
liveTrades = liveTrades.slice(-40);
}

/* сохраняем */

saveStats();

console.log("📈 trade generated");

},4000);

require("./public/bot/bot");

app.get("/stats",(req,res)=>{
res.json(stats);
});

app.get("/live",(req,res)=>{
res.json(liveTrades);
});