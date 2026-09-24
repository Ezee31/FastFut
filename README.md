# Estudio de corte

Estudio 3D para probar cortes sobre una cabeza modelada a partir de una foto frontal. La cara usa la textura real; el cráneo, las orejas y el pelo se reconstruyen para poder girar la cabeza y cambiar el corte.

## Usar

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite. Arrastra para girar, elige un corte y ajusta largo, degradado, rizos, barba y color. Las flechas izquierda y derecha cambian de corte. `R` gira la cabeza sola.

## Regenerar el modelo

Hace falta Python con `pillow`, `numpy` y `mediapipe`, más las fotos originales:

```bash
python3 scripts/build_face.py
```

El script escribe `public/face.json`, `public/texture.jpg` y las miniaturas de `public/refs/`.
