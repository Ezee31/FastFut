scoreboard players enable @a gulag
scoreboard players enable @a juicio
scoreboard players enable @a jefe
scoreboard players enable @a iceberg
scoreboard players enable @a equipo
execute as @a[scores={gulag=1..}] run function dedsafio:gulag/intentar
execute as @a[scores={juicio=1..}] run function dedsafio:juicio/unirse
execute as @a[scores={jefe=1..}] run function dedsafio:boss/ir
execute as @a[scores={iceberg=1..}] run function dedsafio:iceberg/ir
execute as @a[scores={equipo=1..}] run function dedsafio:equipos/unirse
scoreboard players set @a gulag 0
scoreboard players set @a juicio 0
scoreboard players set @a jefe 0
scoreboard players set @a iceberg 0
scoreboard players set @a equipo 0
execute as @a[scores={muertes=1..}] run function dedsafio:jugador/al_morir
execute as @a[tag=!visto] run function dedsafio:jugador/primer_ingreso
execute as @a[tag=eliminado,gamemode=!spectator] run function dedsafio:jugador/a_espectador
execute as @a[tag=muerto,tag=!en_gulag,tag=!eliminado] run function dedsafio:jugador/vigilar_lobby
execute as @a[tag=muerto,tag=!en_gulag,tag=!eliminado] run title @s actionbar {text:"Cuchara de un compañero, o /trigger gulag",color:"red"}
execute as @a[scores={escombros=1..}] run function dedsafio:cuchara/escombro
execute as @a[scores={matar_wither=1..}] run function dedsafio:cuchara/premio_jefe
execute as @a[scores={matar_dragon=1..}] run function dedsafio:cuchara/premio_jefe
scoreboard players set @a[scores={matar_wither=1..}] matar_wither 0
scoreboard players set @a[scores={matar_dragon=1..}] matar_dragon 0
