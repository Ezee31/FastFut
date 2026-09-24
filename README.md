# Estudio de corte

Escaneá tu cara con la cámara (o subí fotos), armá tu cabeza en 3D con tu piel y tu
barba reales, y probá cortes girando el modelo.

## Usar

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite. Al abrir aparece la cabeza de ejemplo; con
**Escanear** tomás cinco ángulos con la cámara y el modelo se rearma con tu cara.
Si dejás marcada la opción de cámara en vivo, el modelo copia tus gestos mientras
te movés. Las flechas cambian de corte.

La cámara necesita `https` o `localhost`; el navegador no la entrega en otro
origen.

## Cómo está hecho

- **Cara**: el modelo canónico de MediaPipe Face Landmarker, ajustado vértice por
  vértice a los 478 puntos que devuelve el tracker. De ahí salen la forma y la
  animación.
- **Cabeza**: `scripts/build_head.py` genera cráneo, orejas, cuello y busto en el
  mismo espacio canónico, cosidos al óvalo de la cara, y los escribe en
  `public/head.json`.
- **Textura**: cada captura se proyecta triángulo por triángulo en un atlas de
  2048², pesando cada vista por cuánto vio ese triángulo de frente. El cuero
  cabelludo y el cuello se pintan con el tono de tu piel.
- **Pelo**: hair cards, la técnica de los juegos. Una capa opaca sobre el cráneo
  da la masa, y cientos de cintas con textura de mechones dan el contorno. El
  shader usa dos lóbulos anisotrópicos (Kajiya-Kay) para el brillo.

## Regenerar la cabeza

Hace falta Python con `numpy` y `pillow`:

```bash
python3 scripts/build_head.py      # public/head.json
python3 scripts/preview_head.py    # renders de control en /tmp/head
```

`npm install` también baja el modelo de MediaPipe y copia su runtime a
`public/` (`scripts/fetch_assets.mjs`), así el estudio funciona sin internet.
