execute in dedsafio:eventos run kill @e[type=marker,tag=mapa_listo]
execute in dedsafio:eventos run summon marker 0 50 0 {Tags:["mapa_listo"]}
execute in dedsafio:eventos if block -20 40 -20 stone_bricks run say MAPA_GULAG_OK
execute in dedsafio:eventos unless block -20 40 -20 stone_bricks run say MAPA_GULAG_FAIL
execute in dedsafio:eventos if block 130 40 -20 deepslate_tiles run say MAPA_QUMARA_OK
execute in dedsafio:eventos unless block 130 40 -20 deepslate_tiles run say MAPA_QUMARA_FAIL
execute in dedsafio:eventos if block 300 40 0 packed_ice run say MAPA_ICEBERG_OK
execute in dedsafio:eventos unless block 300 40 0 packed_ice run say MAPA_ICEBERG_FAIL
execute in dedsafio:eventos if block 0 40 80 quartz_block run say MAPA_JUICIO_OK
execute in dedsafio:eventos unless block 0 40 80 quartz_block run say MAPA_JUICIO_FAIL
tellraw @a {text:"Arenas listas: Gulag, Juicio, Qumara e Iceberg.",color:"green"}
