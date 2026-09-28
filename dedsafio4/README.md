# DEDsafío 4 para un Realm de Java

Recreación de fans para jugar en un **Realm de Minecraft Java 26.3**. No es el servidor, el mapa ni los plugins de Eufonia Studio. El DEDsafío Minecraft 4 empezó el 21 de septiembre de 2026 y sigue en curso: el mapa oficial, los mods y los plugins no se publicaron. Este paquete no los incluye y no hay que buscar una filtración.

Un Realm de Java no puede correr mods de Forge o Fabric, ni plugins de Paper. Sí puede cargar un datapack y un mundo. El DEDsafío se juega en Java. Un Realm de Bedrock no abre este mundo.

## Qué hay

- Supervivencia hardcore de espíritu: si mueres caes, y si pierdes el Gulag quedas eliminado.
- **Cuchara de resurrección.** Revive a un compañero caído. No revive a quien ya perdió el Gulag.
- **Gulag** contra un Tiranosaurio (ravager enorme). Una persona a la vez. Si ganas, vuelves con el equipo de hierro. Si pierdes, o se acaba el tiempo, es eliminación definitiva.
- **Juicio.** El admin lo abre. Dos vivos se anotan y pelean. El que pierde cae al lobby; no queda eliminado. El PvP del mundo solo se enciende durante el Juicio.
- **Ruleta** cada 10 minutos reales: eclipse, rayo, hambre, sin regeneración, cuchara de suerte, fantasmas, debilidad, magma en el Nether, pista del iceberg o prisa.
- **Búnker** en el campamento. En el evento del rayo, quien esté a más de 6 bloques del búnker y en el mundo principal recibe el impacto.
- **Qumara**, primer jefe (warden). El admin la invoca. Al caer, da una cuchara a cada vivo y un tótem más una estrella del Nether en la arena.
- **Iceberg** con pistas escritas para esta recreación. No son el guion de Eufonia.
- Seis equipos: rojo, azul, verde, amarillo, naranja y morado.
- Arenas ya construidas en la dimensión `dedsafio:eventos`, más un campamento con búnker junto al spawn del mundo incluido.

Los tótems de la inmortalidad siguen funcionando. La ruleta no los anula.

## Cómo meterlo en el Realm

El archivo `DEDsafio4-Realm-26.3.zip` es un mundo de Java 26.3. `level.dat` está en la raíz del zip.

1. Entra al Realm desde Minecraft Java **26.3**.
2. Descarga una copia del mundo actual por si quieres volver atrás.
3. Sustituye el mundo del Realm con este zip.
4. Entra, date op y prueba `/function dedsafio:admin/kit`.

El mundo ya trae el datapack, las arenas, el campamento, el búnker y el spawn movido al campamento. El día empieza en 1.

### Si quieres conservar el mundo que ya tienes

No sustituyas el mundo. Copia la carpeta `datapack` dentro de `datapacks` del mundo del Realm, con el nombre `dedsafio4`. Vuelve a subir el mundo. Como op, en un claro del mundo principal:

```
/reload
/function dedsafio:admin/campamento
```

Eso aplana 11×11 bloques donde estás parado, arma el búnker 28 bloques al sur y **mueve el spawn del mundo**. Para levantar las arenas:

```
/function dedsafio:admin/reconstruir_mapa
```

Las arenas tardan unos segundos en aparecer. Hay que estar en el mundo con gente, porque el servidor tiene que seguir corriendo ticks.

## Jugadores

Al entrar por primera vez reciben un libro con las reglas. El chat también deja elegir equipo.

| Acción | Comando |
| --- | --- |
| Equipo rojo, azul, verde, amarillo, naranja, morado | `/trigger equipo set 1` … `set 6` |
| Ir al Gulag estando caído | `/trigger gulag` |
| Anotarse al Juicio | `/trigger juicio` |
| Ir a la arena de Qumara | `/trigger jefe` |
| Ir al iceberg | `/trigger iceberg` |

La cuchara se usa con click derecho, apuntando cerca del compañero caído. Primero busca a alguien de tu equipo.

Se consigue una cuchara al craftearla (fragmento de eco arriba, pala de oro en medio, estrella del Nether abajo), con un 25 % al recoger escombros ancestrales, al matar al Wither o al dragón (dos), al derrotar a Qumara, en la ruleta, o si un admin te la da.

## Admins

Hay que ser operador. El kit son ocho varas de click derecho:

```
/function dedsafio:admin/kit
```

Ruleta, rayo, eclipse, Qumara, Juicio, día siguiente, dar cuchara y campamento.

| Función | Efecto |
| --- | --- |
| `/function dedsafio:admin/kit` | Da las varas |
| `/function dedsafio:juicio/abrir` | Abre la inscripción al Juicio |
| `/function dedsafio:boss/invocar` | Invoca a Qumara en su arena |
| `/function dedsafio:gulag/abortar` | Cancela el Gulag si alguien se desconecta dentro |
| `/function dedsafio:admin/perdonar` | Saca a todos de eliminado o caído y los devuelve al campamento |
| `/function dedsafio:admin/calmar` | Vuelve al día 1, apaga eventos y quita a Qumara y al T-Rex |
| `/function dedsafio:admin/verificar` | Escribe en el chat si las arenas y el campamento siguen en pie |
| `/function dedsafio:admin/campamento_origen` | Reconstruye el campamento inicial cerca de x=8, z=8 y mueve el spawn |

La ruleta gira sola cada 10 minutos (12000 ticks). Para dejarla en 20 minutos:

```
/scoreboard players set $ciclo dedsafio_vars 24000
```

El primer giro ocurre al terminar el primer ciclo, no al minuto cero. El día 5 avisa que en el Nether hay cubos de magma.

## Límites de esta recreación

- No es el mapa de la serie ni una copia de sus construcciones.
- El Juicio no guarda el inventario: si mueres en la arena, los objetos caen al suelo.
- El Gulag atiende a una persona a la vez. Si el luchador se va, un admin debe usar `gulag/abortar`.
- Qumara se queda en la arena hasta que la matan. No se esconde bajo tierra como un warden normal.
- El campamento aplana el terreno donde se construye.
