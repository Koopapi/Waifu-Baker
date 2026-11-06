# Efectos y animaciones

Todo el sobre lo describe el CSS que inyecta `src/sobre-capas.js` (arreglo `CSS`) y su bucle `cuadro()`. Las medidas en `cqw` son % del ancho del sobre, así que todo escala con su tamaño. Para que el juego se vea **exactamente** igual, hay que usar ese archivo tal cual, no reescribir los efectos. La revelación de cartas está en `src/apertura-sobre.html`.

Las capas de arte usan los efectos de `carta-capas.js` (brillo solo en el dibujo, ondas que brillan, partículas, holo), descritos en el paquete de cartas, `docs/EFECTOS-Y-ANIMACIONES.md`.

## Movimiento del sobre

- **Bucle.** `requestAnimationFrame` mientras el sobre esté montado. Con el sobre abierto no calcula nada, y `destruir()` lo detiene.
- **Entrada.** El puntero sobre la zona se normaliza desde el centro del sobre: `x = (clientX − centro) / (ancho × 0.8)` e `y = (clientY − centro) / (alto × 0.6)`, limitados a [−1, 1]. La zona es por defecto el padre del sobre; en el creador y la apertura, la escena entera. Con ratón basta pasar por encima; con dedo, solo mientras se presiona. Se suaviza en cada cuadro: `x += (objetivo − x) × 0.1`.
- **Inclinación.**
  - Plano: `perspective(333cqw) rotateY(x × 15°) rotateX(−y × 15°)`.
  - 3D: `perspective(281cqw) rotateY(x × 20°) rotateX(−y × 16°)`; se inclina un poco más para que se note el volumen.
  - `inclinacion` (0 a 2) multiplica `x` e `y` antes de girar.
- **Movimiento solo** (`reposo`). Si nadie lo toca: `x = sin(t / 1600 + fase) × 0.35` e `y = sin(t / 2300 + fase + 1) × 0.22`, con `t` en milisegundos. La fase cambia por sobre.
- **Al cortar o abrir,** el objetivo se reduce un 10 % por cuadro hasta quedar derecho.
- **Flotar.** El sobre sube 3 % del ancho y baja en un ciclo de 4.5 s (`ease-in-out`).
- **Variables que mueven los brillos.** `--px = (x + 1) / 2`, `--py = (y + 1) / 2` y `--hyp = min(1, √(x² + y²))`.
- **Parallax.**
  - Capas de arte: `−x × profundidad × 4 %` del ancho (y lo mismo en vertical).
  - Logo: 6 %. Insignia: 7 %. Banda del set: 3.2 %.
- **Sombra del sobre.**
  - Plano: sombra suave hacia abajo (`0 10cqw 8cqw`, negro al 55 %) y sombra rosa plana desplazada 2.6 % (al 85 %), estilo sticker.
  - 3D: sombra más larga (`0 12cqw 9cqw`, negro al 62 %) y un halo rosa difuso (`6cqw`, al 50 %) en lugar de la sombra plana.

## Plástico 3D (`vista: "3d"`)

Sale de 3 imágenes extraídas de un render del sobre vacío en gris (`herramientas/extraer-plastico.py`):

| Capa | Imagen | Cómo se pinta |
|---|---|---|
| Silueta | `plastico-silueta.webp`, 1000 × 1750 | Máscara (`mask-image`, 100 % × 100 %) del cuerpo, de la tira y del interior. Da la forma de almohada: el cuerpo se angosta ~5 % en medio, se pellizca donde empiezan los sellos y los dientes son los del render. |
| Sombra | `plastico-sombra.webp`, negro con alfa | Encima del arte, a todo el sobre, con opacidad `0.9 × plastico`. Pliegues, costados curvos y el bulto junto a los sellos. |
| Lustre | CSS | `screen`, con opacidad `0.55 × plastico`. Se mueve con la inclinación. Ver abajo. |
| Brillo | `plastico-brillo.webp`, blanco con alfa | Encima de todo, con opacidad `0.92 × plastico`. Es 4 % más grande que el sobre y se desplaza `(0.5 − --px) × 1.6 %` y `(0.5 − --py) × 1 %`, al revés de la inclinación, para que los reflejos resbalen sobre el plástico. |

