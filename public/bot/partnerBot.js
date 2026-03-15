const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const TOKEN = process.env.PARTNER_BOT_TOKEN;
const ADMIN_ID = 838408932;

const CHECK_URL = "https://ai-boost.onrender.com/check-deposit?trader_id=";

const bot = new TelegramBot(TOKEN,{ polling:true });

let partners = {};
let pending = {};
let approved = {};
let withdrawRequests = {};

/* =========================
START
========================= */

bot.onText(/\/start/, (msg)=>{

const id = msg.from.id;

if(!partners[id]){
partners[id] = {ftd:0,balance:0};
}

bot.sendMessage(id,"🤝 AI BOOST Partners",{
reply_markup:{
keyboard:[
["🔎 Чек депозит"],
["📊 Статистика"],
["💰 Вывод"]
],
resize_keyboard:true
}
});

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
Баланс: $${p.balance}`
);

});

/* =========================
ЧЕК ДЕПОЗИТ
========================= */

bot.onText(/🔎 Чек депозит/, (msg)=>{

bot.sendMessage(msg.from.id,"Введите Trader ID клиента");

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
Баланс: $${p.balance}`);
}

withdrawRequests[id] = true;

bot.sendMessage(id,"Введите USDT TRC20 адрес");

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

if(withdrawRequests[id]){

withdrawRequests[id] = false;

bot.sendMessage(ADMIN_ID,
`💰 Запрос вывода

Partner: ${id}
Сумма: $${partners[id].balance}

Адрес:
${text}`,
{
reply_markup:{
inline_keyboard:[
[
{ text:"✅ Выплачено", callback_data:`paid_${id}` },
{ text:"❌ Отменить", callback_data:`cancel_${id}` }
]
]
}
});

bot.sendMessage(id,"⏳ Запрос отправлен на проверку");

}

/* =========================
TRADER ID
========================= */

if(!/^\d+$/.test(text)) return;

const trader = text;

try{

const res = await fetch(CHECK_URL + trader);
const data = await res.json();

if(!data.ok){
return bot.sendMessage(id,"❌ Депозит не найден");
}

pending[trader] = {
partner:id,
amount:data.amount
};

bot.sendMessage(id,
`⏳ Депозит найден

Trader ID: ${trader}
Сумма: $${data.amount}

Ожидает апрува`
);

/* уведомление админу */

bot.sendMessage(ADMIN_ID,
`⚡ Новый депозит

Trader ID: ${trader}
Сумма: $${data.amount}

Напишите:
/approve ${trader}`
);

}catch(e){

bot.sendMessage(id,"⚠️ Ошибка проверки");

}

});

/* =========================
АПРУВ (АДМИН)
========================= */

bot.onText(/\/approve (.+)/, async (msg,match)=>{

if(msg.from.id !== ADMIN_ID) return;

const trader = match[1];

try{

const res = await fetch(CHECK_URL + trader);
const data = await res.json();

if(!data.ok){
return bot.sendMessage(ADMIN_ID,"❌ Депозит не найден");
}

let partner = null;

for(let t in pending){
if(t === trader){
partner = pending[t].partner;
}
}

if(!partner){
return bot.sendMessage(ADMIN_ID,"❌ Партнёр не найден");
}

const amount = data.amount;

let reward = 0;

if(amount >=10 && amount <20){
reward = amount * 0.30;
}

if(amount >=20){
reward = amount * 0.50;
}

partners[partner].ftd +=1;
partners[partner].balance += reward;

delete pending[trader];

bot.sendMessage(partner,

`✅ Депозит апрувнут

Trader ID: ${trader}
Начислено: $${reward.toFixed(2)}`

);

bot.sendMessage(ADMIN_ID,"✅ Апрув выполнен");

}catch(e){

bot.sendMessage(ADMIN_ID,"⚠️ Ошибка апрува");

}

});


/* =========================
ВЫПЛАТА
========================= */

bot.on("callback_query",(query)=>{

const data = query.data;

if(!data) return;

if(data.startsWith("paid_")){

const id = data.split("_")[1];

bot.sendMessage(id,
`💸 Выплата отправлена

Сумма: $${partners[id].balance}`
);

partners[id].balance = 0;

bot.answerCallbackQuery(query.id);

}

if(data.startsWith("cancel_")){

const id = data.split("_")[1];

bot.sendMessage(id,"❌ Выплата отклонена");

bot.answerCallbackQuery(query.id);

}

});

module.exports = { bot };
