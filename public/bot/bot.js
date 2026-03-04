bot.start(async (ctx) => {

await ctx.replyWithVideo(
"FILE_ID_ТВОЕГО_ВИДЕО",
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

bot.on("message", (ctx) => {
console.log(ctx.message.video);
});