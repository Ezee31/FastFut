scoreboard players set $eclipse dedsafio_vars 3600
scoreboard players set $pulso dedsafio_vars 0
execute in minecraft:overworld run time set night
title @a subtitle {text:"Eclipse",color:"dark_purple"}
tellraw @a {text:"EL ECLIPSE APAGA EL DÍA. Los que no vean, no se defienden.",color:"dark_purple"}
effect give @a[tag=!muerto,tag=!eliminado,gamemode=survival] darkness 8 0 true
