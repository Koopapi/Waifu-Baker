# Formato de datos de una carta

Una carta es un objeto JSON: lo que exporta el configurador ("Configuración para el sitio") y lo que recibe `CartaCapas.montar(el, config)`. Los tipos exactos están en `src/carta-capas.d.ts`.

## Ejemplo real

Salida del configurador para Yuki con rareza EX, sello de texto y brillo holográfico solo en la capa del personaje (`ejemplos/carta-ex.json`):

```json
{
  "id": "yuki",
  "etiqueta": "yuki",
  "marco": "ex",
  "holo": true,
  "holoIntensidad": 0.4,
  "proporcion": 0.706,
  "capas": [
    { "src": "cartas/yuki/yuki_1_fondo.webp", "profundidad": 0.2, "margen": 5 },
    { "particulas": "destellos-arcoiris", "cantidad": 65, "semilla": 7, "profundidad": 0.55, "margen": 4 },
    {
      "src": "cartas/yuki/yuki_3_personaje.webp",
      "brillo": { "tipo": "holo", "intensidad": 0.7 },
      "profundidad": 1
    },
    { "src": "cartas/yuki/yuki_4_particulas1.webp", "profundidad": 1.3, "margen": 6, "mezcla": "overlay" },
    { "src": "cartas/yuki/yuki_5_insignia.webp", "profundidad": 1.6 }
  ],
  "sello": { "texto": "EX", "estilo": "arcoiris", "esquina": "sup-izq", "tamano": 14 }
}
```

Otros ejemplos reales en `ejemplos/`:

| Archivo | Qué muestra |
|---|---|
| `yuki-ssr.json` | La carta de ejemplo tal como arranca: SSR, destellos dorados y sello de imagen. |
| `carta-ex.json` | EX con sello de texto y brillo holográfico en el personaje (el de arriba). |
| `yuki-ex-con-sello-de-imagen.json` | EX conservando el sello de imagen (el estilo de rareza no reemplaza un sello de imagen). |
| `marco-personalizado-sello-texto.json` | Marco personalizado (gradiente propio y `aura`), sello de texto "NEW" en la esquina inferior derecha, holo al 60 %. |

`src/cartas/yuki.json` es el formato de la v2/v3. Sigue siendo válido: los campos nuevos son opcionales.

## Campos de la carta

| Campo | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `id` | texto | — | Identificador que pone el configurador (lo usa para la carpeta). El componente lo ignora. |
| `etiqueta` | texto | `"Carta"` | Nombre accesible (`aria-label`). |
| `marco` | texto | `"ssr"` | Escalón (`ex`, `ssr`, `sr`, `r`, `n`), `"ninguno"` o un gradiente CSS completo (marco personalizado). |
| `aura` | color CSS | el del marco | Resplandor alrededor de la carta. El configurador solo lo exporta con marco personalizado. |
| `borde` | número | `2.2` | Grosor del marco en % del ancho (0.8 a 5). El configurador lo omite si vale 2.2. |
| `holo` | booleano | `false` | Holo de toda la carta. |
| `holoIntensidad` | 0 a 1 | `0.4` | **v4.** Fuerza del holo. Se exporta solo con `holo: true`. |
| `proporcion` | número | `0.7064` | Ancho / alto de la carta. |
| `capas` | lista | `[]` | De atrás hacia adelante. Las capas ocultas en el configurador **no** se exportan. |
| `sello` | objeto o `null` | `null` | Sello de imagen o de texto. |

Opciones de presentación que el configurador no exporta, porque las decide la pantalla del juego: `profundidad` (parallax en px, 14), `inclinacion` (grados, 14), `reposo` (balanceo solo, `true`), `zona`, `aparecer` (`true`) y `estatica` (`false`).

## Capas

**Capa de imagen**

| Campo | Por defecto | Qué es |
|---|---|---|
| `src` | — | Ruta de la imagen. El configurador antepone la "carpeta en el sitio". |
| `profundidad` | 1 | Cuánto se mueve con la inclinación: 0 fija, 1 normal, hasta 2.5. |
| `margen` | 0 | % extra en cada lado para que no se vean los bordes al moverse (0 a 15). |
| `mezcla` | `normal` | Modo de mezcla CSS (ver la lista abajo). |
| `opacidad` | 1 | 0 a 1. |
| `visible` | `true` | `false` = no se dibuja. |
| `brillo` | — | **v4.** `{ "tipo": "holo" \| "destello" \| "oro" \| "plata", "intensidad": 0..1 }`. El efecto se pinta solo donde la capa tiene dibujo. |

