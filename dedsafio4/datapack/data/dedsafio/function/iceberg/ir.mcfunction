execute if entity @s[tag=muerto] run tellraw @s {text:"Los caídos no viajan. Primero vuelve.",color:"gray"}
execute if entity @s[tag=muerto] run return fail
execute if entity @s[tag=eliminado] run tellraw @s {text:"Los eliminados solo observan.",color:"gray"}
execute if entity @s[tag=eliminado] run return fail
execute in dedsafio:eventos run tp @s 300 41 -10 0 0
title @s title {text:"ICEBERG",color:"aqua"}
