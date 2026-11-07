# Formato de datos: el registro del sobre

Un sobre se guarda como **un objeto JSON**: el *registro*. Es lo que muestra y copia el creador en "Registro para el juego", y lo que recibe `SobreCapas.montar(el, registro)`. Las capas usan exactamente el mismo formato que las capas de una carta de `carta-capas.js`.

## Ejemplo real

Exportado por `creador-sobres.html` con el ejemplo FA01 (es `src/sobres/fa01.json`; una prueba comprueba que el creador produce exactamente esto):

```json
{
  "id": "fa01",
  "nombre": "FAN ART · VOL. 1",
  "codigo": "FA01",
  "cartas": 5,
  "vista": "3d",
  "apertura": "rasgar",
  "capas": [
    { "src": "sobres/fa01/sobre_fa01_fondo.webp", "profundidad": 0.25, "margen": 3 },
    { "particulas": "destellos-arcoiris", "cantidad": 18, "tamano": 0.9, "semilla": 41, "profundidad": 0.6, "margen": 4 },
    { "src": "sobres/fa01/sobre_fa01_personaje.webp", "profundidad": 1, "margen": 2 },
    { "src": "sobres/fa01/sobre_fa01_efecto.webp", "profundidad": 1.3, "margen": 3, "mezcla": "overlay" }
  ],
  "sellos": { "arriba": "#FF3EA5", "abajo": "#C6F432" }
}
```

Más ejemplos en `docs/ejemplos/`:

| Archivo | Qué muestra |
|---|---|
| `fa01-3d-rasgar.json` | El de arriba: 3D, rasgar, sellos de la marca. |
| `fa01-plano-sticker.json` | El mismo arte en versión plana y con apertura de sticker. |
| `fa01-especial.json` | Ondas que brillan en el fondo, destello en el personaje, sellos turquesa y lima con patrón "líquido", insignia, holo, foil al 80 % y plástico al 120 %. |

El creador **omite los campos que tienen su valor por defecto**: `logo` (por defecto el texto WAIFU BAKER), `foil` y `foilIntensidad` (activo al 0.6), `holo` (apagado), `insignia` (ninguna), `plastico` (1) y el patrón de los sellos (sin patrón). Al leer un registro, falte lo que falte, vale el valor por defecto.

## Campos

| Campo | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `id` | texto | — | Identificador del sobre. El creador lo saca del código: "FA01" → `fa01`. El componente no lo usa. |
| `nombre` | texto | `"FAN ART · VOL. 1"` | Texto grande de la banda del set. Si tiene más de 17 letras, el texto se achica en proporción para caber. Vacío y sin código: no hay banda. |
| `codigo` | texto | `"FA01"` | Código del set, en la etiqueta lima de la banda. |
| `cartas` | número | 5 | Cartas por sobre. Solo se muestra en la banda ("5 cartas"; "1 carta" en singular). Cuántas cartas salen de verdad lo decide el juego. |
| `vista` | `"3d"` \| `"plano"` | `"3d"` | **3D:** plástico con brillos, arrugas y silueta de almohada, sellos de aluminio. **Plano:** sobre recortado con 16 dientes arriba y abajo, sombra rosa plana, sin plástico. |
| `apertura` | `"rasgar"` \| `"sticker"` | `"rasgar"` | **Rasgar:** se desliza por la línea punteada (y = 230) y la tira de arriba sale volando. **Sticker:** la tira de arriba se despega doblándose hacia la derecha. |
| `capas` | arreglo | `[]` | El arte, **de atrás hacia adelante**. Ver "Capas". |
| `sellos` | objeto | ver abajo | Colores y patrón holo de los sellos de arriba y abajo. |
| `logo` | `true` \| `{ "src": url }` \| `false` | `true` | `true`: logo de texto "WAIFU / BAKER" con degradado lima, blanco y turquesa. `{ src }`: una imagen (PNG con transparencia; cabe en 880 × 220 px del lienzo). `false`: sin logo. |
| `insignia` | `{ "texto", "color"? }` \| `null` | `null` | Etiqueta inclinada 9° bajo el logo, a la derecha (p. ej. "Edición especial"). `color` es el fondo; por defecto lima `#C6F432`. |
| `holo` | booleano | `false` | Holo de carta (el mismo arcoíris de `carta-capas.js`) encima de todo el sobre. |
| `holoIntensidad` | 0 a 1 | 0.4 | Intensidad del holo. |
| `foil` | booleano | `true` | Brillo metálico de colores en las franjas de arriba y abajo. |
| `foilIntensidad` | 0 a 1 | 0.6 | Intensidad del foil. Se pinta al 70 % de este valor. |
| `plastico` | 0 a 1.5 | 1 | Multiplica la opacidad de los brillos, las sombras y el lustre del plástico. Solo en 3D. |

