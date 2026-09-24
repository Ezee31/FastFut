# Estudio de corte

Prueba cortes sobre tu foto frontal. La cara es la foto, sin deformarla: el pelo se recorta, se degrada o se deja al ras, y donde se quita aparece el cuero cabelludo con la luz de tu frente.

## Usar

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite. Elige un corte y ajusta largo, degradado, flequillo, raya, color y barba. Las flechas izquierda y derecha cambian de corte. «Tu corte» vuelve a la foto sin retoque.

## Regenerar las capas

Hace falta Python con `pillow`, `numpy` y `opencv-python`, y `public/texture.jpg`:

```bash
python3 scripts/build_studio.py
```

Eso escribe `public/bald.jpg`, `public/shaved.jpg`, las máscaras y `public/studio.json`.
