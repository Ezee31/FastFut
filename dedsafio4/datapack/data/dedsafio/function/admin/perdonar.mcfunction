tag @a remove eliminado
tag @a remove muerto
tag @a remove en_gulag
tag @a remove en_juicio
tag @a remove fila_juicio
tag @a remove juicio_a
tag @a remove juicio_b
scoreboard players set $gulag_activo dedsafio_vars 0
scoreboard players set $juicio_activo dedsafio_vars 0
scoreboard players set $juicio dedsafio_vars 0
gamerule pvp false
bossbar set dedsafio:trex visible false
execute in dedsafio:eventos run kill @e[type=ravager,tag=trex]
gamemode survival @a
execute as @a in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] run tp @s ~1 ~ ~
tellraw @a {text:"Todos vuelven a la partida.",color:"green"}
