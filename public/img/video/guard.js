const user = localStorage.getItem("ai_user_id");
const deposit = localStorage.getItem("ai_boost_access");

const page = location.pathname;

/* если человек вручную открывает html */
if(page.endsWith(".html")){

/* LOGIN и REGISTER можно открывать */
if(page.includes("login") || page.includes("register") || page.includes("index")){
return;
}

/* если не авторизован */
if(!user){
location.href="/";
}

/* если пытается открыть сигналы без депозита */
if(page.includes("signals") && deposit!=="true"){
location.href="/deposit.html";
}

}