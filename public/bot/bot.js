const { Telegraf } = require("telegraf");

console.log("🤖 bot file loaded");

const bot = new Telegraf(process.env.BOT_TOKEN);

// обработка /start
bot.start(async (ctx) => {
  console.log("🔥 /start received");

  try {
    await ctx.replyWithVideo(
      "BAACAgIAAxkBAAMJaaiYS2XbNyULVCs4MaBRvGrwQVUAAmCsAALna0BJjEIHjSEGSnA6BA",
      {
        caption: `
Поддержка: @hiddendinoxsupport

Увеличьте свои шансы на успешную торговлю с помощью AI BOOST! 👇
        `,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🟢 Открыть AI BOOST",
                web_app: {
                  url: "https://aiboost.trade/register" // 🔥 лучше свой домен
                }
              }
            ]
          ]
        }
      }
    );
  } catch (e) {
    console.log("❌ send error:", e);
  }
});

// лог всех сообщений
bot.on("message", (ctx) => {
  console.log("📩 message:", ctx.message);
});

// ловим ошибки
bot.catch((err) => {
  console.log("🚨 BOT ERROR:", err);
});

// запуск
bot.launch({
  dropPendingUpdates: true
}).then(() => {
  console.log("🚀 BOT STARTED");
});

// корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));