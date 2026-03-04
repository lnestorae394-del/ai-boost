const express = require("express");
const app = express();

app.use(express.json());

/* =========================
   FIREBASE
========================= */

const admin = require("firebase-admin");

let db = null;

try{

const serviceAccount = require("./serviceAccountKey.json");

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

app.use(express.static("public"));


/* =========================
   SIGNALS PAGE
========================= */

app.get("/signals",(req,res)=>{
res.sendFile(__dirname + "/public/signals.html");
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
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{

console.log("🚀 SERVER START");
console.log("PORT:",PORT);
console.log("🧪 DEV MODE:",DEV_MODE);

});