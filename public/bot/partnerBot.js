const TelegramBot = require("node-telegram-bot-api");
const admin = require("firebase-admin");

/* =========================
CONFIG
========================= */

const TOKEN = process.env.PARTNER_BOT_TOKEN;
const ADMIN_ID = 838408932;

/* =========================
INIT
========================= */

const bot = new TelegramBot(TOKEN);
bot.deleteWebHook().then(()=>bot.startPolling());

const db = admin.firestore();

/* =========================
HELPERS
========================= */

function now(){
return new Date().toLocaleString("ru-RU",{
timeZone:"Europe/Kyiv"
});
}

function calcReward(amount){
if(amount >=10 && amount <20) return amount * 0.30;
if(amount >=20) return amount * 0.50;
return 0;
}

/* =========================
START + REF
========================= */

bot.onText(/\/start(?: (.+))?/, async (msg,match)=>{

const id = String(msg.from.id);
const username = msg.from.username || "";

const ref = match[1];

/* создаём партнёра если нет */

const partnerRef = db.collection("partners").doc(id);
const doc = await partnerRef.get();

if(!doc.exists){
await partnerRef.set({
reg:0,
ftd:0,
balance:0,
pending:0,
username
});
}

/* если пришёл по рефке */

if(ref && ref !== id){

await db.collection("users").doc(id).set({
partner: ref,
created: Date.now()
});

await db.collection("partners").doc(ref).update({
reg: admin.firestore.FieldValue.increment(1)
});
}

/* ссылки */

const botLink = `https://t.me/aiboost_partner_bot?start=${id}`;
const siteLink = `https://aiboost.trade/?ref=${id}`;

bot.sendMessage(id,

`🤝 AI BOOST PARTNERS

🆔 ID: ${id}
👤 Username: @${username}

🔗 Ваша ссылка:
${botLink}

🌐 Сайт:
${siteLink}`,

{
reply_markup:{
keyboard:[
["👤 Профиль"],
["📥 Ожидание","📜 История"],
["💸 Выплаты","💰 Вывод"],
["📞 Поддержка"]
],
resize_keyboard:true
}
});

});

/* =========================
ПРОФИЛЬ
========================= */

bot.onText(/👤 Профиль/, async (msg)=>{

const id = String(msg.from.id);

const doc = await db.collection("partners").doc(id).get();

if(!doc.exists){
return bot.sendMessage(id,"Нет данных");
}

const p = doc.data();

bot.sendMessage(id,

`👤 Профиль

ID: ${id}

👥 Регистрации: ${p.reg}
💰 FTD: ${p.ftd}

💵 Баланс: $${p.balance}`
);

});

/* =========================
ИСТОРИЯ
========================= */

bot.onText(/📜 История/, async (msg)=>{

const id = String(msg.from.id);

const snap = await db.collection("traders")
.where("partner","==",id)
.where("status","==","ftd")
.get();

if(snap.empty){
return bot.sendMessage(id,"История пуста");
}

let text = "📜 История\n\n";

snap.docs.slice(-20).forEach(doc=>{
const d = doc.data();

text +=
`Trader: ${doc.id}
Сумма: $${d.amount}
Начислено: $${d.reward}

`;
});

bot.sendMessage(id,text);

});

/* =========================
ВЫВОД
========================= */

let withdrawState = {};

bot.onText(/💰 Вывод/, async (msg)=>{

const id = String(msg.from.id);

const doc = await db.collection("partners").doc(id).get();
const balance = doc.data().balance;

if(balance < 100){
return bot.sendMessage(id,`❌ Минимум $100\nБаланс: $${balance}`);
}

withdrawState[id] = true;

bot.sendMessage(id,"Введите TRC20 адрес");

});

bot.on("message", async (msg)=>{

const id = String(msg.from.id);
const text = msg.text;

if(!text) return;

/* ввод адреса */

if(withdrawState[id]){

withdrawState[id] = false;

const partnerDoc = await db.collection("partners").doc(id).get();
const amount = partnerDoc.data().balance;

/* создаём вывод */

await db.collection("withdraws").add({
partner:id,
amount,
address:text,
status:"pending",
date:Date.now()
});

/* обнуляем баланс */

await db.collection("partners").doc(id).update({
balance:0
});

/* админу */

bot.sendMessage(ADMIN_ID,

`💰 Запрос вывода

ID: ${id}
Сумма: $${amount}

Адрес:
${text}`,

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

/* пользователю */

bot.sendMessage(id,"⏳ Заявка отправлена");

return;
}

});

/* =========================
АДМИН КНОПКИ
========================= */

bot.on("callback_query", async (q)=>{

const data = q.data;

if(!data) return;

/* выплачено */

if(data.startsWith("paid_")){

const id = data.split("_")[1];

bot.sendMessage(id,"💸 Выплата отправлена");

}

/* отклонено */

if(data.startsWith("cancel_")){

const id = data.split("_")[1];

bot.sendMessage(id,"❌ Выплата отклонена");

/* вернуть баланс */

const snap = await db.collection("withdraws")
.where("partner","==",id)
.where("status","==","pending")
.limit(1)
.get();

if(!snap.empty){

const w = snap.docs[0].data();

await db.collection("partners").doc(id).update({
balance: admin.firestore.FieldValue.increment(w.amount)
});

}

}

bot.answerCallbackQuery(q.id);

});

/* =========================
АВТОАПРУВ ИЗ СЕРВЕРА
========================= */

async function approveTrader(trader, amount){

const doc = await db.collection("traders").doc(trader).get();

if(!doc.exists) return;

const data = doc.data();
const partner = data.partner;

const reward = calcReward(amount);

/* обновляем трейдера */

await db.collection("traders").doc(trader).update({
status:"approved",
reward
});

/* обновляем партнёра */

await db.collection("partners").doc(String(partner)).update({
ftd: admin.firestore.FieldValue.increment(1),
balance: admin.firestore.FieldValue.increment(reward)
});

/* уведомление */

bot.sendMessage(partner,

`🔥 Новый апрув

Trader: ${trader}
Сумма: $${amount}

+ $${reward}`
);

console.log("AUTO APPROVE:", trader);

}

module.exports = { bot, approveTrader };