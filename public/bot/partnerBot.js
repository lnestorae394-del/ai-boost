const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.PARTNER_BOT_TOKEN,{
polling:true
});

/* ТВОЙ TELEGRAM ID */
const ADMIN_ID = 838408932;

/* ПАРТНЁРЫ */
let partners = {};

/* =========================
   START
========================= */

bot.onText(/\/start/, (msg)=>{

const id = msg.from.id;
const username = msg.from.username ? "@"+msg.from.username : "нет username";
const name = msg.from.first_name || "user";

/* сообщение пользователю */

bot.sendMessage(id,
`🤝 AI BOOST Partner Program

Ваш запрос на подключение партнёрской программы отправлен.

Ожидайте, менеджер свяжется с вами.`);

/* сообщение админу */

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
}

);

});


/* =========================
   ПОДКЛЮЧЕНИЕ ССЫЛКИ
========================= */

bot.on("message",(msg)=>{

const id = msg.from.id;
const text = msg.text;

if(!text) return;

/* принимаем только pocket ссылки */

if(text.includes("shortink")){

/* проверка если уже партнёр */

let exists = Object.values(partners).find(
p => p.telegram === id
);

if(exists){
return bot.sendMessage(id,
"Вы уже подключены к партнёрской программе.");
}

/* создаём ID */

const partnerID =
"ref_" + Math.random().toString(36).substring(2,10);

/* сохраняем */

partners[partnerID] = {

telegram:id,
username:msg.from.username || "none",
link:text,

clicks:0,
regs:0,
ftd:0,
balance:0

};

/* выдаём ссылку */

bot.sendMessage(id,
`✅ Партнёр подключен

Ваша партнёрская ссылка:

https://t.me/aiboost_bot?start=${partnerID}

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

bot.sendMessage(ADMIN_ID,
`💰 Запрос выплаты

Partner: ${id}`);

bot.sendMessage(id,
`Запрос на выплату отправлен.`);

});