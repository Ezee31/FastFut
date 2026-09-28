execute if entity @s[tag=muerto] run tellraw @s {text:"Los caídos no entran a la arena.",color:"gray"}
execute if entity @s[tag=muerto] run return fail
execute if entity @s[tag=eliminado] run tellraw @s {text:"Los eliminados solo observan.",color:"gray"}
execute if entity @s[tag=eliminado] run return fail
execute in dedsafio:eventos run tp @s 150 41 -14 0 0
