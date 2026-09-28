title @a subtitle {text:"Hambre",color:"dark_green"}
tellraw @a {text:"La ruleta vacía los estómagos.",color:"dark_green"}
effect give @a[tag=!muerto,tag=!eliminado,gamemode=survival] hunger 40 2 true
