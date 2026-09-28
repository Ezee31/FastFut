scoreboard players set $juicio dedsafio_vars 1
tellraw @a {text:"EL JUICIO ESTÁ ABIERTO. Los dos primeros en presentarse pelean. El perdedor cae al Gulag.",color:"gold"}
tellraw @a {text:"[Presentarse al Juicio]",color:"red",click_event:{action:"run_command",command:"trigger juicio"}}
playsound minecraft:block.bell.use master @a 0 80 0 8 1
