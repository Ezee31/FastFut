execute in dedsafio:eventos unless entity @e[type=ravager,tag=trex] if score $gulag_activo dedsafio_vars matches 1 run return run function dedsafio:gulag/gano
scoreboard players set $gulag_activo dedsafio_vars 0
bossbar set dedsafio:trex visible false
tag @s remove en_gulag
tag @s remove muerto
tag @s add eliminado
gamemode spectator @s
execute in dedsafio:eventos run kill @e[type=ravager,tag=trex]
title @s title {text:"ELIMINADO",color:"dark_red"}
title @s subtitle {text:"El T-Rex acabó tu camino",color:"gray"}
tellraw @a ["",{selector:"@s",color:"dark_red"},{text:" queda ELIMINADO DEFINITIVAMENTE. El Tiranosaurio Rex puso fin a su camino en el GULAG.",color:"red"}]
execute in minecraft:overworld run tp @s 0 130 0
playsound minecraft:entity.wither.death master @a ~ ~ ~ 0.5 0.8
