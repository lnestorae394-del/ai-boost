const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

/* =========================
CONFIG
========================= */

const TOKEN = process.env.PARTNER_BOT_TOKEN;
const ADMIN_ID = 838408932;
const CHECK_URL = "https://ai-boost.onrender.com/check-deposit?trader_id=";

if(!TOKEN){
console.error("❌ PARTNER_BOT_TOKEN missing");
return;
}

/* =========================
BOT START
========================= */

const bot = new TelegramBot(TOKEN);

async function startBot(){

try{

await bot.deleteWebHook();
await bot.startPolling();

console.log("🤖 Partner bot started");

}catch(e){

console.log("BOT START ERROR", e);

}

}

startBot();

/* =========================
DATABASE
========================= */

let partners = {};
let checkedIDs = {};

/* =========================
START
========================= */

bot.onText(/\/start/, (msg)=>{

const id = msg.from.id;

if(!partners[id]){

partners[id] = {
ftd:0,
balance:0
};

}

bot.sendMessage(id,
`🤝 AI BOOST Partners

Отправьте Trader ID клиента для проверки депозита.

Пример:
728192

Команды:
/stats
/withdraw`);

});

/* =========================
STATS
========================= */

bot.onText(/\/stats/, (msg)=>{

const id = msg.from.id;

if(!partners[id]){

return bot.sendMessage(id,"Вы ещё не проверяли клиентов.");

}

let p = partners[id];

bot.sendMessage(id,
`📊 Ваша статистика

FTD: ${p.ftd}
Баланс: $${p.balance}`);

});

/* =========================
WITHDRAW
========================= */

bot.onText(/\/withdraw/, (msg)=>{

const id = msg.from.id;

if(!partners[id]){
return bot.sendMessage(id,"Нет статистики.");
}

let p = partners[id];

if(p.balance < 100){

return bot.sendMessage(id,
`❌ Минимальная выплата $100

Ваш баланс: $${p.balance}`);

}

bot.sendMessage(ADMIN_ID,
`💰 Запрос выплаты

Telegram: ${id}
Сумма: $${p.balance}`);

bot.sendMessage(id,
"✅ Запрос отправлен.");

});

/* =========================
CHECK TRADER ID
========================= */

bot.on("message", async (msg)=>{

const id = msg.from.id;
const text = msg.text;

if(!text) return;
if(text.startsWith("/")) return;

/* проверяем что это число */

if(!/^\d+$/.test(text)) return;

const trader = text;

/* проверка на повтор */

if(checkedIDs[trader]){

return bot.sendMessage(id,
"⚠️ Этот Trader ID уже был засчитан.");

}

try{

const res = await fetch(CHECK_URL + trader);
const data = await res.json();

if(data.ok){

checkedIDs[trader] = true;

if(!partners[id]){

partners[id] = {
ftd:0,
balance:0
};

}

partners[id].ftd += 1;

/* считаем выплату */

let reward = data.amount * 0.5;

partners[id].balance += reward;

bot.sendMessage(id,
`✅ Депозит найден

Trader ID: ${trader}
Сумма: $${data.amount}

FTD +1
Начислено: $${reward}`);

}else{

bot.sendMessage(id,
"❌ Депозит не найден или меньше $10");

}

}catch(e){

bot.sendMessage(id,
"⚠️ Ошибка проверки.");

}

});