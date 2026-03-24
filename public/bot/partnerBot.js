const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.PARTNER_BOT_TOKEN);

console.log("🤖 Partner bot started");

const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

// режим пользователя
const userState = {};

// заблокированные ID (только успешные)
const lockedIDs = {};

// старт
bot.start((ctx) => {
  const username = ctx.from.username || ctx.from.first_name || "партнер";

  ctx.reply(
    `Приветствуем ${username} в AIBOOST PARTNER 👋`,
    Markup.keyboard([
      ["📋 Проверка регистрации", "💰 Проверка депозита"]
    ]).resize()
  );
});

// выбор режима
bot.hears("📋 Проверка регистрации", (ctx) => {
  userState[ctx.from.id] = "check_reg";
  ctx.reply("Введите ID трейдера для проверки регистрации 👇");
});

bot.hears("💰 Проверка депозита", (ctx) => {
  userState[ctx.from.id] = "check_dep";
  ctx.reply("Введите ID трейдера для проверки депозита 👇");
});

// обработка
bot.on("text", async (ctx) => {

  const text = ctx.message.text;

  if (text.startsWith("/")) return;

  if (!userState[ctx.from.id]) return;

  const id = text.trim();

  if (!/^\d+$/.test(id)) {
    return ctx.reply("❌ Введите корректный ID (только цифры)");
  }

  // 🔒 если уже был успешный кейс → блок
  if (lockedIDs[id]) {
    return ctx.reply("⛔ Этот ID уже зафиксирован\nПовторная проверка запрещена");
  }

  try {

    // 📋 ПРОВЕРКА РЕГИСТРАЦИИ
    if (userState[ctx.from.id] === "check_reg") {

      const res = await fetch(`${APP_URL}/check?trader_id=${id}`);
      const data = await res.json();

      if (data.ok) {
        return ctx.reply("✅ Пользователь зарегистрирован");
      } else {
        return ctx.reply("❌ Пользователь не найден");
      }
    }

    // 💰 ПРОВЕРКА ДЕПОЗИТА
    if (userState[ctx.from.id] === "check_dep") {

      const res = await fetch(`${APP_URL}/check-deposit?trader_id=${id}`);
      const data = await res.json();

      if (data.ok) {

        // 🔥 ТОЛЬКО ЗДЕСЬ БЛОКИРУЕМ
        lockedIDs[id] = true;

        return ctx.reply(
          `✅ Депозит найден\n💰 Сумма: $${data.amount}`
        );

      } else {
        // ❗ НЕ блокируем → можно проверять дальше
        return ctx.reply("❌ Депозит не найден");
      }
    }

  } catch (e) {
    console.log("CHECK ERROR:", e);
    ctx.reply("⚠️ Ошибка сервера");
  }

});

// уведомление партнера о редепозите
async function approveTrader(traderId, partnerId, amount) {
  const adminId = process.env.PARTNER_BOT_ADMIN || 838408932;
  try {
    await bot.telegram.sendMessage(
      adminId,
      `✅ Redeposit approved:\nTrader: ${traderId}\nPartner: ${partnerId}\nAmount: $${amount}`
    );
  } catch (e) {
    console.log("approveTrader notify error", e);
  }
}

// ловим ошибки
bot.catch(err => console.log("BOT ERROR:", err));

function setup(app) {
  const appUrl = process.env.APP_URL;
  const secret = process.env.PARTNER_BOT_TOKEN.split(":")[1].slice(0, 20);
  const path = `/webhook/partner/${secret}`;

  if (appUrl) {
    bot.telegram.setWebhook(`${appUrl}${path}`).then(() => {
      console.log("🚀 Partner bot webhook set");
    }).catch(e => {
      console.log("❌ Partner webhook error, falling back to polling:", e.message);
      bot.launch({ dropPendingUpdates: true });
    });

    app.use(bot.webhookCallback(path));
  } else {
    console.log("⚠️ APP_URL not set, using polling for partner bot");
    bot.launch({ dropPendingUpdates: true });
  }
}

module.exports = { setup, approveTrader };

// остановка
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
