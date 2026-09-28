scoreboard players set $gulag_activo dedsafio_vars 0
bossbar set dedsafio:trex visible false
execute as @a[tag=en_gulag] run function dedsafio:gulag/premio
execute in dedsafio:eventos run kill @e[type=ravager,tag=trex]
