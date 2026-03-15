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

let history = {};      // история депозитов
let withdrawHistory = {}; // история выводов

function now(){

return new Date().toLocaleString("ru-RU",{
timeZone:"Europe/Kyiv"
});

}

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
["🔎 Чек депозит","⏳ Ожидают апруфа"],
["📊 Статистика","📜 История"],
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

bot.onText(/⏳ Ожидают апруфа/, (msg)=>{

const id = msg.from.id;

let text = "⏳ Ожидают апруфа\n\n";
let found = false;

for(const trader in pending){

if(pending[trader].partner === id){

found = true;

text +=
`Trader ID: ${trader}
Сумма: $${pending[trader].amount}
Дата: ${pending[trader].date}

`;

}

}

if(!found){
text += "Нет депозитов на проверке";
}

bot.sendMessage(id,text);

});


bot.onText(/📜 История/, (msg)=>{

const id = msg.from.id;

if(!history[id]){
return bot.sendMessage(id,"История пуста");
}

let text = "📜 Апрувнутые депозиты\n\n";

history[id].slice(-20).forEach(h=>{

text +=
`Trader: ${h.trader}
Начислено: $${h.reward}
Дата: ${h.date}

`;

});

bot.sendMessage(id,text);

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

const date = now();

/* сообщение админу */

bot.sendMessage(
ADMIN_ID,
`💰 Запрос вывода

Telegram ID: ${id}
Сумма: $${partners[id].balance}

Адрес:
${text}

Дата: ${date}`,
{
reply_markup:{
inline_keyboard:[
[
{ text:"✅ Выплачено", callback_data:`paid_${id}` },
{ text:"❌ Отклонить", callback_data:`cancel_${id}` }
]
]
}
}
);

/* сообщение партнёру */

bot.sendMessage(
id,
"⏳ Запрос на вывод отправлен. Ожидайте подтверждения."
);

return;

}



/* проверка Trader ID */

if(!/^\d+$/.test(text)) return;

const trader = text;

if(pending[trader] || approved[trader]){

return bot.sendMessage(
id,
"⛔ Этот Trader ID уже был отправлен на проверку"
);

}
if(history[id]){

const used = history[id].find(h => h.trader === trader);

if(used){
return bot.sendMessage(id,"⛔ Этот Trader ID уже был апрувнут ранее");
}

}



try{

const res = await fetch(CHECK_URL + trader);
const data = await res.json();

if(!data.ok){
return bot.sendMessage(id,"❌ Депозит не найден");
}

pending[trader] = {
partner:id,
amount:data.amount,
date: now()
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

approved[trader] = {
partner,
reward,
date: now()
};

if(!history[partner]){
history[partner] = [];
}

history[partner].push({

trader,
reward,
date: now()

});


delete pending[trader];

bot.sendMessage(partner,

`🔥 Ваш клиент апрувнут

Trader ID: ${trader}

+1 FTD
Начислено: $${reward.toFixed(2)}

Дата: ${now()}`
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

if(!withdrawHistory[id]){
withdrawHistory[id] = [];
}

withdrawHistory[id].push({

amount: partners[id].balance,
date: now()

});

partners[id].balance = 0;

}

if(data.startsWith("cancel_")){

const id = data.split("_")[1];

bot.sendMessage(id,"❌ Выплата отклонена");

}

bot.answerCallbackQuery(query.id);

});

module.exports = { bot };

function approveTrader(trader, partner, amount){

/* если партнер не передан — ищем в pending */

if(!partner && pending[trader]){
partner = pending[trader].partner;
}

if(!partner){
console.log("❌ partner not found for trader", trader);
return;
}

let reward = 0;

if(amount >=10 && amount <20){
reward = amount * 0.30;
}

if(amount >=20){
reward = amount * 0.50;
}

/* создаем партнера если нет */

if(!partners[partner]){
partners[partner] = {ftd:0,balance:0};
}

/* начисление */

partners[partner].ftd += 1;
partners[partner].balance += reward;

/* история */

if(!history[partner]){
history[partner] = [];
}

history[partner].push({
trader,
reward,
date: now()
});

/* удаляем из ожидания */

delete pending[trader];

/* уведомление */

bot.sendMessage(
partner,
`✅ Человек апрувнут

Trader ID: ${trader}
Первый депозит: $${amount}

Начислено: $${reward.toFixed(2)}

Комиссия поступила на баланс`
);

console.log("✅ AUTO APPROVED:", trader, partner);

}

module.exports = { bot, approveTrader };
