(function(){

const page = location.pathname;

/* страницы которые нельзя открывать без входа */
const protectedPages = [
"/signals",
"/signals.html",
"/flash",
"/flash.html",,
];

const session = sessionStorage.getItem("auth");

/* если нет сессии */
if(protectedPages.includes(page) && !session){
location.replace("/login");
return;
}

/* защита от кэша назад */
window.addEventListener("pageshow", function(e){
if(e.persisted){
location.reload();
}
});

})();