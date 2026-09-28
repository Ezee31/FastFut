scoreboard players set @s muertes 0
execute if entity @s[tag=en_juicio] run return run function dedsafio:juicio/perdio
execute if entity @s[tag=en_gulag] run return run function dedsafio:gulag/perdio
execute if entity @s[tag=eliminado] run return run function dedsafio:jugador/a_espectador
function dedsafio:jugador/cayo
