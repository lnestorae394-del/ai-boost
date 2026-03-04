const express = require("express");
const app = express();

app.use(express.json());

const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json"); // ключ Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/* =========================
   БАЗА
========================= */

let registeredUsers = {};
let deposits = {};

const DEV_MODE = true;


/* =========================
   🔒 ЗАЩИТА SIGNALS
========================= */

app.get("/signals",(req,res)=>{

const trader = req.query.trader_id;

const registered = Object.values(registeredUsers).includes(trader);
const amount = deposits[trader] || 0;

if(!registered || amount < 10){

console.log("⛔ попытка открыть signals:",trader);

return res.sendFile(__dirname + "/public/index.html");

}

console.log("✅ доступ к signals:",trader);

res.sendFile(__dirname + "/public/signals.html");

});


/* =========================
   STATIC
========================= */

app.use(express.static("public"));


/* =========================
   РЕГА POSTBACK
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

try{

const snapshot = await db.collection("users")
.where("trader_id","==",traderInput)
.get();

if(!snapshot.empty){

return res.json({
ok:true,
trader_id: traderInput
});

}else{

return res.json({
ok:false
});

}

}catch(e){

console.log("check error", e);

return res.json({ok:false});

}

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


app.get("/price",(req,res)=>{
res.json({
price: currentPrice,
pair: currentPair
});
});


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

app.listen(3000,()=>{

console.log("🚀 SERVER START http://localhost:3000");
console.log("🧪 DEV MODE:",DEV_MODE);

});