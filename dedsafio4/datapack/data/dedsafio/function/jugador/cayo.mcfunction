tag @s add muerto
tag @s remove en_gulag
gamemode adventure @s
function dedsafio:jugador/tp_lobby
title @s title {text:"HAS CAÍDO",color:"dark_red"}
title @s subtitle {text:"Cuchara o Gulag",color:"gold"}
playsound minecraft:entity.wither.spawn master @s ~ ~ ~ 0.6 1
tellraw @a ["",{text:"☠ ",color:"dark_red"},{selector:"@s",color:"red"},{text:" cayó. Te vemos en el GULAG.",color:"gray"}]
execute store result score $vivos dedsafio_vars if entity @a[tag=!eliminado,tag=!muerto,gamemode=!spectator]
tellraw @a ["",{text:"Sobrevivientes: ",color:"gold"},{score:{name:"$vivos",objective:"dedsafio_vars"},color:"white"}]
tellraw @s {text:"[Entrar al Gulag del T-Rex]",color:"red",click_event:{action:"run_command",command:"trigger gulag"}}
