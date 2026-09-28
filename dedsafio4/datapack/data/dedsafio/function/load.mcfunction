scoreboard objectives add dedsafio_vars dummy
scoreboard objectives add muertes deathCount
scoreboard objectives add uso_cuchara minecraft.used:minecraft.warped_fungus_on_a_stick
scoreboard objectives add uso_admin minecraft.used:minecraft.carrot_on_a_stick
scoreboard objectives add escombros minecraft.picked_up:minecraft.ancient_debris
scoreboard objectives add matar_wither minecraft.killed:minecraft.wither
scoreboard objectives add matar_dragon minecraft.killed:minecraft.ender_dragon
scoreboard objectives add gulag trigger
scoreboard objectives add juicio trigger
scoreboard objectives add jefe trigger
scoreboard objectives add iceberg trigger
scoreboard objectives add equipo trigger
scoreboard objectives add tablero dummy {text:"DEDsafío 4",color:"gold"}
scoreboard objectives setdisplay sidebar tablero
execute unless score $teams dedsafio_vars matches 1 run function dedsafio:equipos/crear
execute unless score $barras dedsafio_vars matches 1 run function dedsafio:ui/barras
execute unless score $instalado dedsafio_vars matches 1 run function dedsafio:init
