const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const TOKEN = process.env.PARTNER_BOT_TOKEN;
const ADMIN_ID = 838408932;

const CHECK_URL = "https://ai-boost.onrender.com/check-deposit?trader_id=";
const APPROVE_URL = "https://ai-boost.onrender.com/check-approve?trader_id=";

const bot = new TelegramBot(TOKEN);

bot.deleteWebHook().then(()=>{
bot.startPolling();
});

let partners = {};
let pending = {};
let approved = {};

/* =========================
START
========================= */

bot.onText(/\/start/, (msg)=>{

const id = msg.from.id;

if(!partners[id]){
partners[id] = {
ftd:0,
balance:0,
withdraw:false
};
}

bot.sendMessage(id,"🤝 AI BOOST Partners",{
reply_markup:{
keyboard:[
["⏳ Ждут апрува"],
["📊 Статистика"],
["💰 Вывод"]
],
resize_keyboard:true
}
});

});

/* =========================
ЖДУТ АПРУВА
========================= */

bot.onText(/⏳ Ждут апрува/, (msg)=>{

const id = msg.from.id;

let list = [];

for(let t in pending){

if(pending[t].partner === id){

list.push(`ID: ${t} ($${pending[t].amount})`);

}

}

if(list.length===0){
return bot.sendMessage(id,"Нет депозитов ожидающих апрува.");
}

bot.sendMessage(id,

`⏳ Ожидают апрува

${list.join("\n")}`

);

});

/* =========================
СТАТИСТИКА
========================= */

bot.onText(/📊 Статистика/, (msg)=>{

const id = msg.from.id;

const p = partners[id];

if(!p){
return bot.sendMessage(id,"Нет статистики.");
}

bot.sendMessage(id,

`📊 Ваша статистика

FTD: ${p.ftd}
Баланс: $${p.balance.toFixed(2)}`

);

});

/* =========================
ВЫВОД
========================= */

bot.onText(/💰 Вывод/, (msg)=>{

const id = msg.from.id;

const p = partners[id];

if(p.balance < 100){
return bot.sendMessage(id,

`❌ Минимальная выплата $100
Ваш баланс: $${p.balance.toFixed(2)}`

);
}

partners[id].withdraw = true;

bot.sendMessage(id,"Введите ваш USDT TRC20 адрес");

});

/* =========================
MESSAGE
========================= */

bot.on("message", async (msg)=>{

const id = msg.from.id;
const text = msg.text;

if(!text) return;

if(text.startsWith("/")) return;

/* =========================
ВЫВОД
========================= */

if(partners[id] && partners[id].withdraw){

partners[id].withdraw = false;

bot.sendMessage(ADMIN_ID,

`💰 Запрос выплаты

Telegram: ${id}
Сумма: $${partners[id].balance}

USDT TRC20:
${text}`

);

bot.sendMessage(id,"✅ Запрос отправлен.");

return;

}

/* =========================
TRADER ID
========================= */

if(!/^\d+$/.test(text)) return;

const trader = text;

if(approved[trader]){
return bot.sendMessage(id,"⚠️ Этот депозит уже был апрувнут.");
}

try{

const res = await fetch(CHECK_URL + trader);
const data = await res.json();

if(!data.ok){
return bot.sendMessage(id,"❌ Депозит не найден");
}

/* если первый раз */

if(!pending[trader]){

pending[trader] = {
partner:id,
amount:data.amount
};

return bot.sendMessage(id,

`⏳ Депозит найден

Trader ID: ${trader}
Сумма: $${data.amount}

Ожидает апрува`

);

}

/* проверяем апрув */

const approve = await fetch(APPROVE_URL + trader);
const approveData = await approve.json();

if(!approveData.ok){
return bot.sendMessage(id,"⏳ Всё ещё ожидает апрува.");
}

/* апрув */

approved[trader] = true;

const amount = pending[trader].amount;

let reward = 0;

if(amount >=10 && amount <20){
reward = amount*0.30;
}

if(amount>=20){
reward = amount*0.50;
}

partners[id].ftd +=1;
partners[id].balance += reward;

delete pending[trader];

bot.sendMessage(id,

`✅ Депозит апрувнут

Trader ID: ${trader}

Начислено: $${reward.toFixed(2)}`

);

}catch(e){

bot.sendMessage(id,"⚠️ Ошибка проверки.");

}

});

module.exports = { bot };
