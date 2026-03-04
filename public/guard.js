(function(){

const page = location.pathname;

/* проверяем если открыт html напрямую */
if(page.endsWith(".html")){

const fromSite = document.referrer.includes(location.host);

/* если человек пришел не с сайта → значит ввод вручную */
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