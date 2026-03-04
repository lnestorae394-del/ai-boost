(function(){

const page = location.pathname;

/* если открывают любой HTML напрямую */
if(page.endsWith(".html")){

location.replace("/");
return;

}

/* защита кнопки назад */
window.addEventListener("pageshow", function(e){

if(e.persisted){

location.replace("/");

}

});

/* защита devtools cache */
window.addEventListener("popstate", function(){

if(location.pathname.endsWith(".html")){

location.replace("/");

}

});

})();