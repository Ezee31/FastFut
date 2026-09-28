execute in minecraft:overworld run forceload add -32 -32 48 80
execute in minecraft:overworld positioned 8 0 8 positioned over motion_blocking_no_leaves align xyz positioned ~0.5 ~ ~0.5 run function dedsafio:admin/construir_campamento
execute in minecraft:overworld run forceload remove all
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] run forceload add ~-16 ~-16 ~16 ~48
execute in minecraft:overworld if entity @e[type=marker,tag=bunker] run say CAMPAMENTO_LISTO
execute in minecraft:overworld unless entity @e[type=marker,tag=bunker] run say CAMPAMENTO_FAIL
