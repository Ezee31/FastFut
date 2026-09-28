execute in dedsafio:eventos run kill @e[type=marker,tag=mapa_listo]
function dedsafio:mapa/preparar
tellraw @a {text:"Reconstruyendo arenas...",color:"yellow"}
