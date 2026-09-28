scoreboard players remove @s escombros 1
execute store result score $azar dedsafio_vars run random value 1..100
execute if score $azar dedsafio_vars matches 1..25 run function dedsafio:cuchara/dar
execute if score $azar dedsafio_vars matches 1..25 run tellraw @s {text:"Entre los escombros antiguos había una cuchara.",color:"gold"}
execute if score @s escombros matches 1.. run function dedsafio:cuchara/escombro
