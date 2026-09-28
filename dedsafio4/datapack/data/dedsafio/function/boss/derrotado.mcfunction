scoreboard players set $qumara dedsafio_vars 2
bossbar set dedsafio:qumara visible false
tellraw @a {text:"Qumara ha caído. El iceberg muestra una grieta.",color:"light_purple"}
title @a title {text:"QUMARA CAE",color:"dark_purple"}
execute as @a[tag=!eliminado,tag=!muerto] run function dedsafio:cuchara/dar
execute in dedsafio:eventos positioned 150 41 0 as @a[distance=..24,predicate=dedsafio:en_eventos] run function dedsafio:cuchara/dar
execute in dedsafio:eventos run summon item 150 42 0 {Item:{id:"minecraft:totem_of_undying",count:1},PickupDelay:10}
execute in dedsafio:eventos run summon item 150 42 1 {Item:{id:"minecraft:nether_star",count:1},PickupDelay:10}
function dedsafio:iceberg/pista
playsound minecraft:ui.toast.challenge_complete master @a 0 80 0 8 1