**Capa de partículas**

| Campo | Por defecto | Qué es |
|---|---|---|
| `particulas` | — | Tipo (ver tabla). |
| `cantidad` | la del tipo | 0 a 200. En modo `estatica` se multiplica por 0.4. |
| `tamano` | 1 | Multiplicador (0.3 a 2.5). |
| `velocidad` | 1 | Multiplicador (0.3 a 3). |
| `color` | — | Un solo color para todas (hex). |
| `semilla` | aleatoria | Misma semilla = mismas posiciones y tiempos. |
| `profundidad`, `margen`, `mezcla`, `opacidad`, `visible` | | Igual que en las capas de imagen. |

## Rarezas

| Escalón | Marco | Aura | Partículas del estilo | Sello del estilo | Holo |
|---|---|---|---|---|---|
| `ex` (antes `ur`) | Arcoíris | `rgba(200,160,255,.28)` | Destellos de colores, 65 | Texto "EX", arcoíris, 14 | Sí |
| `ssr` | Oro | `rgba(240,190,90,.24)` | Destellos dorados, 55 | Texto "SSR", oro, 14 | No |
| `sr` | Morado | `rgba(170,120,255,.22)` | Destellos de colores, 36 | Texto "SR", morado, 12 | No |
| `r` | Azul | `rgba(110,160,255,.2)` | Destellos de colores, 16, tamaño 0.8, opacidad 0.75 | — | No |
| `n` | Plata | `rgba(220,225,235,.12)` | — | — | No |

Alias aceptados: `ur` = `ex`, `epica` = `sr`, `rara` = `r`, `comun` = `n`.

En el proyecto, `domain/catalog/rarity-tier.ts` asigna las rarezas del juego a escalones: común y poco común → `n`, rara → `r`, épica → `sr`, legendaria → `ssr`, secreta → `ex`. En la interfaz la rareza más alta se llama **EX**.

## Marcos

Son gradientes CSS, sin imágenes. Se mueven con la inclinación (`background-size: 240%` y posición por `--px`/`--py`).

| Marco | Gradiente (135°) |
|---|---|
| `ex` / `ur` | `#ff7aa8 0%, #ffd36e 17%, #8af0c4 33%, #ffffff 48%, #6ec8ff 62%, #c79bff 80%, #ff7aa8 100%` |
| `ssr` | `#6e4a12 0%, #f7dc8a 18%, #b9862d 34%, #fff3c4 48%, #a0701f 62%, #f2cf6e 80%, #6e4a12 100%` |
| `sr` | `#4b2a7a 0%, #d4b8ff 20%, #8a5cd6 38%, #f1e6ff 50%, #7344c2 64%, #c9a6ff 82%, #4b2a7a 100%` |
| `r` | `#1f3f7a 0%, #a9ccff 20%, #4a7fd6 38%, #e6f0ff 50%, #3c6cc2 64%, #9cc2ff 82%, #1f3f7a 100%` |
| `n` | `#5a6070 0%, #e4e8ef 22%, #9aa1b0 40%, #ffffff 50%, #8a91a0 64%, #d6dbe4 82%, #5a6070 100%` |
| Personalizado | Se arma con dos colores: oscuro (el color al 45 %), brillo, color, `#ffffff`, color, brillo y oscuro, en 0 / 18 / 34 / 48 / 62 / 80 / 100 %. `aura` = color al 25 %. |
| `ninguno` | Sin marco: el arte llena la carta. |

## Sellos

**Imagen:** `{ "src", "esquina", "tamano", "recorte", "relacion" }`. `tamano` es el ancho en % de la carta (10 a 60, 36 por defecto). `recorte: [x, y, ancho, alto]` (fracciones de 0 a 1) y `relacion` (ancho/alto) muestran solo una parte de la imagen; el configurador los calcula solo cuando el sello trae mucho espacio transparente.

