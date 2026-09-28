execute unless items entity @s weapon.mainhand warped_fungus_on_a_stick[custom_data={cuchara:"si"}] run return fail
tag @s add reviviendo
scoreboard players set $revivio dedsafio_vars 0
execute if score $revivio dedsafio_vars matches 0 at @s if entity @s[team=rojo] as @a[team=rojo,tag=muerto,tag=!eliminado,tag=!reviviendo,limit=1,sort=nearest] run function dedsafio:cuchara/aplicar
execute if score $revivio dedsafio_vars matches 0 at @s if entity @s[team=azul] as @a[team=azul,tag=muerto,tag=!eliminado,tag=!reviviendo,limit=1,sort=nearest] run function dedsafio:cuchara/aplicar
execute if score $revivio dedsafio_vars matches 0 at @s if entity @s[team=verde] as @a[team=verde,tag=muerto,tag=!eliminado,tag=!reviviendo,limit=1,sort=nearest] run function dedsafio:cuchara/aplicar
execute if score $revivio dedsafio_vars matches 0 at @s if entity @s[team=amarillo] as @a[team=amarillo,tag=muerto,tag=!eliminado,tag=!reviviendo,limit=1,sort=nearest] run function dedsafio:cuchara/aplicar
execute if score $revivio dedsafio_vars matches 0 at @s if entity @s[team=naranja] as @a[team=naranja,tag=muerto,tag=!eliminado,tag=!reviviendo,limit=1,sort=nearest] run function dedsafio:cuchara/aplicar
execute if score $revivio dedsafio_vars matches 0 at @s if entity @s[team=morado] as @a[team=morado,tag=muerto,tag=!eliminado,tag=!reviviendo,limit=1,sort=nearest] run function dedsafio:cuchara/aplicar
execute if score $revivio dedsafio_vars matches 0 at @s as @a[tag=muerto,tag=!eliminado,tag=!reviviendo,limit=1,sort=nearest] run function dedsafio:cuchara/aplicar
execute if score $revivio dedsafio_vars matches 0 run tellraw @s {text:"No hay nadie esperando una cuchara.",color:"gray"}
tag @s remove reviviendo
