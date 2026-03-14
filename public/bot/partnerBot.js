const TelegramBot = require("node-telegram-bot-api");

/* =========================
CONFIG
========================= */

const TOKEN = process.env.PARTNER_BOT_TOKEN;
const ADMIN_ID = 838408932;

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
RAM DATABASE
========================= */

let partners = {};

/* =========================
START
========================= */

bot.onText(/\/start(?: (.+))?/, (msg, match)=>{

const id = msg.from.id;
const username = msg.from.username ? "@"+msg.from.username : "нет username";
const name = msg.from.first_name || "user";

const ref = match[1];

/* если пользователь пришёл по рефке */

if(ref && partners[ref]){

partners[ref].clicks += 1;

}

/* сообщение пользователю */

bot.sendMessage(id,
`🤝 AI BOOST Partner Program

Ваш запрос на подключение партнёрской программы отправлен.

Ожидайте, менеджер свяжется с вами.`);

/* уведомление админу */

bot.sendMessage(ADMIN_ID,
`⚡ Новый запрос партнёра

Имя: ${name}
Username: ${username}
Telegram ID: ${id}`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✉️ Написать",
url:`tg://user?id=${id}`
}
]
]
}
});

});

/* =========================
ДОБАВЛЕНИЕ POCKET ССЫЛКИ
========================= */

bot.on("message",(msg)=>{

const id = msg.from.id;
const text = msg.text;

if(!text) return;
if(text.startsWith("/")) return;

/* принимаем только pocket */

if(text.includes("shortink")){

let exists = Object.values(partners).find(
p => p.telegram === id
);

if(exists){

return bot.sendMessage(id,
"Вы уже подключены к партнёрской программе.");

}

/* создаём ref */

const partnerID =
"ref_" + Math.random().toString(36).substring(2,10);

partners[partnerID] = {

telegram:id,
username:msg.from.username || "none",
link:text,

clicks:0,
regs:0,
ftd:0,
balance:0

};

bot.sendMessage(id,
`✅ Партнёр подключен

Ваша партнёрская ссылка:

https://t.me/aiboost_partner_bot?start=${partnerID}

Отправляйте её пользователям.`);

}

});

/* =========================
СТАТИСТИКА
========================= */

bot.onText(/\/stats/, (msg)=>{

const id = msg.from.id;

const partner = Object.keys(partners).find(
p => partners[p].telegram === id
);

if(!partner){

return bot.sendMessage(id,
"Вы не подключены к партнёрской программе.");

}

let s = partners[partner];

bot.sendMessage(id,
`📊 Статистика

Клики: ${s.clicks}
Регистрации: ${s.regs}
FTD: ${s.ftd}

Баланс: $${s.balance}`);

});

/* =========================
ВЫВОД
========================= */

bot.onText(/\/withdraw/, (msg)=>{

const id = msg.from.id;

const partner = Object.keys(partners).find(
p => partners[p].telegram === id
);

if(!partner){

return bot.sendMessage(id,
"Вы не партнёр.");

}

let s = partners[partner];

/* минималка */

if(s.balance < 100){

return bot.sendMessage(id,
`❌ Минимальная сумма вывода $100

Ваш баланс: $${s.balance}`);

}

/* запрос админу */

bot.sendMessage(ADMIN_ID,
`💰 Запрос выплаты

Partner ID: ${partner}
Telegram: ${id}
Сумма: $${s.balance}`);

bot.sendMessage(id,
`✅ Запрос на выплату отправлен.`);

});