const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.PARTNER_BOT_TOKEN);

console.log("🤖 Partner bot started");

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

      const res = await fetch(`https://ai-boost.onrender.com/check?trader_id=${id}`);
      const data = await res.json();

      if (data.ok) {
        return ctx.reply("✅ Пользователь зарегистрирован");
      } else {
        return ctx.reply("❌ Пользователь не найден");
      }
    }

    // 💰 ПРОВЕРКА ДЕПОЗИТА
    if (userState[ctx.from.id] === "check_dep") {

      const res = await fetch(`https://ai-boost.onrender.com/check-deposit?trader_id=${id}`);
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

// запуск
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log("🚀 Partner bot launched");
});

// ошибки
bot.catch(err => console.log("BOT ERROR:", err));

// остановка
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));