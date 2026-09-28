scoreboard players set $instalado dedsafio_vars 1
scoreboard players set $dia dedsafio_vars 1
scoreboard players set $reloj dedsafio_vars 0
execute unless score $ciclo dedsafio_vars matches 1.. run scoreboard players set $ciclo dedsafio_vars 12000
scoreboard players set $rayo dedsafio_vars -1
scoreboard players set $eclipse dedsafio_vars -1
scoreboard players set $sin_regen dedsafio_vars -1
scoreboard players set $fantasmas dedsafio_vars -1
scoreboard players set $pulso dedsafio_vars 0
scoreboard players set $gulag_activo dedsafio_vars 0
scoreboard players set $juicio dedsafio_vars 0
scoreboard players set $juicio_activo dedsafio_vars 0
scoreboard players set $qumara dedsafio_vars 0
scoreboard players set $bunker dedsafio_vars 0
scoreboard players set $pista dedsafio_vars 0
scoreboard players set $revivio dedsafio_vars 0
gamerule immediate_respawn true
gamerule keep_inventory false
gamerule natural_health_regeneration true
gamerule pvp false
gamerule show_death_messages true
difficulty hard
function dedsafio:mapa/preparar
tellraw @a {text:"Día 1. La ruleta gira sola cada 10 minutos.",color:"gold"}
tellraw @a {text:"Recreación de fans para un Realm. No es el mapa ni los plugins oficiales de Eufonia.",color:"gray"}
