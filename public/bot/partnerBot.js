const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.PARTNER_BOT_TOKEN);

console.log("🤖 Partner bot started");

// старт
bot.start((ctx) => {
  ctx.reply("Приветствуем в AIBOOST PARTNER - Введите ID трейдера 👇");
});

// обработка ID
bot.on("text", async (ctx) => {

  const id = ctx.message.text.trim();

  // проверка на цифры
  if (!/^\d+$/.test(id)) {
    return ctx.reply("❌ Введите корректный ID (только цифры)");
  }

  try {

    const res = await fetch(`https://ai-boost.onrender.com/check-deposit?trader_id=${id}`);
    const data = await res.json();

    if (data.ok) {
      ctx.reply(`✅ Депозит найден\n💰 Сумма: $${data.amount}`);
    } else {
      ctx.reply("❌ Депозит не найден");
    }

  } catch (e) {
    console.log("CHECK ERROR:", e);
    ctx.reply("⚠️ Ошибка сервера");
  }

});

// запуск
bot.launch({ dropPendingUpdates: true }).then(()=>{
  console.log("🚀 Partner bot launched");
});

// ошибки
bot.catch(err => console.log("BOT ERROR:", err));

// graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));