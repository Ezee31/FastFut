scoreboard players set $eclipse dedsafio_vars -1
scoreboard players set $pulso dedsafio_vars 0
execute in minecraft:overworld run time set day
kill @e[type=zombie,tag=sombra]
title @a subtitle {text:"El eclipse termina",color:"yellow"}
tellraw @a {text:"Vuelve la luz.",color:"yellow"}
