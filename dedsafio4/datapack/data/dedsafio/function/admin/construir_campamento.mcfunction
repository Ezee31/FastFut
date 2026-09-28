kill @e[type=marker,tag=campamento]
kill @e[type=marker,tag=bunker]
forceload add ~-16 ~-16 ~16 ~40
fill ~-5 ~-1 ~-5 ~5 ~-1 ~5 cobblestone
fill ~-5 ~ ~-5 ~5 ~3 ~5 air
setblock ~ ~ ~ campfire[lit=true]
setblock ~2 ~ ~ crafting_table
setblock ~-2 ~ ~ barrel
setblock ~ ~ ~2 smithing_table
setblock ~-4 ~ ~ torch
setblock ~4 ~ ~ torch
setblock ~ ~ ~4 torch
setblock ~ ~ ~-4 torch
setblock ~ ~ ~-3 oak_sign[rotation=8]{front_text:{messages:[{text:"CAMPAMENTO",color:"gold"},{text:"Búnker al sur",color:"yellow"},{text:"Lee el libro",color:"gray"},{text:"",color:"white"}]}}
item replace block ~-2 ~ ~ container.0 with bread 16
item replace block ~-2 ~ ~ container.1 with torch 32
item replace block ~-2 ~ ~ container.2 with cooked_beef 16
summon marker ~ ~ ~ {Tags:["campamento"]}
fill ~-3 ~-1 ~24 ~3 ~4 ~32 deepslate_bricks
fill ~-2 ~ ~25 ~2 ~3 ~31 air
setblock ~ ~ ~24 iron_door[facing=north,half=lower,hinge=left,open=false]
setblock ~ ~1 ~24 iron_door[facing=north,half=upper,hinge=left,open=false]
setblock ~ ~2 ~28 lantern[hanging=true]
setblock ~ ~ ~28 light[level=15]
summon marker ~ ~ ~28 {Tags:["bunker"]}
scoreboard players set $bunker dedsafio_vars 1
setworldspawn ~1 ~ ~
spawnpoint @a ~1 ~ ~