**Lustre:**
- Banda ancha de luz blanca que va de `--px × 64 % + 1 %` a `+ 26 %`, con su pico (42 %) en `+ 10 %`.
- Línea fina en `+ 32.5 %` (26 %).
- Resplandor blanco arriba (18 % entre el 9 % y el 22 % del alto).
- El canto del lado de la luz se ilumina: el izquierdo con `(1 − --px) × 55 %` y el derecho con `--px × 55 %`, en el 2.5 % del borde.

En 3D los dientes los pone la silueta, así que el recorte del cuerpo y de la tira se hace sin dientes (`T = 0`).

## Sobre plano (`vista: "plano"`)

Sin imágenes de plástico:
- Cuerpo y tira recortados con `clip-path: polygon()` de **16 dientes** arriba y abajo, de 60/1750 de alto.
- Volumen: oscurecido al 50 % en los costados (9 % del ancho) y sombras de 45 % justo dentro de cada sello.
- Reflejo `soft-light` radial blanco al 75 % que sigue al puntero.

## Capas fijas del sobre

| Capa | Cómo es |
|---|---|
| Fondo | `#3B2FC9`, por si el arte tiene huecos. |
| Holo (si `holo`) | El `.cc-holo` de las cartas (arcoíris 115° en `color-dodge`). Opacidad `holoIntensidad × (0.5 + hyp × 1.05)`. |
| Foil (si `foil`) | `color-dodge`, opacidad `foilIntensidad × 0.7`. Degradado de 115° rosa, amarillo, turquesa y lima entre el 18 % y el 78 %, a 300 % de tamaño y en `(--px, --py)`. La máscara lo deja entero en el 16 % de arriba y de abajo y al 22 % en medio. |
| Textura metálica | `overlay` al 18 %: rayas blancas de 1 px cada 4 px a −35°. |
| Sellos (plano) | Alto 5.6 %, `hard-light` al 85 %. Estrías verticales (blanco al 55 % de 1.5 px cada 4 px). Arriba: degradado del color a ese color con 40 % de blanco. Abajo: del color a una mezcla con turquesa. |
| Sellos (3D) | Alto 8.6 % arriba y 7.2 % abajo, opacos. Metal horizontal: color oscurecido → color en `--px × 60 % + 8 %` → blanco en `+ 18 %` → color aclarado en `+ 28 %` → oscurecido. Encima, luz vertical: blanco 15 % → 55 % → negro 20 % → 50 % (invertida en el de abajo). Las estrías las pone el plástico. Los tonos se calculan con `color-mix()`. |
| Patrón de los sellos | Arcoíris de 65° (`#ff3d7a`, `#ffae2e`, `#fff36a`, `#4dff9a`, `#38e3ff`, `#6b7bff`, `#d84bff`, repetido cada 35 %) en `screen` al 90 %. Tamaño 200 % en `(65 % − --px × 30 %, 65 % − --py × 30 %)`: se mueve al revés que el metal. La máscara es el patrón, repetido a `patronTamano` % del ancho. |
| Logo | Dela Gothic One: "WAIFU" a 15.5 % del ancho y "BAKER" a 12 % e inclinado −8°. Relleno degradado lima → blanco → turquesa → lima que corre con `--px`, contorno tinta de 0.45 %, sombras tinta (1.1 %) y rosa (1 %). |
| Insignia | Archivo 900 itálica al 4.4 %, mayúsculas, fondo del color elegido, borde blanco de 0.8 %, sombra rosa de 1.4 %, rotada 9°. |
| Banda del set | Franja tinta de 112 % de ancho rotada −5°, con filetes lima de 1 %. Nombre en Dela Gothic One al 7.6 % (× 17 / letras si pasa de 17), blanco con sombra rosa. Código en una etiqueta lima inclinada −12° y "N cartas" en Archivo 900 itálica al 3.9 %. |
| Reflejo | 3D: elipse blanca al 85 % de 45 % × 30 % en `(--px, --py)`. Plano: el de arriba. |

