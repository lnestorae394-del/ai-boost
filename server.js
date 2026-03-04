const express = require("express");
const app = express();

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

let registeredUsers = {};
let deposits = {};

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
   FIREBASE AUTO STATS BOT
========================= */

setInterval(async()=>{

try{

const ref = db.collection("stats").doc("global");
const snap = await ref.get();

if(!snap.exists) return;

let d = snap.data();

let users = Number(d.users || 4000);
let profit = Number(d.profit || 900000);
let win = Number(d.win || 74);

/* рост пользователей */
if(Math.random() > 0.6){
users += 1;
}

/* профит */
profit += Math.floor(Math.random()*500);

/* winrate немного колеблется */
if(Math.random()>0.8){
win += Math.random()>0.5 ? 1 : -1;
}

if(win>87) win=87;
if(win<63) win=63;

const kyiv = new Date().toLocaleString("en-US",{timeZone:"Europe/Kyiv"});
let hour = new Date(kyiv).getHours().toString().padStart(2,"0");

await ref.update({
users: Math.floor(users),
profit: Math.floor(profit),
win: Math.floor(win),
loss: 100-Math.floor(win),
time: hour+":00"
});

console.log("stats updated");

}catch(e){
console.log("stats bot error",e);
}

},15000);

app.get("/ping",(req,res)=>{
res.send("ok");
});

/* =========================
   LIVE MARKET GENERATOR
========================= */

if(global.aiBoostStarted){
console.log("generator already running");
return;
}

global.aiBoostStarted = true;

setInterval(async()=>{

try{

if(!db){
console.log("firebase not ready");
return;
}

const statsRef = db.collection("stats").doc("global");
const liveRef = db.collection("liveTrades").doc("stream");

const statsSnap = await statsRef.get();
const liveSnap = await liveRef.get();

if(!statsSnap.exists) return;

let stats = statsSnap.data();

let profit = Number(stats.profit || 100000);
let win = Number(stats.win || 70);
let users = Number(stats.users || 4000);

let arr = liveSnap.exists ? (liveSnap.data().list || []) : [];

/* пары */
let pairs = ["EUR/USD","GBP/USD","BTC","ETH","GOLD","USD/JPY"];
let pair = pairs[Math.floor(Math.random()*pairs.length)];

/* ID */
let id = "ID 12****" + Math.floor(100 + Math.random()*900);

/* сумма */
let amount;

if(Math.random()<0.7){
amount = Math.floor(Math.random()*250)+40;
}else if(Math.random()<0.9){
amount = Math.floor(Math.random()*900)+200;
}else{
amount = Math.floor(Math.random()*3000)+900;
}

/* win / loss */
let isWin = Math.random()>0.27;
let result = isWin ? "win":"loss";

/* PROFIT */
if(isWin){
profit += amount;
}else{
profit -= Math.floor(amount*0.4);
}

if(profit < 100000) profit = 100000;

/* winrate */
if(Math.random()>0.6){
win += Math.random()>0.5 ? 1 : -1;
if(win>87) win=87;
if(win<63) win=63;
}

/* users */
if(Math.random()>0.7) users+=1;
if(Math.random()<0.2) users-=1;

if(users<1000) users=1000;

/* push trade */
arr.push({
id,
pair,
amount,
result,
time: Date.now()
});

if(arr.length>40){
arr = arr.slice(arr.length-40);
}

/* время */
let now = new Date();

let h = now.toLocaleString("en-GB", {
 timeZone: "Europe/Kyiv",
 hour: "2-digit",
 hour12: false
});

/* запись */
await liveRef.update({list:arr});

await statsRef.update({
profit: Math.floor(profit),
users: Math.floor(users),
win: Math.floor(win),
loss: 100-Math.floor(win),
time: h+":00"
});

console.log("📈 trade generated");

}catch(e){
console.log("market generator error",e);
}

},7000);

