# Recursos y licencias

## Código

`carta-capas.js`, `carta-capas.d.ts`, `creador-cartas.html`, `ejemplo.html`, los envoltorios de `integraciones/` y las pruebas se escribieron para Waifu Baker en las sesiones de diseño con Claude. No copian código de terceros ni usan librerías. Las condiciones de uso las define el proyecto (Koopa y Bruno).

## Fuentes

No se incluye ningún archivo de fuente: se cargan desde Google Fonts.

| Fuente | Dónde se usa | Autor | Licencia |
|---|---|---|---|
| Dela Gothic One | Títulos del configurador | artakana | SIL Open Font License 1.1 |
| Archivo | Textos, botones y etiquetas del configurador | Omnibus-Type | SIL Open Font License 1.1 |
| Space Grotesk | Solo `ejemplo.html` | Florian Karsten | SIL Open Font License 1.1 |
| "Arial Black" y alternativas del sistema | Sello de texto de la carta (`carta-capas.js`) | La del sistema operativo | No se distribuye; depende del dispositivo |

La licencia OFL permite usarlas, incrustarlas y servirlas desde el propio sitio, también en productos comerciales; lo único que no permite es vender la fuente sola. En Next.js conviene cargarlas con `next/font/google`, que las sirve desde el propio dominio.

El sello de texto usa la fuente del sistema, así que se ve un poco distinto en cada dispositivo. La spec 016 decidió usar **Archivo Black** (también OFL) en la web y en la imagen plana para que sean idénticas. Para eso hay que cambiar la familia en la regla `.cc-sello-texto b` de `carta-capas.js` y cargar Archivo Black en el sitio.

## Marcos, sellos, efectos e iconos

- **Marcos:** gradientes CSS dentro de `carta-capas.js`. No hay imágenes.
- **Sellos de texto:** gradientes y contornos CSS.
- **Holo, reflejo, destello y brillo por capa:** gradientes CSS.
- **Formas de partículas:** estrella, corazón y pétalo son SVG escritos a mano dentro de `carta-capas.js`; las demás son CSS.
- **Iconos del configurador:** el ojo y el ojo tachado son SVG escritos a mano dentro de `creador-cartas.html`; las flechas y la ×, caracteres de texto.

Todo es original del proyecto.

## Arte de ejemplo (Yuki)

`src/cartas/yuki/`:

| Archivo | Tamaño | Qué es |
|---|---|---|
| `yuki_1_fondo.webp` | 700 × 991 | Fondo |
| `yuki_3_personaje.webp` | 700 × 991 | Personaje, con transparencia |
| `yuki_4_particulas1.webp` | 700 × 991 | Textura de brillos para modo `overlay` |
| `yuki_5_insignia.webp` | 700 × 991 | Insignia de policía al frente, con transparencia |
| `yuki_ssr.webp` | 210 × 147 | Sello "SSR" |
| `yuki_mini.webp` | 350 × 496 | Miniatura plana |

Bruno aportó las capas originales, que se optimizaron a WebP en las sesiones. La web del juego indica que sus ilustraciones están generadas con IA. Antes de publicar estas imágenes, confirma con Bruno su origen y derechos. Son arte de prueba: personaje adulto, uniformado y sin desnudo.

No hay plantillas, marcos ni iconos descargados de bancos de recursos.