### `sellos`

| Campo | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `arriba` | color CSS | `#FF3EA5` (rosa) | Color del sello de arriba. Las luces y sombras del aluminio se calculan solas con `color-mix()`. |
| `abajo` | color CSS | `#C6F432` (lima) | Color del sello de abajo. |
| `patron` | URL \| `null` | `null` | Imagen con transparencia. Dentro de lo opaco va un arcoíris que se mueve al revés que el metal, igual que el marco PX de las cartas. Incluidos: `marcos/patrones/` liquido, remolinos, ondas, hielo, estrellas, panal, diagonales, puntos, aurora y estelas. |
| `patronTamano` | % | 40 | Tamaño del patrón en % del ancho del sobre. Se repite. |

### Capas

Mismo formato que las capas de una carta (`carta-capas.d.ts`, tipos `CapaImagen` y `CapaParticulas`). Aquí solo un resumen:

**Capa de imagen**

| Campo | Qué es |
|---|---|
| `src` | URL de la imagen. El lienzo del sobre es de **1000 × 1750 px** y la imagen se ajusta con `object-fit: cover`. |
| `profundidad` | Cuánto se desplaza al inclinar el sobre (0 a 2.5). El desplazamiento es `profundidad × 4 %` del ancho del sobre por unidad de inclinación. |
| `margen` | % extra en cada lado para que no se vean los bordes al moverse (0 a 15). Agranda un poco la imagen. |
| `mezcla` | Modo de mezcla CSS: `multiply`, `screen`, `overlay`, `soft-light`, `hard-light`, `color-dodge`, `color-burn`, `lighten`, `darken`, `difference`, `exclusion`. Sin campo = normal. |
| `opacidad` | 0 a 1. |
| `brillo` | `{ "tipo", "intensidad" }`: efecto pintado **solo donde la capa tiene dibujo**. Tipos: `holo`, `destello`, `oro`, `plata`, `ondas`. Con `ondas`, además `patron` (URL; `null` = arcos CSS; sin campo = `CartaCapas.texturas.ondas`) y `patronTamano` (% del ancho, 100 por defecto). |

**Capa de partículas**

| Campo | Qué es |
|---|---|
| `particulas` | `destellos-dorados`, `destellos-arcoiris`, `confeti`, `burbujas`, `bokeh`, `corazones`, `nieve`, `chispas`, `petalos`. |
| `cantidad`, `tamano`, `velocidad` | Cantidad (0 a 200), multiplicador de tamaño y de velocidad. |
| `color` | Un solo color para todas (opcional). |
| `semilla` | Fija la distribución: la misma semilla da siempre las mismas partículas. |
| `profundidad`, `margen`, `mezcla`, `opacidad` | Igual que en las imágenes. |

## Zonas del lienzo (1000 × 1750 px)

También están en `SobreCapas.zonas` y se ven con "Ver guías" (captura 03).

| Zona | Píxeles | Qué hay |
|---|---|---|
| Sello de arriba | y 0 – 150 (3D) · 0 – 98 (plano) | El sello de aluminio cubre el arte. Pinta hasta el borde, sin nada importante. |
| Línea de rasgado | y = 230 | En rasgar, lo de arriba sale volando al abrir. En sticker, la tira que se despega llega hasta aquí. Ninguna cara ni texto debe cruzarla. |
| Logo | y 260 – 480, x 60 – 940 | Logo del sobre. |
| Insignia | junto al logo, a la derecha, y ≈ 490 | Solo si hay insignia. |
| Banda del set | y 1450 – 1650 | Banda oscura inclinada −5° con el nombre, el código y el número de cartas. |
| Sello de abajo | y 1625 – 1750 (3D) · 1652 – 1750 (plano) | Igual que el de arriba. |
| Márgenes | 80 px a cada lado | En 3D el plástico se angosta en medio: lo que quede ahí puede recortarse. |

Además, el componente agranda cada capa según su `margen` y la desplaza al inclinar: no pongas nada importante pegado a las orillas.

