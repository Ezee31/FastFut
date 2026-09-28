execute if score $juicio dedsafio_vars matches 0 run tellraw @s {text:"No hay un juicio abierto.",color:"gray"}
execute if score $juicio dedsafio_vars matches 0 run return fail
execute if entity @s[tag=muerto] run tellraw @s {text:"Los caídos no se presentan.",color:"gray"}
execute if entity @s[tag=muerto] run return fail
execute if entity @s[tag=eliminado] run tellraw @s {text:"Estás eliminado.",color:"dark_red"}
execute if entity @s[tag=eliminado] run return fail
execute if entity @s[tag=fila_juicio] run tellraw @s {text:"Ya estás en la fila.",color:"yellow"}
execute if entity @s[tag=fila_juicio] run return fail
execute if entity @s[tag=en_juicio] run return fail
tag @s add fila_juicio
tellraw @a ["",{selector:"@s",color:"gold"},{text:" se presenta al Juicio.",color:"gray"}]
