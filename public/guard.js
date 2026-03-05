(function(){

const page = location.pathname;

/* страницы которые нельзя открывать напрямую */
const protectedPages = [
"/signals",
"/flash",
"/deposit",
"/pocket"
];

/* если человек открыл защищенную страницу */
if(protectedPages.includes(page)){

const fromSite = document.referrer.includes(location.host);

/* если пришел не с сайта */
if(!fromSite){
location.replace("/");
return;
}

}

/* если открыт html напрямую */
if(page.endsWith(".html")){

const fromSite = document.referrer.includes(location.host);

if(!fromSite){
location.replace("/");
return;
}

}

/* защита кнопки назад */
window.addEventListener("pageshow", function(e){

if(e.persisted){
location.reload();
}

});

})();