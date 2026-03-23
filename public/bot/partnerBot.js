const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.PARTNER_BOT_TOKEN);

console.log("🤖 Partner bot started");

const userState = {};
const checkedUsers = {}; // 🔥 блок после успешной проверки

// старт
bot.start((ctx) => {
  const username = ctx.from.username || ctx.from.first_name || "партнер";

  userState[ctx.from.id] = null;

  ctx.reply(
    `Приветствуем ${username} в AIBOOST PARTNER 👋`,
    Markup.keyboard([
      ["📋 Проверка регистрации", "💰 Проверка депозита"]
    ]).resize()
  );
});

// регистрация
bot.hears("📋 Проверка регистрации", (ctx) => {

  if (checkedUsers[ctx.from.id]) {
    return ctx.reply("⛔ Вы уже успешно проверили ID\nПовторная проверка запрещена");
  }

  userState[ctx.from.id] = "check_reg";
  ctx.reply("Введите ID трейдера для проверки регистрации 👇");
});

// депозит
bot.hears("💰 Проверка депозита", (ctx) => {

  if (checkedUsers[ctx.from.id]) {
    return ctx.reply("⛔ Вы уже успешно проверили ID\nПовторная проверка запрещена");
  }

  userState[ctx.from.id] = "check_dep";
  ctx.reply("Введите ID трейдера для проверки депозита 👇");
});

// обработка
bot.on("text", async (ctx) => {

  const text = ctx.message.text;

  if (text.startsWith("/")) return;

  if (!userState[ctx.from.id]) return;

  if (checkedUsers[ctx.from.id]) {
    return ctx.reply("⛔ Повторная проверка запрещена");
  }

  const id = text.trim();

  if (!/^\d+$/.test(id)) {
    return ctx.reply("❌ Введите корректный ID (только цифры)");
  }

  try {

    // 📋 регистрация
    if (userState[ctx.from.id] === "check_reg") {

      const res = await fetch(`https://ai-boost.onrender.com/check?trader_id=${id}`);
      const data = await res.json();

      if (data.ok) {
        checkedUsers[ctx.from.id] = true; // 🔥 блокируем
        return ctx.reply("✅ Пользователь зарегистрирован\n\n🔒 Повторная проверка отключена");
      } else {
        return ctx.reply("❌ Пользователь не найден");
      }
    }

    // 💰 депозит
    if (userState[ctx.from.id] === "check_dep") {

      const res = await fetch(`https://ai-boost.onrender.com/check-deposit?trader_id=${id}`);
      const data = await res.json();

      if (data.ok) {
        checkedUsers[ctx.from.id] = true; // 🔥 блокируем
        return ctx.reply(`✅ Депозит найден\n💰 Сумма: $${data.amount}\n\n🔒 Повторная проверка отключена`);
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

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));