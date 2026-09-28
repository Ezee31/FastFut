execute in dedsafio:eventos if entity @e[type=marker,tag=mapa_listo] run return fail
function dedsafio:mapa/forceload
schedule function dedsafio:mapa/gulag 10t replace
schedule function dedsafio:mapa/qumara 40t replace
schedule function dedsafio:mapa/iceberg 70t replace
schedule function dedsafio:mapa/juicio 100t replace
schedule function dedsafio:mapa/finalizar 130t replace