## Abrir rasgando (`apertura: "rasgar"`)

1. **Línea.** Discontinua blanca de `max(2px, 0.9 %)` en y = 230/1750, con 3 % de margen a los lados. Un círculo blanco con borde tinta recorre la línea (2.2 s, en bucle) para enseñar el gesto.
2. **Cortar.** Al presionar a menos de 9 % del alto de la línea empieza el corte:
   - Se guarda el tramo más a la izquierda y más a la derecha que ha recorrido el dedo. El avance es `(derecha − izquierda) / 0.78`.
   - Ese tramo se ilumina con una barra lima con resplandor.
   - La tira se levanta con el avance: `translateY(−avance × 1 %)` y `rotate(−avance × 4°)`, con eje en el extremo derecho de la línea.
   - Cada vez que el tramo crece suena un "grano" de papel: ruido filtrado *bandpass* de 1 800 a 4 200 Hz, de 50 ms, como mucho cada 38 ms.
3. **Soltar antes de tiempo.** La línea se apaga y la tira baja. Si fue un toque corto (menos de 260 ms) sin cortar, se llama a `alPista`.
4. **Abrir** (avance ≥ 1, Enter, espacio o `abrir()`):
   - La tira sale volando en 0.8 s (`cubic-bezier(.2,.7,.25,1)`) hasta `translate(70 %, −170 %) rotate(32°)` y se desvanece en 0.5 s a partir de 0.3 s.
   - Destello sobre la línea: elipse blanca → lima → rosa, que en 0.9 s pasa de `scaleY(0.3)` a 1.4 y a 2.4 mientras aparece y se apaga.
   - Rasgón: ruido *bandpass* de 3 200 a 700 Hz en 0.38 s, más un siseo *highpass* de 0.2 s.
   - Vibración de 45 ms (Android) y llamada a `alAbrir`. A los 900 ms el estado pasa a `abierto`.
5. **Borde roto.** La línea de corte es un polígono de 40 tramos con una variación aleatoria de ±0.45 % del alto. Se vuelve a sortear cada vez que el sobre se dibuja.
6. **`abrir()` sin gesto:** el tramo se ilumina del 6 % al 94 % en 520 ms, con sonido, y luego abre.

## Abrir despegando (`apertura: "sticker"`)

1. **Pliegue.** El sticker es la tira de arriba (de los dientes a la línea).
   - El pliegue es una diagonal que corta el borde de arriba en `f × ancho + c` y la línea en `f × ancho`, con `c = 1.15 × alto de la tira`.
   - Lo que queda a la derecha del pliegue sigue pegado. Lo de la izquierda se refleja sobre el pliegue y muestra el **reverso**: un degradado lila claro que se aclara lejos del pliegue, con rayas finas y sombra.
   - En reposo, `f` deja ver una esquinita doblada arriba a la izquierda.
2. **Despegar.** Al presionar en la tira (hasta 8 % por debajo de la línea), el pliegue avanza 1.25 veces lo que se mueve el dedo, con un "grano" agudo (ruido de 2 600 a 5 800 Hz, 35 ms, cada 26 ms o más).
   - Si se suelta pasado el 55 %, termina de despegarse en 220 ms.
   - Si se suelta antes, regresa con un pequeño rebote en 320 ms y suena un "pegado" (*lowpass* de 900 a 300 Hz, 90 ms).
3. **Debajo** del sticker se ve el interior oscuro del sobre (tinta → índigo → lima), que se desvanece al abrir. El borde del sticker tiene un filete blanco y un brillo que corre con `--px`.
4. **Abrir:** el reverso sale volando a `translate(22 %, −150 %) rotate(30°)` en 0.8 s y se desvanece. El destello, la vibración y `alAbrir` son los mismos que en rasgar. El rasgón es más agudo: de 5 200 a 1 600 Hz en 0.28 s.
5. **Pista:** un toque corto despega un poco la esquina y la vuelve a pegar (180 ms y 260 ms).
6. **`abrir()` sin gesto:** despega en 900 ms con sonido.

