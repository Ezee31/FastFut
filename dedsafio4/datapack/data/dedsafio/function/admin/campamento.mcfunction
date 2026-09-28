execute unless predicate dedsafio:en_overworld run tellraw @s {text:"Párate en el mundo principal para armar el campamento.",color:"red"}
execute if predicate dedsafio:en_overworld at @s align xyz positioned ~0.5 ~ ~0.5 run function dedsafio:admin/construir_campamento
execute if predicate dedsafio:en_overworld run tellraw @s {text:"Campamento listo. El búnker quedó 28 bloques al sur. El spawn del mundo se movió aquí.",color:"green"}
