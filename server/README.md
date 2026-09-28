# DEDsafío 4 en un servidor

Servidor de Minecraft Java **26.3** con las mecánicas de la serie en un plugin propio. Cada jugador entra con el cliente normal. Los plugins se instalan una sola vez, en el servidor.

No es el servidor, el mapa ni los mods de Eufonia Studio. El DEDsafío Minecraft 4 empezó el 21 de septiembre de 2026 y sigue en curso: el mapa oficial y el modpack no se publicaron. Este paquete no los incluye.

El datapack del Realm, en `dedsafio4/`, se queda como está. No hace falta resetear New World.

## Qué se encontró de temporadas anteriores

No hay un mapa de DEDsafío 3 (ni del 2 ni del 4) para descargar.

- El mod de fans **Dedsafio 3** en CurseForge es de Forge 1.20.1, sin licencia clara para redistribuirlo, y obliga a que cada computadora instale Forge. No entra en un servidor 26.3 ni en un Realm.
- Hay un plugin suelto de Paper para utilidades del 3 y un addon de Bedrock. Ninguno trae el mapa de la serie.
- SpeedSafio 3 es un Discord privado, no un mundo público.

Por eso las arenas, el Gulag, Qumara, el iceberg, el Juicio, las cucharas y la ruleta están escritos de nuevo para este servidor. Las pistas del iceberg son texto original, no el guion de la serie.

## Qué hace el servidor

- Si mueres, caes. Durante unos segundos quedas en espectador, con título, sonido de wither y partículas, y después apareces en el lobby del Gulag. Sin un mod en el cliente no se puede mover la cámara como un cinematic de YouTube: esto es la animación que el servidor sí puede hacer.
- **Cuchara de resurrección.** Click derecho. Revive al caído más cercano y, si hay alguien de tu equipo, lo elige primero. No revive a quien ya perdió el Gulag.
- Se consigue crafteándola (fragmento de eco, pala de oro, estrella del Nether), con un 25 % al recoger escombros ancestrales, al matar al Wither o al dragón (dos), al derrotar a Qumara, en la ruleta, o si un admin la da.
- **Gulag** contra un Tiranosaurio (ravager enorme, 180 de vida). Una persona a la vez, 70 segundos, equipo de hierro. Si ganas, vuelves al campamento. Si pierdes, o se acaba el tiempo, es eliminación definitiva. Si te sales a mitad, no cuenta como derrota: vuelves al lobby.
- **Juicio.** El admin lo abre. Dos vivos se anotan. Dura 60 segundos y solo ahí hay PvP. El que pierde cae al lobby; no queda eliminado. Si se acaba el tiempo, empate. Si alguien se desconecta, gana el otro.
- **Ruleta** cada 10 minutos reales: eclipse, rayo, hambre, sin regeneración, cuchara de suerte, fantasmas, debilidad, magma, pista del iceberg o prisa.
- **Búnker** 28 bloques al sur del campamento. En el rayo, quien esté en el mundo principal a más de 6 bloques del búnker recibe el impacto.
- **Qumara**, primer jefe (warden, 500 de vida). Si no hay nadie cerca no se mueve, para que no se entierre sola. Al caer, da una cuchara a cada vivo y suelta un tótem y una estrella del Nether.
- **Día 5:** aviso de que el Nether deja de ser un rumor.
- Seis equipos: rojo, azul, verde, amarillo, naranja y morado. El fuego amigo está permitido.
- Los tótems siguen funcionando.
- Un libro de reglas al entrar, y un letrero flotante en el campamento.

## El mapa de TheNeitorLoL

La carpeta `D:\Downloads\Downloads\DEDSAFIO 3 - By TheNeitorLoL` es un mapa de fans de la temporada 3. Sirve como mundo de supervivencia. Este entorno no puede abrir el disco `D:` de tu PC, así que el archivo hay que copiarlo en la máquina donde corre el servidor, antes del primer arranque.

1. Corre `install.sh` una vez, para que exista `server\run`.
2. Si dentro de esa carpeta de descargas hay otra carpeta y recién ahí está `level.dat`, usa la que tiene `level.dat`.
3. Copia todo eso (el `level.dat` tiene que quedar suelto, no dentro de otra carpeta) a:

