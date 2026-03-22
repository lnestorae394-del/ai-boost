const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN) ;

bot.start(async (ctx) => {

await ctx.replyWithVideo(
"BAACAgIAAxkBAAMJaaiYS2XbNyULVCs4MaBRvGrwQVUAAmCsAALna0BJjEIHjSEGSnA6BA",
{
    caption:`
Поддержка : 
@hiddendinoxsupport

Увеличьте свои шансы на успешную торговлю с помощью AI BOOST! 👇

`,
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

bot.launch();

bot.on("message", (ctx) => {
console.log(ctx.message.video);
});