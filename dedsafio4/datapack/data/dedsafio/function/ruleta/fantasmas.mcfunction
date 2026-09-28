scoreboard players set $fantasmas dedsafio_vars 900
execute in minecraft:overworld run time set night
title @a subtitle {text:"Fantasmas",color:"gray"}
tellraw @a {text:"Algo baja del cielo.",color:"gray"}
execute as @a[tag=!muerto,tag=!eliminado,gamemode=survival] at @s if predicate dedsafio:en_overworld run summon phantom ~ ~15 ~ {Tags:["evento_phantom"],PersistenceRequired:1b}
