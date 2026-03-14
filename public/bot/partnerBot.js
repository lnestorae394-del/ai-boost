const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.PARTNER_BOT_TOKEN,{
    polling:true
});

const ADMIN_ID = 123456789; // твой telegram id

let partners = {};

bot.onText(/\/start/, (msg)=>{

const id = msg.from.id;
const username = msg.from.username || "no_username";

bot.sendMessage(id,
`🤝 AI BOOST Partner Program

Ваш запрос на подключение партнёрской программы отправлен.

Ожидайте, менеджер свяжется с вами.`);

bot.sendMessage(ADMIN_ID,
`⚡ Новый запрос партнёра

User: @${username}
ID: ${id}`);

});


bot.on("message",(msg)=>{

const id = msg.from.id;
const text = msg.text;

if(!text) return;

if(text.includes("shortink")){

const partnerID = "ref_" + Math.floor(Math.random()*999999);

partners[partnerID] = {
telegram:id,
link:text,
clicks:0,
regs:0,
ftd:0,
balance:0
};

bot.sendMessage(id,
`✅ Партнёр подключен

Ваша ссылка:

https://t.me/aiboost_bot?start=${partnerID}

Отправляйте её пользователям.`);

}

});

bot.onText(/\/stats/, (msg)=>{

const id = msg.from.id;

const partner = Object.keys(partners).find(
p => partners[p].telegram === id
);

if(!partner){
return bot.sendMessage(id,"Вы не подключены к партнёрке");
}

let s = partners[partner];

bot.sendMessage(id,
`📊 Статистика

Клики: ${s.clicks}
Регистрации: ${s.regs}
FTD: ${s.ftd}

Баланс: $${s.balance}`);

});

bot.onText(/\/withdraw/, (msg)=>{

const id = msg.from.id;

bot.sendMessage(ADMIN_ID,
`💰 Запрос выплаты

Partner: ${id}`);

bot.sendMessage(id,
`Запрос на выплату отправлен.`);

});