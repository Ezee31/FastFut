title @a subtitle {text:"Debilidad",color:"dark_gray"}
tellraw @a {text:"Los golpes pesan menos. Los de ellos, no.",color:"dark_gray"}
effect give @a[tag=!muerto,tag=!eliminado,gamemode=survival] weakness 60 1 true
