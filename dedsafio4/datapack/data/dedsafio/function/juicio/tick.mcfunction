execute if score $juicio_activo dedsafio_vars matches 1 if score $juicio_tiempo dedsafio_vars matches 1.. run scoreboard players remove $juicio_tiempo dedsafio_vars 1
execute if score $juicio_activo dedsafio_vars matches 1 if score $juicio_tiempo dedsafio_vars matches ..0 run function dedsafio:juicio/empate
execute if score $juicio_activo dedsafio_vars matches 0 if score $juicio dedsafio_vars matches 1 store result score $fila dedsafio_vars if entity @a[tag=fila_juicio]
execute if score $juicio_activo dedsafio_vars matches 0 if score $juicio dedsafio_vars matches 1 if score $fila dedsafio_vars matches 2.. run function dedsafio:juicio/empezar
execute as @a[tag=en_juicio] at @s unless predicate dedsafio:en_eventos run function dedsafio:juicio/regresar
