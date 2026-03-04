const express = require("express");
const app = express();

app.use(express.json());

/* =========================
   БАЗА
========================= */
let registeredUsers = {};
let deposits = {};

const DEV_MODE = true;


/* =========================
   🔒 БЛОК ПРЯМОГО ДОСТУПА К HTML
========================= */

app.get("/:page.html", (req,res)=>{

const allowed = ["index"]; 

const page = req.params.page;

if(!allowed.includes(page)){

console.log("⛔ попытка открыть страницу:", page);

return res.sendFile(__dirname + "/public/index.html");

}

res.sendFile(__dirname + "/public/index.html");

});


/* =========================
   🔒 ЗАЩИТА SIGNALS
========================= */

app.get("/signals", (req,res)=>{

const trader = req.query.trader_id;

const registered = Object.values(registeredUsers).includes(trader);
const amount = deposits[trader] || 0;

if(!registered || amount < 10){

console.log("⛔ попытка открыть signals без доступа:", trader);

return res.sendFile(__dirname + "/public/index.html");

}

console.log("✅ доступ к signals:", trader);

res.sendFile(__dirname + "/public/signals.html");

});


/* =========================
   STATIC ФАЙЛЫ
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
console.log("💰 реальный депозит:",trader,"+",amount);
}

res.send("OK");

});


/* =========================
   ПРОВЕРКА ID
========================= */

app.get("/check",(req,res)=>{

const traderInput = req.query.trader_id;
const found = Object.values(registeredUsers).includes(traderInput);

if(found){
res.json({ok:true,trader_id:traderInput});
}else{
res.json({ok:false});
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

console.log("✅ доступ:",trader,amount);

res.json({
ok:true,
amount:amount
});

}else{

console.log("⛔ нет депозита:",trader);

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
res.json({price: currentPrice,pair: currentPair});
});


app.get("/get-entry",(req,res)=>{

let wait = 3000 + Math.random()*5000;

setTimeout(()=>{

let entry = currentPrice;
entry += (Math.random()-0.5)*0.00015;

res.json({entry: entry,pair: currentPair});

},wait);

});


/* =========================
   SERVER
========================= */

app.listen(3000,()=>{

console.log("🚀 SERVER START http://localhost:3000");
console.log("🧪 DEV MODE:",DEV_MODE);

});