scoreboard players set $reloj dedsafio_vars 0
scoreboard players add $dia dedsafio_vars 1
tellraw @a ["",{text:"Día ",color:"gold"},{score:{name:"$dia",objective:"dedsafio_vars"},color:"yellow"},{text:" del DEDsafío.",color:"gold"}]
execute if score $dia dedsafio_vars matches 5 run tellraw @a {text:"Día 5: el Nether ya no perdona. Los cubos de magma salen a cazar.",color:"red"}
function dedsafio:ruleta/girar
