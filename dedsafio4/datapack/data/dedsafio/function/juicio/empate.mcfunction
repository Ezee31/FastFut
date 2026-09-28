tellraw @a {text:"El Juicio termina en empate. Nadie cae.",color:"yellow"}
gamemode survival @a[tag=en_juicio]
execute as @a[tag=en_juicio] in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] run tp @s ~1 ~ ~
execute as @a[tag=en_juicio] unless entity @e[type=marker,tag=campamento] in minecraft:overworld run tp @s 0 90 0
tag @a remove en_juicio
tag @a remove juicio_a
tag @a remove juicio_b
tag @a remove fila_juicio
function dedsafio:juicio/cerrar
