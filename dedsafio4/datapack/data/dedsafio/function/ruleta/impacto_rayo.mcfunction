scoreboard players set $rayo dedsafio_vars -1
weather clear
execute if score $bunker dedsafio_vars matches 1 as @a[tag=!muerto,tag=!eliminado,gamemode=!spectator,gamemode=!creative] at @s if predicate dedsafio:en_overworld unless entity @e[type=marker,tag=bunker,distance=..6] run function dedsafio:ruleta/golpear
execute if score $bunker dedsafio_vars matches 0 as @a[tag=!muerto,tag=!eliminado,gamemode=survival] at @s if predicate dedsafio:ve_el_cielo run function dedsafio:ruleta/golpear
tellraw @a {text:"El rayo ya cayó.",color:"gray"}
