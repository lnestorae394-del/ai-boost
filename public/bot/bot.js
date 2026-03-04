const { Telegraf } = require("telegraf");

const bot = new Telegraf("8512877378:AAGStXnDV1Gif93KQfkHvIadB77Go9pVKdw");

bot.start(async (ctx) => {

await ctx.replyWithVideo(
"BAACAgIAAxkBAAMJaaiYS2XbNyULVCs4MaBRvGrwQVUAAmCsAALna0BJjEIHjSEGSnA6BA",
{
caption:`Инструкция AI BOOST`,
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