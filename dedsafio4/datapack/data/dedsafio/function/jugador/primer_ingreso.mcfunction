tag @s add visto
execute if entity @s[tag=!eliminado] run gamemode survival @s
function dedsafio:jugador/dar_reglas
tellraw @s {text:"Bienvenido al Realm. Sobrevive, consigue cucharas y no pierdas el Gulag.",color:"gold"}
tellraw @s [{text:"Equipos: ",color:"gray"},{text:"[Rojo] ",color:"red",click_event:{action:"run_command",command:"trigger equipo set 1"}},{text:"[Azul] ",color:"blue",click_event:{action:"run_command",command:"trigger equipo set 2"}},{text:"[Verde] ",color:"green",click_event:{action:"run_command",command:"trigger equipo set 3"}},{text:"[Amarillo] ",color:"yellow",click_event:{action:"run_command",command:"trigger equipo set 4"}},{text:"[Naranja] ",color:"gold",click_event:{action:"run_command",command:"trigger equipo set 5"}},{text:"[Morado]",color:"dark_purple",click_event:{action:"run_command",command:"trigger equipo set 6"}}]
tellraw @s [{text:"[Ir al iceberg] ",color:"aqua",click_event:{action:"run_command",command:"trigger iceberg"}},{text:"[Ir con Qumara]",color:"dark_purple",click_event:{action:"run_command",command:"trigger jefe"}}]
