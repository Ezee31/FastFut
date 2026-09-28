execute in dedsafio:eventos if entity @e[type=warden,tag=qumara] run tellraw @a {text:"Qumara ya está en la arena.",color:"dark_purple"}
execute in dedsafio:eventos if entity @e[type=warden,tag=qumara] run return fail
execute in dedsafio:eventos run summon warden 150 41 -6 {CustomName:{text:"Qumara",color:"dark_purple"},CustomNameVisible:1b,PersistenceRequired:1b,Health:500f,Tags:["qumara"],Glowing:1b,attributes:[{id:"minecraft:max_health",base:500},{id:"minecraft:scale",base:1.6}]}
scoreboard players set $qumara dedsafio_vars 1
scoreboard players set $qumara_gracia dedsafio_vars 40
bossbar set dedsafio:qumara visible true
bossbar set dedsafio:qumara max 500
bossbar set dedsafio:qumara value 500
title @a title {text:"QUMARA",color:"dark_purple"}
title @a subtitle {text:"No tendrá piedad",color:"light_purple"}
tellraw @a {text:"EL PRIMER JEFE HA APARECIDO. Qumara espera en su arena.",color:"dark_purple"}
tellraw @a {text:"[Ir a la arena]",color:"gold",click_event:{action:"run_command",command:"trigger jefe"}}
playsound minecraft:entity.warden.roar master @a 0 80 0 4 0.8