**Texto:** `{ "texto", "estilo", "esquina", "tamano" }`. Hasta 6 letras. `tamano` es el tamaño de letra en % del ancho (8 a 26, 14 por defecto).

| Estilo | Relleno (vertical) | Contorno |
|---|---|---|
| `oro` | `#fffbe0 0%, #f7d774 38%, #c3861c 58%, #fbe39a 100%` | `#2c1a04` |
| `plata` | `#ffffff 0%, #dfe5ee 40%, #8d96a8 60%, #eef2f7 100%` | `#1b2030` |
| `arcoiris` | `#ffb3d1 0%, #ffe08a 30%, #9ff2cf 55%, #8fd2ff 75%, #d3b0ff 100%` | `#26113d` |
| `rosa` | `#fff0f6 0%, #ff9ec2 40%, #d6336c 62%, #ffc2d8 100%` | `#3a0a1e` |
| `azul` | `#eef6ff 0%, #9cc8ff 40%, #2f6fd6 62%, #bcdcff 100%` | `#0b1b3a` |
| `morado` | `#f6eeff 0%, #c9a6ff 40%, #7344c2 62%, #e2d0ff 100%` | `#1e0b3a` |

**Esquinas:** `sup-izq` (por defecto), `sup-der`, `inf-izq`, `inf-der`. El sello de imagen queda 9 % fuera del lado y 5 % fuera de arriba (4 % abajo). El de texto, 6 % fuera del lado.

## Efectos

| Tipo | Valores |
|---|---|
| Partículas (`particulas`) | `destellos-dorados` (60), `destellos-arcoiris` (60), `confeti` (45), `burbujas` (26), `bokeh` (18), `corazones` (22), `nieve` (60), `chispas` (40), `petalos` (28). Entre paréntesis, la cantidad por defecto. |
| Brillo por capa (`brillo.tipo`) | `holo`, `destello`, `oro`, `plata`. |
| Modos de mezcla (`mezcla`) | `normal`, `multiply`, `screen`, `overlay`, `soft-light`, `hard-light`, `color-dodge`, `color-burn`, `lighten`, `darken`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`. |
| Holo de carta | `holo` + `holoIntensidad`. |
| Siempre activos | Reflejo que sigue la inclinación, sombra interior, aura, balanceo del sello. |
| Al revelar (`entrar()`) | Rebote del sello y destello que cruza la carta. |

Cómo se ve y se anima cada uno: `EFECTOS-Y-ANIMACIONES.md`.

## Plantillas

No hay plantillas de diseño aparte. Lo que funciona como plantilla:

- **Estilo por rareza** (`CartaCapas.presets`): el botón "Aplicar estilo de la rareza" y `CartaCapas.desdeRareza(rareza, imagen)`. Con una sola imagen, esta va con profundidad 0.35 y margen 4, y las partículas van al frente en modo `screen` (profundidad 1.4, margen 6). Con varias capas, las partículas van entre el fondo y el personaje (profundidad 0.55, margen 4).
- **Proporciones:** automática (la de la primera imagen), `0.7064` (700 × 991), `0.7159` (carta TCG 63 × 88 mm), `0.7143` (5:7), `0.6667` (2:3) y `0.75` (3:4).
- **Carta de ejemplo:** Yuki (`src/cartas/`).

## De JSON a imagen

### En pantalla (lo que hace `carta-capas.js`)

La carta es HTML y CSS. No se genera ninguna imagen. Estructura, de atrás hacia adelante:

```
.cc                        contenedor (container-type: inline-size; aspect-ratio = proporcion)
└─ .cc-card                se inclina en 3D (rotateY / rotateX); expone --px, --py, --hyp
   ├─ .cc-in               base #1a120e, esquinas 5.4 % del ancho, aura y sombra
   │  ├─ .cc-art           recorte del arte, metido "borde" % hacia dentro
   │  │  ├─ .cc-capa ×N    una por capa visible: inset -margen %, mix-blend-mode, opacity
   │  │  │  ├─ img         object-fit: cover
   │  │  │  └─ .cc-brillo  (v4) degradado del efecto con la propia imagen como mask-image
   │  │  │     (las capas de partículas son elementos <i> con animaciones CSS)
   │  │  ├─ .cc-holo       holo de carta (z 6)
   │  │  ├─ .cc-glare      reflejo (z 7)
   │  │  ├─ .cc-sweep      destello al revelar (z 7)
   │  │  └─ ::after        sombra interior (z 8)
   │  └─ .cc-frame         marco: anillo con el gradiente (z 4)
   └─ .cc-sello            fuera del recorte, con translateZ(60px)
