execute store result score $vivos dedsafio_vars if entity @a[tag=!eliminado,tag=!muerto,gamemode=!spectator]
scoreboard players operation Vivos tablero = $vivos dedsafio_vars
scoreboard players operation Dia tablero = $dia dedsafio_vars
bossbar set dedsafio:trex players @a
bossbar set dedsafio:qumara players @a
execute if score $gulag_activo dedsafio_vars matches 1 in dedsafio:eventos store result bossbar dedsafio:trex value run data get entity @e[type=ravager,tag=trex,limit=1] Health
execute if score $qumara dedsafio_vars matches 1 in dedsafio:eventos store result bossbar dedsafio:qumara value run data get entity @e[type=warden,tag=qumara,limit=1] Health
