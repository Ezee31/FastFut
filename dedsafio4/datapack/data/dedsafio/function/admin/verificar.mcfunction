execute in dedsafio:eventos if block -20 40 -20 stone_bricks run say Q_GULAG_OK
execute in dedsafio:eventos unless block -20 40 -20 stone_bricks run say Q_GULAG_FAIL
execute in dedsafio:eventos if block 0 40 0 red_terracotta run say Q_CENTRO_OK
execute in dedsafio:eventos if block 150 40 0 sculk run say Q_QUMARA_OK
execute in dedsafio:eventos unless block 150 40 0 sculk run say Q_QUMARA_FAIL
execute in dedsafio:eventos if block 130 40 -20 deepslate_tiles run say Q_QUMARA_PISO_OK
execute in dedsafio:eventos if block 300 40 0 packed_ice run say Q_ICE_OK
execute in dedsafio:eventos unless block 300 40 0 packed_ice run say Q_ICE_FAIL
execute in dedsafio:eventos if block 0 40 80 quartz_block run say Q_JUICIO_OK
execute in dedsafio:eventos unless block 0 40 80 quartz_block run say Q_JUICIO_FAIL
execute in dedsafio:eventos if block 0 41 -48 oak_sign run say Q_SIGN_OK
execute in minecraft:overworld if entity @e[type=marker,tag=bunker] run say Q_BUNKER_OK
execute in minecraft:overworld unless entity @e[type=marker,tag=bunker] run say Q_BUNKER_FAIL
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] if block ~ ~ ~ campfire run say Q_CAMP_OK
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] unless block ~ ~ ~ campfire run say Q_CAMP_FAIL
execute in minecraft:overworld at @e[type=marker,tag=bunker,limit=1] if block ~ ~ ~-4 iron_door run say Q_DOOR_OK
execute in minecraft:overworld at @e[type=marker,tag=bunker,limit=1] unless block ~ ~ ~-4 iron_door run say Q_DOOR_FAIL
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] if block ~-2 ~ ~ barrel run say Q_BARREL_OK
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] if items block ~-2 ~ ~ container.0 bread run say Q_BREAD_OK
execute in minecraft:overworld at @e[type=marker,tag=campamento,limit=1] unless items block ~-2 ~ ~ container.0 bread run say Q_BREAD_FAIL
execute if score $qumara dedsafio_vars matches 0 run say Q_SCORE_0
execute if score $qumara dedsafio_vars matches 1 run say Q_SCORE_1
execute if score $qumara dedsafio_vars matches 2 run say Q_SCORE_2
execute in dedsafio:eventos if entity @e[type=warden,tag=qumara] run say Q_WARDEN_VIVO
execute in dedsafio:eventos if entity @e[type=ravager,tag=trex] run say Q_TREX_VIVO
