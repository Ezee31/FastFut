tag @s remove en_juicio
tag @s remove juicio_a
tag @s remove juicio_b
tag @s remove fila_juicio
gamemode survival @s
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] run tp @s ~1 ~ ~
execute unless entity @e[type=marker,tag=campamento] in minecraft:overworld run tp @s 0 90 0
title @s title {text:"GANASTE EL JUICIO",color:"gold"}
tellraw @a ["",{selector:"@s",color:"gold"},{text:" ganó el Juicio.",color:"green"}]
playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 1
