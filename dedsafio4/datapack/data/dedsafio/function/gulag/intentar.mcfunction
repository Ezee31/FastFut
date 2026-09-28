execute unless entity @s[tag=muerto] run tellraw @s {text:"Solo los caídos entran al Gulag.",color:"gray"}
execute unless entity @s[tag=muerto] run return fail
execute if entity @s[tag=eliminado] run tellraw @s {text:"Ya fuiste eliminado.",color:"dark_red"}
execute if entity @s[tag=eliminado] run return fail
execute if score $gulag_activo dedsafio_vars matches 1 run tellraw @s {text:"El Gulag está ocupado. Espera tu turno.",color:"yellow"}
execute if score $gulag_activo dedsafio_vars matches 1 run return fail
function dedsafio:gulag/empezar
