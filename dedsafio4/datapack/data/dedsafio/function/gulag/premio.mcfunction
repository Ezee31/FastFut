tag @s remove en_gulag
tag @s remove muerto
gamemode survival @s
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] run tp @s ~1 ~ ~
execute unless entity @e[type=marker,tag=campamento] in minecraft:overworld run tp @s 0 90 0
title @s title {text:"VOLVISTE",color:"green"}
title @s subtitle {text:"Venciste al T-Rex",color:"gold"}
tellraw @a ["",{selector:"@s",color:"green"},{text:" venció al Tiranosaurio Rex y regresa al mundo.",color:"gold"}]
playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 1