## Ocultar

`ocultar()` baja el sobre `translateY(85 %) rotate(4°)` en 0.6 s (`cubic-bezier(.5,0,.8,.4)`) y lo desvanece en 0.5 s a partir de 0.15 s. La promesa se resuelve a los 650 ms. `reiniciar()` lo vuelve a mostrar cerrado.

## Revelación de cartas (`apertura-sobre.html`)

| Momento | Qué pasa |
|---|---|
| Antes de abrir | Las cartas ya están montadas detrás del sobre, pero el mazo tiene `visibility: hidden`: con el sobre inclinado no se asoman por los lados. |
| `alAbrir` | El mazo se hace visible. |
| 0.38 s | El mazo sube `translateY(−52 %)` en 0.75 s (`cubic-bezier(.2,.8,.3,1)`), con un zumbido (ruido *highpass* de 500 a 3 200 Hz, 0.24 s). |
| 1.25 s | `sobre.ocultar()`; el mazo vuelve al centro con `scale(1.08)`. |
| 1.9 s | Primera carta: `entrar()` de `carta-capas.js` (el sello entra con rebote y pasa el destello). |

- **Cartas.** El mazo mide 84 % del ancho del sobre, con proporción 700:991, a 8 % del borde y a 28 % de arriba. Todas las cartas están **derechas**, y **solo la de arriba es visible**: las de atrás tienen `visibility: hidden` hasta su turno.
- **Pasar.**
  - Arrastrar: la carta sigue al dedo y gira `dx × 0.05°`.
  - Si el arrastre pasa de 70 px, sale hacia ese lado (`translateX(±150 %) rotate(±20°)`, 0.4 s) con un zumbido. Si no, regresa.
  - Un toque (menos de 6 px y 300 ms) o "Siguiente carta" la saca a la derecha.
- **Presagio.** Si la siguiente carta es SSR, EX, UR o PX, detrás del mazo late un halo dorado y rosa (1.1 s, escala 1.12).
- **Carta especial** (SSR, EX, UR o PX):
  - Rayos dorados cónicos que crecen de 0.4 a 1 y giran 40° en 2.6 s.
  - Una estrella lima de 16 puntas con la rareza, que salta con rebote (0.45 s) y queda inclinada −12°.
  - Una campanita: 4 notas triangulares (880, 1 320, 1 760 y 2 640 Hz), separadas 70 ms, que se apagan en 1 s.
  - Vibración `[30, 50, 80]`.
- **Indicación.** "Yuki · N · 1 de 5"; en las especiales, "¡Yuki · SSR! · 5 de 5". Debajo hay un punto por carta: lima las vistas, rosa la actual.
- **Resumen.** A los 350 ms de la última, las cartas aparecen en rejilla en modo `estatica` (sin bucle, 40 % de partículas), cada una con una etiqueta del color de su rareza. "Abrir otro sobre" reinicia todo.

En el creador, "Probar apertura" usa la misma secuencia de tiempos, con las cartas de muestra y sin el efecto especial ni el arrastre: sirve para ver el sobre, no la revelación.

## Accesibilidad y movimiento reducido

- El sobre tiene foco (`tabindex="0"`) y `role="button"`. Su etiqueta dice cómo abrirlo, por ejemplo: "Sobre FAN ART · VOL. 1 FA01. Desliza por la línea punteada o pulsa Enter para abrirlo." Enter o espacio lo abren.
- Si el sistema pide `prefers-reduced-motion: reduce`:
  - No flota, no se balancea solo y no corre la guía del dedo.
  - Al abrir, la tira o el sticker solo se desvanecen (0.2 s), sin volar.
  - `abrir()` abre al instante y la pista no despega la esquina.
  - `ocultar()` tarda 150 ms.
  - En la apertura, los tiempos bajan a 0, 0.15 y 0.3 s, y las cartas se desvanecen en lugar de salir volando.
- Los sonidos se generan con Web Audio (sin archivos) y empiezan con el primer gesto del jugador. `sonido: false` los apaga.
