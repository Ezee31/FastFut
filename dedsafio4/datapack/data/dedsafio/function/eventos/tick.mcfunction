scoreboard players add $reloj dedsafio_vars 1
execute if score $reloj dedsafio_vars >= $ciclo dedsafio_vars run function dedsafio:eventos/nuevo_dia
execute if score $eclipse dedsafio_vars matches 1.. run scoreboard players remove $eclipse dedsafio_vars 1
execute if score $eclipse dedsafio_vars matches 1.. run scoreboard players add $pulso dedsafio_vars 1
execute if score $pulso dedsafio_vars matches 200.. run function dedsafio:ruleta/pulso_eclipse
execute if score $eclipse dedsafio_vars matches 0 run function dedsafio:ruleta/fin_eclipse
execute if score $rayo dedsafio_vars matches 1.. run scoreboard players remove $rayo dedsafio_vars 1
execute if score $rayo dedsafio_vars matches 1.. run title @a[tag=!muerto,tag=!eliminado] actionbar {text:"EL RAYO CAE. Entra al búnker del mundo principal.",color:"yellow"}
execute if score $rayo dedsafio_vars matches 0 run function dedsafio:ruleta/impacto_rayo
execute if score $sin_regen dedsafio_vars matches 1.. run scoreboard players remove $sin_regen dedsafio_vars 1
execute if score $sin_regen dedsafio_vars matches 0 run function dedsafio:ruleta/fin_regen
execute if score $fantasmas dedsafio_vars matches 1.. run scoreboard players remove $fantasmas dedsafio_vars 1
execute if score $fantasmas dedsafio_vars matches 0 run function dedsafio:ruleta/fin_fantasmas
