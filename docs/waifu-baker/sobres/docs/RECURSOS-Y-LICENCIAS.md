# Recursos y licencias

## Código

`sobre-capas.js`, `sobre-capas.d.ts`, `creador-sobres.html`, `apertura-sobre.html`, los envoltorios de `integraciones/`, las herramientas de `herramientas/` y las pruebas se escribieron para Waifu Baker en las sesiones de diseño con Claude, igual que `carta-capas.js`. No copian código de terceros ni usan librerías. Las condiciones de uso las define el proyecto (Koopa y Bruno).

## Fuentes

No se incluye ningún archivo de fuente: se cargan desde Google Fonts.

| Fuente | Dónde se usa | Autor | Licencia |
|---|---|---|---|
| Dela Gothic One | Logo "WAIFU BAKER" y nombre del set en el sobre; títulos del creador y de la apertura | artakana | SIL Open Font License 1.1 |
| Archivo | Insignia, código y número de cartas del sobre; textos y botones del creador y de la apertura | Omnibus-Type | SIL Open Font License 1.1 |

La licencia OFL permite usarlas, incrustarlas y servirlas desde el propio sitio, también en productos comerciales; lo único que no permite es vender la fuente sola. En Next.js conviene cargarlas con `next/font/google`. El logo y la banda del sobre **forman parte del sobre**: sin estas fuentes salen con "Arial Black" o la de respaldo del sistema y se ven distintos.

## Plástico 3D

`src/img/`:

| Archivo | Tamaño | Qué es |
|---|---|---|
| `plastico-brillo.webp` | 750 × 1312, 292 KB | Reflejos y arrugas brillantes (blanco con alfa). |
| `plastico-sombra.webp` | 750 × 1312, 154 KB | Pliegues y costados curvos (negro con alfa). |
| `plastico-silueta.webp` | 1000 × 1750, 12 KB | Forma del sobre: almohada, pellizco y dientes. |

**Origen.** Las tres salieron de `herramientas/render-plastico-gris.png` (959 × 1639) con `herramientas/extraer-plastico.py`. Ese render es un sobre de plástico vacío, en gris y sin arte, que Bruno generó con ChatGPT el 5 de noviembre de 2026 a partir de una maqueta del sobre de Waifu Baker. La idea del volumen se inspiró en los sobres de un juego de cartas digital que Bruno usó de referencia; **no** se copió ningún elemento de su marca: ni logos, ni personajes, ni textos, ni diseño gráfico. **Confirmen con Bruno** que las condiciones del servicio con que se generó el render permiten usarlo en un producto comercial.

## Patrones holo

`src/marcos/patrones/`. Todos son máscaras: blanco con transparencia. Los usan los sellos del sobre, el brillo "ondas que brillan" y el marco PX de las cartas.

| Archivo | Tamaño | Origen |
|---|---|---|
| `liquido.webp` | 560 × 996, 384 KB | Textura de holo líquido que aportó Bruno el 29 oct 2026, reducida y convertida a WebP. **Confirmen con Bruno de dónde salió y si se puede usar en un producto comercial.** |
| `remolinos`, `ondas`, `hielo`, `estrellas`, `panal`, `diagonales`, `puntos`, `aurora` | 512 × 512, de 5 a 67 KB | Originales: los generó `herramientas/generar-patrones.py` con matemáticas (ruido periódico, Voronoi, ondas). Se repiten sin costuras. Sin restricciones de terceros. |
| `estelas.webp` | 700 × 1000, 168 KB | Original: 78 arcos tipo cometa generados con el mismo script. Patrón de fábrica de "ondas que brillan". |

## Sobre de ejemplo (FA01)

`src/sobres/fa01/`, 1000 × 1750:

| Archivo | Tamaño | Qué es |
|---|---|---|
| `sobre_fa01_fondo.webp` | 138 KB | Fondo, sin transparencia. |
| `sobre_fa01_personaje.webp` | 147 KB | Yuki, con transparencia. |
| `sobre_fa01_efecto.webp` | 322 KB | Textura de brillos para modo `overlay`. |

Son las capas de la carta de Yuki (ver abajo) recompuestas en el lienzo del sobre. Arte de prueba.

## Cartas de muestra (Yuki)

`src/cartas/yuki/`, 700 × 991: `carta.webp` (carta plana), `fondo.webp`, `personaje.webp`, `efecto.webp`, `insignia.webp`, y el sello `ssr.webp` (210 × 147). Son las mismas capas del paquete de cartas.

Bruno aportó las capas originales, que se optimizaron a WebP en las sesiones. La web del juego indica que sus ilustraciones están generadas con IA. **Antes de publicar estas imágenes, confirma con Bruno su origen y derechos.** Son arte de prueba: personaje adulto, uniformado y sin desnudo.

## Sonidos

No hay archivos de audio. El rasgado, el despegado, el zumbido de las cartas y la campanita se generan en el momento con Web Audio (ruido filtrado y osciladores).

## Iconos y formas

- Ojo y ojo tachado de la lista de capas: SVG escritos a mano dentro de `creador-sobres.html`.
- Flechas y ×: caracteres de texto.
- Estrella de 16 puntas de la carta especial: un `clip-path: polygon()` escrito a mano en `apertura-sobre.html`.
- Logo "WB" del creador: texto con CSS.
- Dientes, línea de rasgado, sellos, foil, logo del sobre, banda e insignia: CSS dentro de `sobre-capas.js`.

Todo es original del proyecto. Fuera de `liquido.webp`, del render del plástico y del arte de Yuki, no hay imágenes de terceros ni descargadas de bancos de recursos.
