execute in dedsafio:eventos if entity @e[type=marker,tag=mapa_listo] run return fail
function dedsafio:mapa/forceload
schedule function dedsafio:mapa/construir 20t replace
