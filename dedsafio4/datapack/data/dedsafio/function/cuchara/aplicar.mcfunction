tag @s remove muerto
tag @s remove en_gulag
gamemode survival @s
execute at @a[tag=reviviendo,limit=1] run tp @s ~ ~ ~
effect give @s resistance 10 4 true
effect give @s regeneration 8 1 true
effect give @s saturation 2 20 true
clear @a[tag=reviviendo,limit=1] warped_fungus_on_a_stick[custom_data={cuchara:"si"}] 1
scoreboard players set $revivio dedsafio_vars 1
tellraw @a ["",{selector:"@a[tag=reviviendo,limit=1]",color:"gold"},{text:" revivió a ",color:"gray"},{selector:"@s",color:"green"},{text:" con una cuchara.",color:"gray"}]
title @s title {text:"REVIVIDO",color:"green"}
playsound minecraft:item.totem.use master @s ~ ~ ~ 1 1
