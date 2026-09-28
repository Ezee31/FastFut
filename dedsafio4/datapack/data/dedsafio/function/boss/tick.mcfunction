execute if score $qumara_gracia dedsafio_vars matches 1.. run scoreboard players remove $qumara_gracia dedsafio_vars 1
execute if score $qumara dedsafio_vars matches 1 in dedsafio:eventos as @e[type=warden,tag=qumara] run data merge entity @s {Brain:{memories:{"minecraft:dig_cooldown":{value:{},ttl:1200}}}}
execute if score $qumara dedsafio_vars matches 1 if score $qumara_gracia dedsafio_vars matches 0 in dedsafio:eventos unless entity @e[type=warden,tag=qumara] run function dedsafio:boss/derrotado
