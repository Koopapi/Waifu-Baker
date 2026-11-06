#!/usr/bin/env python3
"""
Saca las tres capas del plástico 3D del sobre a partir de un render del sobre VACÍO en gris medio.

  python3 extraer-plastico.py render-gris.png carpeta-salida/

Entrada: el sobre de frente, sin arte ni textos, superficie gris (#808080), fondo transparente (o negro),
         idealmente 1000 × 1750 px (si no, se reescala a esa medida).
Salida (WebP con transparencia):
  plastico-brillo.webp   blanco con alfa: todo lo que queda MÁS CLARO que el gris (reflejos, arrugas brillantes). 750 × 1312.
  plastico-sombra.webp   negro con alfa: todo lo que queda MÁS OSCURO que el gris (pliegues, costados curvos).    750 × 1312.
  plastico-silueta.webp  blanco con alfa: la forma del sobre (pellizco y dientes). 1000 × 1750.

sobre-capas.js pinta la sombra encima del arte, luego el lustre que se mueve y al final el brillo, y recorta todo con la silueta.
Requiere Pillow y numpy:  pip install pillow numpy
"""
import os
import sys

import numpy as np
from PIL import Image

W, H = 1000, 1750


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    entrada, salida = sys.argv[1], sys.argv[2]
    os.makedirs(salida, exist_ok=True)

    im = Image.open(entrada).convert('RGBA').resize((W, H), Image.LANCZOS)
    a = np.array(im).astype(float)
    alfa = a[..., 3] / 255
    if alfa.min() > 0.99:
        # sin transparencia: se asume fondo negro y se toma como fuera del sobre lo casi negro
        alfa = np.clip((a[..., :3].mean(-1) - 8) / 20, 0, 1)
    luz = a[..., :3].mean(-1)

    # el gris de base se mide en el centro del cuerpo, donde el plástico está liso
    gris = float(np.median(luz[600:1100, 300:700]))
    print('gris de base:', round(gris, 1))

    brillo = np.clip((luz - gris) / (255 - gris), 0, 1) ** 0.85 * alfa
    sombra = np.clip((gris - luz) / gris, 0, 1) ** 0.9 * alfa
    silueta = np.clip((alfa - 0.35) / 0.3, 0, 1)

    def guardar(nombre, rgb, a_, tam=None, calidad=80):
        out = np.zeros((H, W, 4), np.uint8)
        out[..., :3] = rgb
        out[..., 3] = (np.clip(a_, 0, 1) * 255).astype(np.uint8)
        img = Image.fromarray(out)
        if tam:
            img = img.resize(tam, Image.LANCZOS)
        ruta = os.path.join(salida, nombre)
        img.save(ruta, 'WEBP', quality=calidad, method=6)
        print(nombre, img.size, os.path.getsize(ruta), 'bytes')

    guardar('plastico-brillo.webp', 255, brillo, (750, 1312))
    guardar('plastico-sombra.webp', 0, sombra, (750, 1312))
    guardar('plastico-silueta.webp', 255, silueta, None, 90)


if __name__ == '__main__':
    main()