## De registro a sobre en pantalla

`SobreCapas.montar(el, registro)` arma esta pila, de atrás hacia adelante, dentro de un contenedor con `container-type: inline-size` y proporción 1000:1750 (todas las medidas en `cqw` escalan con el ancho):

1. Fondo morado `#3B2FC9`, por si el arte tiene huecos.
2. Las capas del registro, cada una con `CartaCapas.motor.capaHTML()` (el mismo HTML que en una carta) y desplazada por la inclinación según su `profundidad`.
3. Holo de carta, si `holo`.
4. Foil (si `foil`) y una textura metálica de rayas finas.
5. Sellos de arriba y abajo, con su patrón holo si hay.
6. Logo, insignia y banda del set, cada uno con su propio parallax.
7. Volumen (solo plano), reflejo que sigue al puntero y, en 3D, sombra del plástico, lustre que corre y brillo del plástico.

Esa pila se dibuja **dos veces**: una en el cuerpo (de la línea de corte hacia abajo) y otra en la tira (de la línea hacia arriba). Así la tira puede salir volando o despegarse con el mismo arte. En 3D, las dos partes se recortan con la silueta del plástico; en plano, con un polígono de 16 dientes. Los detalles de cada efecto están en `EFECTOS-Y-ANIMACIONES.md`.

## De registro a imagen (miniatura)

El sobre en pantalla es HTML animado, no una imagen. Para la tienda y los menús, el creador genera una **miniatura plana del sobre cerrado** con `miniatura()` (canvas 2D, PNG de **500 × 875**, transparente fuera de la silueta; captura 17). La receta, para repetirla en el servidor con `sharp` si se prefiere:

1. Lienzo de 500 × 875 relleno de `#3B2FC9`.
2. Cada capa de imagen, en orden: área = el lienzo agrandado `margen` % por lado, imagen ajustada con *cover* y centrada, con su `opacidad` y su `mezcla` (canvas acepta los mismos nombres que CSS).
3. Sellos: rectángulo arriba (8.6 % del alto en 3D, 5.6 % en plano) y abajo (7.2 % / 5.6 %).
   - Degradado horizontal: color oscurecido 40 % → color → blanco al 52 % → color aclarado 50 % → oscurecido 40 %.
   - Encima, un degradado vertical de luz: blanco 15 % → blanco 45 % al 40 % → negro 40 %.
4. Logo:
   - Texto "WAIFU" (15.5 % del ancho) y "BAKER" (12 %) en Dela Gothic One, centrados en y = 20 % y y = 26.2 %.
   - Cada palabra lleva sombra rosa desplazada 2 %, contorno tinta de 0.9 % y relleno degradado lima → blanco → turquesa → lima.
   - O la imagen del logo, ajustada a 88 % × 12.6 % y centrada en su zona.
5. Insignia, si hay: rectángulo rotado 9° en (78 %, 30.5 %), del color de la insignia, con borde blanco, sombra rosa y el texto en mayúsculas en Archivo 900 itálica.
6. Banda del set:
   - Rectángulo tinta rotado −5°, centrado en y = 88.6 %, de 112 % del ancho y 10 % del alto, con filetes lima arriba y abajo.
   - Nombre en Dela Gothic One, blanco con sombra rosa.
   - Debajo, "código + cartas" en Archivo 900 itálica.
7. En 3D: `plastico-sombra.webp` con opacidad 0.9 × `plastico` y `plastico-brillo.webp` con 0.92 × `plastico`, a todo el lienzo.
8. Línea de rasgado punteada blanca en y = 230/1750.
9. Recorte final (`destination-in`): en 3D, `plastico-silueta.webp`; en plano, el polígono de 16 dientes de 60/1750 de alto.

La miniatura **no lleva**: partículas, brillo por capa, holo, foil, patrón de los sellos ni el lustre que se mueve, porque dependen del movimiento.

## Estado del creador

El creador guarda su estado en `localStorage` (`wb-creador-sobre-v1`): los datos del sobre, las capas con su archivo y sus ajustes, y las opciones de la vista previa (`vista`, `apertura`, `inclinacion`, `plastico`, `guias`, `reposo`, `sonido`, `escena`). Las imágenes no se guardan: son URL `blob:` que desaparecen al recargar. `inclinacion`, `reposo`, `sonido`, `guias` y `escena` son solo de la vista previa y no van al registro.
