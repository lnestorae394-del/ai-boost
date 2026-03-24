const canvas = document.getElementById("snow");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let snowflakes = [];

for(let i=0;i<120;i++){
  snowflakes.push({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height,
    radius: Math.random()*2+1,
    speed: Math.random()*1
  });
}



function drawSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff66";

    snowflakes.forEach(flake => {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();

        flake.y += flake.speed;
        if (flake.y > canvas.height) {
            flake.y = 0;
            flake.x = Math.random() * canvas.width;
        }
    });

    requestAnimationFrame(drawSnow);
}

drawSnow();

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
document.querySelectorAll(".faq-question").forEach(item => {
  item.addEventListener("click", () => {
    const parent = item.parentElement;
    const answer = parent.querySelector(".faq-answer");

    if (answer.style.maxHeight) {
      answer.style.maxHeight = null;
      item.querySelector("span").textContent = "+";
    } else {
      answer.style.maxHeight = answer.scrollHeight + "px";
      item.querySelector("span").textContent = "-";
    }
  });
});
window.registerUser = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if(!email || !password){
    alert("Введи email и пароль");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Аккаунт создан 🚀");

    window.location.href = "/"; // потом кабинет
  } catch (error) {
    alert(error.message);
  }
};
// 🔥 ПРОВЕРКА ID ЧЕРЕЗ POSTBACK СЕРВЕР
window.checkID = async function () {
  const userId = document.getElementById("userid").value.trim();

  if (!userId) {
    alert("Введи ID");
    return;
  }

  try {
    const res = await fetch("/check?id=" + userId);
    const data = await res.json();

    if (data.access === true) {
      window.location.href = "signals.html";
    } else {
      alert("❌ Ты не зарегистрирован по нашей ссылке");
    }

  } catch (err) {
    alert("Сервер проверки оффлайн");
    console.log(err);
  }
};
