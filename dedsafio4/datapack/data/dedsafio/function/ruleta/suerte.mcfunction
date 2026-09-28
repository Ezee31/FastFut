title @a subtitle {text:"Suerte",color:"gold"}
tag @a remove suerte_elegido
execute as @a[tag=!muerto,tag=!eliminado,gamemode=!spectator,limit=1,sort=random] run tag @s add suerte_elegido
execute as @a[tag=suerte_elegido] run function dedsafio:cuchara/dar
tellraw @a ["",{text:"La ruleta le dio una cuchara a ",color:"gold"},{selector:"@a[tag=suerte_elegido,limit=1]",color:"yellow"}]
tag @a remove suerte_elegido
