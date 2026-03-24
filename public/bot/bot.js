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
                  url: process.env.WEB_APP_URL || "https://aiboost.trade/register"
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

function setup(app) {
  const APP_URL = process.env.APP_URL;
  const secret = process.env.BOT_TOKEN.split(":")[1].slice(0, 20);
  const path = `/webhook/bot/${secret}`;

  if (APP_URL) {
    bot.telegram.setWebhook(`${APP_URL}${path}`).then(() => {
      console.log("🚀 BOT webhook set");
    }).catch(e => {
      console.log("❌ BOT webhook error, falling back to polling:", e.message);
      bot.launch({ dropPendingUpdates: true });
    });

    app.use(bot.webhookCallback(path));
  } else {
    console.log("⚠️ APP_URL not set, using polling");
    bot.launch({ dropPendingUpdates: true });
  }
}

module.exports = { setup };

// корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
