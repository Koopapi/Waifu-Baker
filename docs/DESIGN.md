# Estilo visual — Waifu Baker TCG

## Marco de carta (aprobado para el piloto, 14 oct 2026)

Diseñado en Pencil: `/Users/koopa/Documents/Waifu Baker/waifubaker.pen`, lámina
«Cartas · Marco por rareza».

**La carta no lleva textos** (decisión del usuario): solo el marco del color de su rareza, el
sello «WB» arriba a la derecha y el número en una pastilla abajo a la derecha. Nombre, rareza y
aviso de IA se muestran en la web, nunca en la imagen.

- Lienzo 750 × 1050 (63 × 88 mm), esquinas de 34 px. Se exporta a 2x: 1500 × 2100.
- Borde metálico de 22 px en degradado de tres tonos por rareza (claro, principal, oscuro),
  filete interior oscuro y un brillo fino.
- Sello «WB» (54 × 54, x 652, y 44) y pastilla de numeración (76 × 34, x 636, y 978), ambos con
  fondo tinta al 85 % y contorno del color de la rareza.
- Tipografía Space Grotesk (SIL OFL, en `apps/web/assets/fonts/`).
- Los colores viven en variables con el tema `rareza` (`rareza-principal`, `rareza-clara`,
  `rareza-oscura`); cada versión es una copia del maestro con su tema. «Sin rareza» usa el gris
  de común.

| Rareza | Principal | Clara | Oscura |
|---|---|---|---|
| Común | `#9AA0A6` | `#E3E6E9` | `#4B5157` |
| Poco común | `#4ADE80` | `#D1FAE5` | `#15803D` |
| Rara | `#60A5FA` | `#DBEAFE` | `#1D4ED8` |
| Épica | `#C084FC` | `#F5D0FE` | `#6B21A8` |
| Legendaria | `#F5C451` | `#FFF4C2` | `#A16207` |
| Secreta | `#FF6AD5` | `#7DD3FC` | `#7C3AED` |

Lo que dibuja el código (`apps/web/src/server/cards/compose.ts`): el número de tres cifras
centrado en la pastilla, Space Grotesk SemiBold 15 px a 750 (30 px a 1500), con espaciado 1,5.

### Cómo actualizar el marco

1. Edita el **maestro** en Pencil y vuelve a copiarlo a las siete versiones (seis rarezas y
   «sin rareza»), cambiando solo el tema.
2. Exporta cada versión a PNG con escala 2 (una por llamada) y guárdalas como
   `apps/web/assets/frames/frame_<rareza>.png` (`common`, `uncommon`, `rare`, `epic`,
   `legendary`, `secret`, `none`).
3. Reinicia el servidor de desarrollo y pulsa «Regenerar imágenes» en cada colección.

Notas de Pencil aprendidas al hacerlo: las variables de tipo texto no se resuelven (ni en
contenido ni en fuente), las imágenes WebP no se pintan en exportaciones y las capturas de nodos
con fondo transparente salen en blanco; para verificar, exportar a PNG.

## Sitio

Pendiente: portada, apertura, colección y álbum. Dirección provisional: fondo oscuro para que el
holo y las partículas destaquen, un acento por rareza, tipografía grande y mucho aire.
