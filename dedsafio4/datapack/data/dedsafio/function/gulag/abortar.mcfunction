scoreboard players set $gulag_activo dedsafio_vars 0
bossbar set dedsafio:trex visible false
execute in dedsafio:eventos run kill @e[type=ravager,tag=trex]
tellraw @a {text:"El Gulag se canceló. El peleador vuelve a la sala de espera.",color:"yellow"}
