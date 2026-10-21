# Guía de arte para cartas · Waifu Baker

## Proporción y tamaños

La proporción oficial es **1 : √2 (≈ 0.707)**, la misma de una hoja A4. Las cartas actuales de 700 × 991 px ya la tienen.

| Archivo | Tamaño | Uso |
|---|---|---|
| Maestro del ilustrador | **2100 × 2970 px** | Se trabaja ahí con todas las capas. No se sube al sitio |
| Capas para ficha y apertura | **1000 × 1414 px** | Se ve a ~330 px de ancho en pantallas 2× y 3× |
| Miniatura de colección | **400 × 566 px**, una sola imagen plana | Rejillas con muchas cartas |
| Sello (SSR, UR…) | **400 px de ancho** | Flota fuera del marco, más cerca de la cámara |

## Formato y peso

- **WebP.** Calidad 85–90 para personaje e insignias, 75–80 para fondos y texturas.
- Meta: **menos de 700 KB por carta**, sumando todas las capas.
- Las texturas en modo overlay (brillos, polvo) se pueden exportar a la mitad (500 × 707): nadie nota que se estiran.
- La capa del personaje se exporta con el lienzo completo aunque tenga mucho transparente. WebP comprime casi a cero lo vacío y todo queda alineado.

## Capas

- Todas las capas con el **mismo tamaño de lienzo** y alineadas, como si salieran del mismo archivo de Photoshop o Clip Studio.
- PNG con transparencia antes de convertir (el fondo puede ser opaco).
- Nombres en orden, de atrás hacia adelante: `nombre_1_fondo`, `nombre_2_…`, `nombre_3_personaje`…
- Si una capa con modo de mezcla se ve demasiado fuerte, bajar la **opacidad** en la configuración en vez de editar la imagen.
- Las partículas (destellos, confeti, pétalos…) no necesitan arte: las genera el componente.

| Rareza | Capas típicas |
|---|---|
| N | 1 imagen |
| R | Fondo + personaje |
| SR | Fondo + personaje + 1 o 2 capas de efecto |
| SSR | Fondo + partículas + personaje + efectos al frente + sello |

## Zona segura

- El fondo se agranda ~5% para que no se vean bordes al moverse, y el marco tapa otro ~2%. **Nada importante en el 8% exterior** de cada lado: caras, manos, logos o texto del arte.
- La **esquina del sello** (arriba a la izquierda por defecto) debe quedar libre o con arte que no importe tapar.

## Contenido

- Personajes **claramente adultas** en cualquier carta sugerente o con desnudo.
- Si una carta lleva desnudo, preparar también una **capa de censura** para los lugares públicos del sitio.
- Dar crédito a la artista cuando la carta sea encargada.
