(function(){

const page = location.pathname;

const protectedPages = [
"/signals",
"/flash",
"/deposit",
"/pocket",
"/rules",
"/history"
];

/* проверяем есть ли сессия */
const session = sessionStorage.getItem("site_access");

/* если открывают защищенную страницу */
if(protectedPages.includes(page) && !session){
location.replace("/");
return;
}

/* защита кнопки назад */
window.addEventListener("pageshow", function(e){
if(e.persisted){
location.reload();
}
});

})();