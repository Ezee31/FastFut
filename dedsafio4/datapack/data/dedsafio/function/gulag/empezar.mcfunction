tag @s add en_gulag
scoreboard players set $gulag_activo dedsafio_vars 1
scoreboard players set $gulag_tiempo dedsafio_vars 1400
gamemode adventure @s
clear @s
execute in dedsafio:eventos run tp @s 0 41 -8 0 0
item replace entity @s armor.head with iron_helmet
item replace entity @s armor.chest with iron_chestplate
item replace entity @s armor.legs with iron_leggings
item replace entity @s armor.feet with iron_boots
item replace entity @s weapon.mainhand with iron_sword
item replace entity @s weapon.offhand with shield
item replace entity @s hotbar.1 with cooked_beef 16
item replace entity @s hotbar.2 with golden_apple 2
function dedsafio:gulag/invocar_trex
bossbar set dedsafio:trex visible true
bossbar set dedsafio:trex value 180
title @s title {text:"GULAG",color:"dark_red"}
title @s subtitle {text:"Mata al T-Rex",color:"gold"}
tellraw @a ["",{selector:"@s",color:"red"},{text:" entra al Gulag contra el Tiranosaurio Rex.",color:"gray"}]
playsound minecraft:entity.ravager.roar master @a 0 41 0 2 0.7