```

En cada cuadro, con la posición del puntero normalizada a `x, y ∈ [-1, 1]` y suavizada (`x += (objetivo − x) × 0.1`):

- La carta rota `rotateY(x × inclinacion)` y `rotateX(−y × inclinacion)`.
- Cada capa se desplaza `translate3d(−x × p × profundidad px, −y × p × profundidad px, 0)`, con `p` = profundidad de la capa.
- El sello se desplaza el doble de la profundidad y queda delante (`translateZ(60px)`).
- Variables CSS: `--px = (x + 1) / 2`, `--py = (y + 1) / 2` y `--hyp = min(1, √(x² + y²))`. Mueven el marco, el holo, el reflejo y el brillo por capa.

### Imagen plana (miniaturas, zonas públicas, redes)

Este paquete **no** incluye un generador de imagen plana. La spec 016 la genera en el servidor con `sharp`. Para que coincida con lo que se ve en pantalla, dibuja la carta **en reposo** (`x = y = 0`, `--px = --py = 0.5`, `--hyp = 0`):

1. **Lienzo.** Ancho `W`, alto `W / proporcion`. Si se quiere el sello completo, agrega margen alrededor: el sello sale hasta 9 % del ancho y 5 % del alto fuera de la carta.
2. **Base.** Rectángulo redondeado (radio 5.4 % de `W`) de color `#1a120e`, con el aura del marco como resplandor si hay margen.
3. **Recorte del arte.** Metido `borde × W / 100` hacia dentro, con radio `max(1.5 % W, 5.4 % W − borde)`. Sin marco: toda la carta.
4. **Capas, en orden.** Para cada capa visible, el rectángulo del arte se agranda `margen %` en cada lado (izquierda y derecha sobre el ancho, arriba y abajo sobre el alto), la imagen se ajusta en modo *cover* centrada y se compone con su `mezcla` y su `opacidad`.
5. **Brillo de la capa** (si tiene). Dibuja el degradado del tipo en reposo (ver `EFECTOS-Y-ANIMACIONES.md`), recórtalo con el alfa de la capa (`dest-in`) y mézclalo encima: `colour-dodge` con opacidad `intensidad × 0.55` para holo, `overlay` con opacidad `intensidad` para oro y plata. El destello se mueve; en la imagen plana puedes omitirlo o poner la franja al centro con opacidad `intensidad`.
6. **Partículas** (si las hay). El componente genera cada partícula con un generador pseudoaleatorio Park–Miller: `semilla = semilla × 16807 mod 2147483647`, valor `= (semilla − 1) / 2147483646`. El orden de lectura de los valores es fijo y está en `particulasHTML()`. Con la misma semilla se obtienen las mismas posiciones. El cuadro equivalente a la carta recién montada es el instante 0 de cada animación, con su retraso negativo.
7. **Holo** (si `holo`). Gradiente repetido de 115° (`#ff7aa8, #ffd36e, #8af0c4, #6ec8ff, #c79bff` cada 7 %, repetido cada 35 %), en `color-dodge`, con `brightness(.72) saturate(1.15)` y opacidad `holoIntensidad × 0.5`.
8. **Reflejo.** Degradado radial desde el centro: blanco 45 % → 8 % al 34 % → transparente al 62 %, en `overlay`, con opacidad 0.2.
9. **Sombra interior.** Línea de 1 px negra al 60 % y sombra interior de 6 % del ancho negra al 30 %.
10. **Marco.** Anillo entre el borde exterior y el recorte, relleno con el gradiente de 135° del marco, escalado al 240 % y centrado.
11. **Sello.** Imagen o texto en su esquina. El texto va en cursiva, con peso 900, tamaño `tamano % de W`, contorno de `2 % W` del color de contorno, sombra hacia abajo de `1.2 % W` y relleno con el gradiente del estilo.

El resultado final para zonas públicas lleva además la marca de agua del proyecto. Eso es parte de la spec 016, no de este paquete.
