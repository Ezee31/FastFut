execute store result score $tiro dedsafio_vars run random value 1..10
title @a title {text:"LA RULETA",color:"gold"}
playsound minecraft:block.note_block.bell master @a 0 100 0 8 1
execute if score $tiro dedsafio_vars matches 1 run function dedsafio:ruleta/eclipse
execute if score $tiro dedsafio_vars matches 2 run function dedsafio:ruleta/rayo
execute if score $tiro dedsafio_vars matches 3 run function dedsafio:ruleta/hambre
execute if score $tiro dedsafio_vars matches 4 run function dedsafio:ruleta/sin_regen
execute if score $tiro dedsafio_vars matches 5 run function dedsafio:ruleta/suerte
execute if score $tiro dedsafio_vars matches 6 run function dedsafio:ruleta/fantasmas
execute if score $tiro dedsafio_vars matches 7 run function dedsafio:ruleta/debilidad
execute if score $tiro dedsafio_vars matches 8 run function dedsafio:ruleta/magma
execute if score $tiro dedsafio_vars matches 9 run function dedsafio:ruleta/iceberg
execute if score $tiro dedsafio_vars matches 10 run function dedsafio:ruleta/prisa
