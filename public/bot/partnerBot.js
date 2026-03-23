const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.PARTNER_BOT_TOKEN);

console.log("🤖 Partner bot started");

// состояние пользователя
const userState = {};

// 🔥 СТАРТ
bot.start((ctx) => {
  const username = ctx.from.username || ctx.from.first_name || "партнер";

  // сбрасываем состояние
  userState[ctx.from.id] = null;

  ctx.reply(
    `Приветствуем ${username} в AIBOOST PARTNER 👋`,
    Markup.keyboard([
      ["📋 Проверка регистрации", "💰 Проверка депозита"]
    ]).resize()
  );
});

// 📋 проверка регистрации
bot.hears("📋 Проверка регистрации", (ctx) => {
  userState[ctx.from.id] = "check_reg";
  ctx.reply("Введите ID трейдера для проверки регистрации 👇");
});

// 💰 проверка депозита
bot.hears("💰 Проверка депозита", (ctx) => {
  userState[ctx.from.id] = "check_dep";
  ctx.reply("Введите ID трейдера для проверки депозита 👇");
});

// 🔥 ОБРАБОТКА ТЕКСТА
bot.on("text", async (ctx) => {

  const text = ctx.message.text;

  // ❗ игнорируем команды (/start и т.д.)
  if (text.startsWith("/")) return;

  // если режим не выбран
  if (!userState[ctx.from.id]) return;

  const id = text.trim();

  // проверка ID
  if (!/^\d+$/.test(id)) {
    return ctx.reply("❌ Введите корректный ID (только цифры)");
  }

  try {

    // 📋 регистрация
    if (userState[ctx.from.id] === "check_reg") {

      const res = await fetch(`https://ai-boost.onrender.com/check?trader_id=${id}`);
      const data = await res.json();

      if (data.ok) {
        return ctx.reply("✅ Пользователь зарегистрирован");
      } else {
        return ctx.reply("❌ Пользователь не найден");
      }
    }

    // 💰 депозит
    if (userState[ctx.from.id] === "check_dep") {

      const res = await fetch(`https://ai-boost.onrender.com/check-deposit?trader_id=${id}`);
      const data = await res.json();

      if (data.ok) {
        return ctx.reply(`✅ Депозит найден\n💰 Сумма: $${data.amount}`);
      } else {
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