title @a subtitle {text:"Magma",color:"gold"}
tellraw @a {text:"EL MAGMA NO PERDONA. En el Nether aparecen cubos. En el mundo, el calor frena los pies.",color:"gold"}
execute as @a[tag=!muerto,tag=!eliminado,gamemode=survival] at @s if predicate dedsafio:en_nether run summon magma_cube ~2 ~1 ~2 {Tags:["evento_magma"],Size:2,PersistenceRequired:1b}
execute as @a[tag=!muerto,tag=!eliminado,gamemode=survival] at @s if predicate dedsafio:en_overworld run effect give @s slowness 25 1 true
