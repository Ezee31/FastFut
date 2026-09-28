execute as @a[tag=en_gulag] if score $gulag_activo dedsafio_vars matches 0 run function dedsafio:gulag/devolver
execute if score $gulag_activo dedsafio_vars matches 1 in dedsafio:eventos unless entity @e[type=ravager,tag=trex] run function dedsafio:gulag/gano
execute if score $gulag_activo dedsafio_vars matches 1 if score $gulag_tiempo dedsafio_vars matches 1.. run scoreboard players remove $gulag_tiempo dedsafio_vars 1
execute if score $gulag_activo dedsafio_vars matches 1 if score $gulag_tiempo dedsafio_vars matches ..0 run function dedsafio:gulag/tiempo
execute as @a[tag=en_gulag] unless predicate dedsafio:en_eventos run function dedsafio:gulag/regresar_arena
execute as @a[tag=en_gulag] at @s if predicate dedsafio:en_eventos unless entity @s[x=-22,y=38,z=-22,dx=44,dy=24,dz=44] run tp @s 0 41 -6 0 0
