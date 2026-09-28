execute as @a[tag=en_gulag] run damage @s 30 minecraft:mob_attack by @e[type=ravager,tag=trex,limit=1]
scoreboard players set $gulag_tiempo dedsafio_vars 40
title @a[tag=en_gulag] title {text:"SE ACABÓ EL TIEMPO",color:"red"}
