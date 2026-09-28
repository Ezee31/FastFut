scoreboard players set $qumara dedsafio_vars 0
scoreboard players set $qumara_gracia dedsafio_vars -1
scoreboard players set $gulag_activo dedsafio_vars 0
scoreboard players set $gulag_tiempo dedsafio_vars -1
scoreboard players set $juicio dedsafio_vars 0
scoreboard players set $juicio_activo dedsafio_vars 0
scoreboard players set $eclipse dedsafio_vars -1
scoreboard players set $rayo dedsafio_vars -1
scoreboard players set $sin_regen dedsafio_vars -1
scoreboard players set $fantasmas dedsafio_vars -1
scoreboard players set $pulso dedsafio_vars 0
scoreboard players set $dia dedsafio_vars 1
scoreboard players set $reloj dedsafio_vars 0
scoreboard players set $pista dedsafio_vars 0
scoreboard players operation Dia tablero = $dia dedsafio_vars
execute in dedsafio:eventos run kill @e[type=warden,tag=qumara]
execute in dedsafio:eventos run kill @e[type=ravager,tag=trex]
execute in dedsafio:eventos run kill @e[type=item]
execute in minecraft:overworld run kill @e[type=marker,tag=camp_tmp]
execute in minecraft:overworld run kill @e[type=phantom,tag=evento_phantom]
execute in minecraft:overworld run kill @e[type=zombie,tag=sombra]
execute in minecraft:the_nether run kill @e[type=magma_cube,tag=evento_magma]
bossbar set dedsafio:trex visible false
bossbar set dedsafio:qumara visible false
gamerule natural_health_regeneration true
gamerule pvp false
gamerule immediate_respawn true
execute in minecraft:overworld run weather clear
execute in minecraft:overworld run time set day
say CALMA_OK
