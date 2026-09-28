scoreboard players set $pulso dedsafio_vars 0
effect give @a[tag=!muerto,tag=!eliminado,gamemode=survival] darkness 12 0 true
execute as @a[tag=!muerto,tag=!eliminado,gamemode=survival,limit=1,sort=random] at @s if predicate dedsafio:en_overworld run summon zombie ~4 ~ ~ {Tags:["sombra"],CustomName:{text:"Sombra"},PersistenceRequired:1b,attributes:[{id:"minecraft:attack_damage",base:7}]}
