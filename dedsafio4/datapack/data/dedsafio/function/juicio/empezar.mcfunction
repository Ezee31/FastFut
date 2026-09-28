scoreboard players set $juicio_activo dedsafio_vars 1
scoreboard players set $juicio_tiempo dedsafio_vars 1200
gamerule pvp true
tag @a remove juicio_a
tag @a remove juicio_b
tag @a[tag=fila_juicio,limit=1,sort=arbitrary] add juicio_a
tag @a[tag=fila_juicio,tag=!juicio_a,limit=1,sort=arbitrary] add juicio_b
tag @a[tag=juicio_a] add en_juicio
tag @a[tag=juicio_b] add en_juicio
tag @a[tag=en_juicio] remove fila_juicio
gamemode adventure @a[tag=en_juicio]
execute as @a[tag=juicio_a] in dedsafio:eventos run tp @s -6 41 80 90 0
execute as @a[tag=juicio_b] in dedsafio:eventos run tp @s 6 41 80 -90 0
title @a[tag=en_juicio] title {text:"JUICIO",color:"gold"}
title @a[tag=en_juicio] subtitle {text:"El perdedor cae",color:"red"}
tellraw @a ["",{text:"Juicio: ",color:"gold"},{selector:"@a[tag=juicio_a]",color:"red"},{text:" contra ",color:"gray"},{selector:"@a[tag=juicio_b]",color:"blue"}]
playsound minecraft:entity.ender_dragon.growl master @a[tag=en_juicio] ~ ~ ~ 0.4 1.4
