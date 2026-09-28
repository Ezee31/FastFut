execute in dedsafio:eventos run fill -24 40 -24 24 40 24 stone_bricks
execute in dedsafio:eventos run fill -8 40 -8 8 40 8 red_terracotta
execute in dedsafio:eventos run fill -24 41 -24 24 44 -24 iron_bars
execute in dedsafio:eventos run fill -3 40 -31 3 40 -25 stone_bricks
execute in dedsafio:eventos run fill -24 41 24 24 44 24 deepslate_bricks
execute in dedsafio:eventos run fill -24 41 -24 -24 44 24 deepslate_bricks
execute in dedsafio:eventos run fill 24 41 -24 24 44 24 deepslate_bricks
execute in dedsafio:eventos run fill -16 40 -52 16 40 -32 polished_deepslate
execute in dedsafio:eventos run fill -16 41 -52 16 45 -52 deepslate_bricks
execute in dedsafio:eventos run fill -16 41 -52 -16 45 -32 deepslate_bricks
execute in dedsafio:eventos run fill 16 41 -52 16 45 -32 deepslate_bricks
execute in dedsafio:eventos run fill -16 45 -52 16 45 -32 barrier
execute in dedsafio:eventos run fill -16 41 -32 16 44 -32 iron_bars
execute in dedsafio:eventos run fill -2 41 -32 2 43 -32 air
execute in dedsafio:eventos run fill -24 41 -23 24 43 -23 air
execute in dedsafio:eventos run setblock -22 41 -22 sea_lantern
execute in dedsafio:eventos run setblock 22 41 -22 sea_lantern
execute in dedsafio:eventos run setblock -22 41 22 sea_lantern
execute in dedsafio:eventos run setblock 22 41 22 sea_lantern
execute in dedsafio:eventos run setblock 0 42 0 sea_lantern
execute in dedsafio:eventos run setblock -14 41 -50 red_banner
execute in dedsafio:eventos run setblock 14 41 -50 red_banner
execute in dedsafio:eventos run setblock 0 41 -48 oak_sign[rotation=8]{front_text:{messages:[{text:"GULAG",color:"dark_red"},{text:"/trigger gulag",color:"gold"},{text:"para el T-Rex",color:"gray"},{text:"o espera una cuchara",color:"gray"}]}}
execute in dedsafio:eventos run setblock 0 43 8 light[level=15]
execute in dedsafio:eventos run setblock 0 43 -46 light[level=15]
execute in dedsafio:eventos run kill @e[type=marker,tag=lobby]
execute in dedsafio:eventos run summon marker 0 41 -46 {Tags:["lobby"]}