`server\run\world\`

4. Tiene que ser el mundo de **Java**. Un `.mcworld` de Bedrock no abre en este servidor.
5. Recién ahí, `start.sh`.

Si esa carpeta no está en la máquina del servidor, `install.sh` usa el mundo del zip del Realm (`dedsafio4/DEDsafio4-Realm-26.3.zip`) como supervivencia. Ese zip es el mundo que va en el hueco Empty del Realm, no el mapa de TheNeitorLoL. El plugin apaga las funciones del datapack para que la ruleta no gire dos veces.

Paper 26.3 actualiza el mundo viejo al abrirlo. El terreno no se aplana: si el mapa ya tiene regiones, el plugin no construye el campamento solo. Entrá, buscá un claro y usá `/dedsafio campamento`. Eso aplana solo 11x11 y pone el búnker 28 bloques al sur. El Gulag, Qumara, el iceberg y el Juicio viven en otro mundo (`eventos`) para no tapar el mapa.

## Cómo arrancarlo en tu computadora

Hace falta **Java 25** (Temurin) y el cliente **Minecraft Java 26.3**. Este agente no entra a tu PC: el servidor queda en esta carpeta para que lo corras vos.

1. Instala Java 25: https://adoptium.net/temurin/releases/?version=25
2. En esta carpeta:

```bash
bash install.sh
bash start.sh
```

`install.sh` baja Paper, el plugin DEDsafío y los plugins útiles. No pisa `server.properties` si ya lo editaste. Al arrancar se acepta el EULA de Minecraft: https://aka.ms/MinecraftEULA

3. En la consola negra de `start.sh` (sin la barra `/`), con tu nombre exacto de Minecraft Java, el de la cuenta. No es el mail:

```
op TuNombre
lp user TuNombre permission set * true
```

`op` deja el nivel 4 de operador: comandos de vanilla y los de admin de DEDsafío (`/dedsafio kit`, `qumara`, `calmar`, y el resto). La segunda línea, de LuckPerms, da el comodín `*`: WorldEdit, Chunky y cualquier plugin que se sume después. Para sacarlos: `deop TuNombre` y `lp user TuNombre permission unset *`.

4. En Minecraft 26.3: Multijugador → añadir servidor → `localhost` si jugás en la misma PC. El puerto es **25565**.
5. Para que entren otros, abrí el 25565 en el router o usá una IP pública. `online-mode=true`: hacen falta cuentas originales.

La primera vez el servidor crea el mundo, el campamento (11x11, con búnker) y las arenas en un mundo plano aparte llamado `eventos`.

## Plugins que instala el servidor

| Plugin | Para qué |
| --- | --- |
| Dedsafio | Las reglas de la serie |
| LuckPerms | Permisos |
| WorldEdit | Editar el mapa siendo admin |
| Chunky | Precargar chunks |
| PlaceholderAPI | Variables para otros plugins |
| Simple Voice Chat | Voz de proximidad. Este sí pide un mod en el cliente de cada uno: https://modrinth.com/plugin/simple-voice-chat |

Spark, CoreProtect y DecentHolograms no quedan instalados: Spark no tiene jar de Paper, y CoreProtect 24.1 y DecentHolograms 2.10.1 se niegan a arrancar en 26.3. Las reglas del campamento son un letrero del propio plugin. Paper ya trae el perfilador spark por dentro.

## Cómo probarlo

Entrá, y en el chat:

```
/dedsafio kit
```

Eso da ocho varas de click derecho: ruleta, rayo, eclipse, Qumara, Juicio, día siguiente, cuchara y campamento.

| Qué | Cómo |
| --- | --- |
| Elegir equipo | `/equipo rojo` (también azul, verde, amarillo, naranja, morado) |
| Ir al Gulag estando caído | `/gulag` |
| Anotarse al Juicio | `/juicio` después de que un admin lo abra |
| Arena de Qumara | `/jefe` |
| Iceberg | `/iceberg` |
| Estado | `/dedsafio status` |
| Ver que las arenas siguen en pie | `/dedsafio verificar` |
| Reconstruir arenas | `/dedsafio reconstruir` |
| Rehacer campamento y búnker | `/dedsafio campamento` |
| Volver al día 1 y apagar eventos | `/dedsafio calmar` (no perdona eliminados) |
| Devolver a todos a la partida | `/dedsafio perdonar` |
| Cancelar el Gulag si alguien se fue adentro | `/dedsafio abortar` |
| Cambiar los 10 minutos de la ruleta | `/dedsafio ciclo 1200` para 20 minutos |

Para ver la caída: morí en supervivencia (un admin en creativo no entra en la ruleta). Tenés que ver el título **CAÍSTE**, el sonido y las partículas, y a los 3 segundos el lobby. Desde ahí, `/gulag`. Otra persona con una cuchara te revive.

El Juicio pide dos jugadores vivos. Qumara se invoca con la vara o con `/dedsafio qumara`.

## Límites

- El mapa de la serie no existe en público. Las arenas son salas hechas para estos eventos, dentro del mundo `eventos`.
- La animación de muerte no mueve la cámara: espectador, título, sonido y partículas.
- Un solo peleador en el Gulag.
- El Juicio no guarda el inventario: si morís, soltás las cosas.
- El campamento aplana un cuadrado de 11x11 y construye el búnker 28 bloques al sur. Conviene hacerlo en un claro.
