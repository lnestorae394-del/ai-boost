const TelegramBot = require("node-telegram-bot-api");
const admin = require("firebase-admin");

const TOKEN = process.env.PARTNER_BOT_TOKEN;
const ADMIN_ID = 838408932;

/* FIREBASE */

if (!admin.apps.length) {
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
credential: admin.credential.cert(serviceAccount)
});
}

const db = admin.firestore();

const bot = new TelegramBot(TOKEN);
bot.deleteWebHook().then(()=>bot.startPolling());

/* ========================= */

function now(){
return new Date().toLocaleString("ru-RU",{timeZone:"Europe/Kyiv"});
}

/* =========================
START + РЕФКА
========================= */

bot.onText(/\/start(?: (.+))?/, async (msg,match)=>{

const id = String(msg.from.id);
const username = msg.from.username || "";

const ref = match[1];

/* создаём партнёра */

await db.collection("partners").doc(id).set({
reg:0,
ftd:0,
balance:0,
username
},{merge:true});

/* регистрация */

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

ID: ${id}
@${username}

🔗 Бот:
${botLink}

🌐 Сайт:
${siteLink}`,

{
reply_markup:{
keyboard:[
["👤 Профиль"],
["📜 История"],
["💰 Вывод"],
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
const p = doc.data();

bot.sendMessage(id,

`👤 Профиль

Регистрации: ${p.reg}
FTD: ${p.ftd}

Баланс: $${p.balance}`
);

});

/* =========================
ИСТОРИЯ
========================= */

bot.onText(/📜 История/, async (msg)=>{

const id = String(msg.from.id);

const snap = await db.collection("referrals")
.where("partner","==",id)
.where("ftd","==",true)
.get();

if(snap.empty){
return bot.sendMessage(id,"Пусто");
}

let text = "📜 История\n\n";

snap.docs.slice(-20).forEach(doc=>{

const d = doc.data();

text +=
`ID: ${doc.id}
$${d.amount}

`;

});

bot.sendMessage(id,text);

});

/* =========================
ВЫВОД
========================= */

let withdraw = {};

bot.onText(/💰 Вывод/, async (msg)=>{

const id = String(msg.from.id);

const doc = await db.collection("partners").doc(id).get();
const balance = doc.data().balance;

if(balance < 100){
return bot.sendMessage(id,`❌ Мин $100\nБаланс: $${balance}`);
}

withdraw[id] = true;

bot.sendMessage(id,"Введите TRC20");

});

bot.on("message", async (msg)=>{

const id = String(msg.from.id);
const text = msg.text;

if(!text) return;

if(withdraw[id]){

withdraw[id] = false;

const doc = await db.collection("partners").doc(id).get();
const amount = doc.data().balance;

/* создаём вывод */

await db.collection("withdraws").add({
partner:id,
amount,
address:text,
status:"pending",
date:Date.now()
});

/* обнуляем */

await db.collection("partners").doc(id).update({
balance:0
});

/* админу */

bot.sendMessage(ADMIN_ID,

`💰 Вывод

${id}
$${amount}

${text}`,

{
reply_markup:{
inline_keyboard:[
[
{ text:"✅", callback_data:`paid_${id}` },
{ text:"❌", callback_data:`cancel_${id}` }
]
]
}
}
);

bot.sendMessage(id,"⏳ Ожидайте");

}

});

/* =========================
АДМИН
========================= */

bot.on("callback_query", async (q)=>{

const data = q.data;

if(data.startsWith("paid_")){
const id = data.split("_")[1];

bot.sendMessage(id,"✅ Выплачено");
}

if(data.startsWith("cancel_")){

const id = data.split("_")[1];

bot.sendMessage(id,"❌ Отказ");

}

bot.answerCallbackQuery(q.id);

});

module.exports = { bot };