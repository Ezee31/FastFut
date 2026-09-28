scoreboard players set $rayo dedsafio_vars 800
weather thunder 45
title @a subtitle {text:"Cae el rayo",color:"yellow"}
execute if score $bunker dedsafio_vars matches 1 run tellraw @a {text:"Tienes 40 segundos para entrar al búnker. Quien se quede fuera, lo alcanza el rayo.",color:"yellow"}
execute if score $bunker dedsafio_vars matches 0 run tellraw @a {text:"No hay búnker. En 40 segundos el rayo busca a quien vea el cielo. Un admin puede crear el campamento.",color:"yellow"}
