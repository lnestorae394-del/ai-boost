const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const TOKEN = process.env.PARTNER_BOT_TOKEN;
const ADMIN_ID = 838408932;

const CHECK_URL = "https://ai-boost.onrender.com/check-deposit?trader_id=";

const bot = new TelegramBot(TOKEN);

bot.deleteWebHook().then(()=>{
bot.startPolling();
});

let partners = {};
let pending = {};
let approved = {};
let withdraw = {};

/* =========================
START
========================= */

bot.onText(/\/start/, (msg)=>{

const id = msg.from.id;

if(!partners[id]){
partners[id] = { ftd:0, balance:0 };
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

if(!partners[id]){
return bot.sendMessage(id,"Нет статистики");
}

const p = partners[id];

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

if(!partners[id] || partners[id].balance < 100){
return bot.sendMessage(id,

`❌ Минимальная выплата $100
Баланс: $${partners[id] ? partners[id].balance : 0}`

);
}

withdraw[id] = true;

bot.sendMessage(id,"Введите USDT TRC20 адрес");

});

/* =========================
MESSAGE
========================= */

bot.on("message", async (msg)=>{

const id = msg.from.id;
const text = msg.text;

if(!text) return;

/* вывод */

if(withdraw[id]){

withdraw[id] = false;

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
{ text:"❌ Отмена", callback_data:`cancel_${id}` }
]
]
}
});

bot.sendMessage(id,"⏳ Запрос отправлен");

return;

}

/* проверка Trader ID */

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

bot.sendMessage(ADMIN_ID,

`⚡ Новый депозит

Trader ID: ${trader}
Сумма: $${data.amount}

Апрув:
/approve ${trader}`

);

}catch(e){

bot.sendMessage(id,"⚠️ Ошибка проверки");

}

});

/* =========================
APPROVE
========================= */

bot.onText(/\/approve (.+)/,(msg,match)=>{

if(msg.from.id !== ADMIN_ID) return;

const trader = match[1];

if(!pending[trader]){
return bot.sendMessage(ADMIN_ID,"❌ Нет такого депозита");
}

const partner = pending[trader].partner;
const amount = pending[trader].amount;

let reward = 0;

if(amount >=10 && amount <20){
reward = amount * 0.30;
}

if(amount >=20){
reward = amount * 0.50;
}

partners[partner].ftd += 1;
partners[partner].balance += reward;

approved[trader] = { partner, reward };

delete pending[trader];

bot.sendMessage(partner,

`✅ Депозит апрувнут

Trader ID: ${trader}
Начислено: $${reward.toFixed(2)}`

);

bot.sendMessage(ADMIN_ID,"✅ Апрув выполнен");

});

/* =========================
REJECT
========================= */

bot.onText(/\/reject (.+)/,(msg,match)=>{

if(msg.from.id !== ADMIN_ID) return;

const trader = match[1];

if(!approved[trader]){
return bot.sendMessage(ADMIN_ID,"❌ Нет апрува");
}

const partner = approved[trader].partner;
const reward = approved[trader].reward;

partners[partner].ftd -= 1;
partners[partner].balance -= reward;

delete approved[trader];

bot.sendMessage(partner,"❌ Апрув отменён");
bot.sendMessage(ADMIN_ID,"❌ Апрув отменён");

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

}

if(data.startsWith("cancel_")){

const id = data.split("_")[1];

bot.sendMessage(id,"❌ Выплата отклонена");

}

bot.answerCallbackQuery(query.id);

});

module.exports = { bot };
