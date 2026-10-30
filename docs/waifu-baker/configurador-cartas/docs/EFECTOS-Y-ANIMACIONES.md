# Efectos y animaciones

Todo lo describe el CSS que inyecta `src/carta-capas.js` (arreglo `CSS`) y su bucle de animación (`cuadro()`). Las medidas en `cqw` son % del ancho de la carta, así que todo escala con su tamaño. Para que el juego se vea **exactamente** igual, hay que usar ese archivo tal cual, no reescribir los efectos.

## Movimiento de la carta

- **Bucle.** `requestAnimationFrame`. Lo pausa un `IntersectionObserver` cuando la carta no está en pantalla.
- **Entrada.** El puntero sobre la zona (por defecto, el padre de la carta) se normaliza a `x, y ∈ [-1, 1]` desde el centro de la carta. Se suaviza en cada cuadro: `x += (objetivo − x) × 0.1`.
- **Inclinación.** `rotateY(x × inclinacion)` y `rotateX(−y × inclinacion)`, con `inclinacion` en grados (14 por defecto). Usa `perspective: 1100px` y `preserve-3d`.
- **Parallax.** Cada capa se desplaza `−x × p × profundidad` px en horizontal y `−y × p × profundidad` px en vertical. `p` es la profundidad de la capa y `profundidad` la de la carta (14 px por defecto). Una capa con `p = 0.2` casi no se mueve; una con `p = 1.6` se mueve mucho: así se siente la distancia entre capas.
- **Sello.** Se desplaza el doble que la profundidad de la carta y queda delante con `translateZ(60px)`.
- **Movimiento solo** (`reposo: true`). Si nadie toca la carta: `x = sin(t / 1500 + fase) × 0.38` e `y = sin(t / 2100 + fase + 1) × 0.24`, con `t` en milisegundos. La fase cambia por carta para que no se muevan todas igual.
- **Celular.** Arrastrar con el dedo inclina la carta; al soltar, regresa. `habilitarGiroscopio()` (llamado desde un toque, porque iOS pide permiso) usa `x = gamma / 25` e `y = (beta − 40) / 25`.
- **Teclado.** Con la carta enfocada, las flechas la inclinan 0.7 en esa dirección durante 1.4 s.
- **Variables que mueven los brillos.** `--px = (x + 1) / 2`, `--py = (y + 1) / 2` y `--hyp = min(1, √(x² + y²))`.

## Marco

Anillo hecho con `mask-composite` (`exclude` / `xor`) sobre un gradiente de 135° escalado al 240 %. Su `background-position` es `(--px × 100 %, --py × 100 %)`, así que el brillo metálico corre por el borde al inclinar la carta. El grosor es `borde` % del ancho. Las esquinas miden 5.4 % del ancho.

## Aura y sombra

`.cc-in` lleva `box-shadow: 0 0 9cqw <aura>` y una sombra hacia abajo `0 10cqw 18cqw -7cqw rgba(0,0,0,.8)`. El arte tiene una sombra interior: línea de 1 px negra al 60 % y `6cqw` negra al 30 %.

## Reflejo (siempre activo)

Degradado radial centrado en `(--px, --py)`: blanco al 45 % en el centro, 8 % al 34 % y transparente al 62 %. Se mezcla con `overlay` y su opacidad es `0.2 + hyp × 0.55`: más fuerte cuanto más inclinada está la carta.

## Holo de carta (`holo`, `holoIntensidad`)

Gradiente lineal repetido de 115°: `#ff7aa8 0%, #ffd36e 7%, #8af0c4 14%, #6ec8ff 21%, #c79bff 28%, #ff7aa8 35%`. Va escalado al 280 %, se desplaza con `--px`/`--py` y se mezcla con `color-dodge` y `filter: brightness(.72) saturate(1.15)`.

Su opacidad es `holoIntensidad × (0.5 + hyp × 1.05)`. Con la intensidad por defecto (0.4) eso es 0.2 en reposo y sube con la inclinación. Aparece y desaparece con una transición de 0.35 s.

## Brillo solo en el dibujo (v4)

Dentro de la capa de imagen, encima del `img`, hay un `div.cc-brillo` con `mask-image: url(<la misma imagen>)`, `mask-size: cover` y centrado, igual que el `img` con `object-fit: cover`. Por eso el efecto solo aparece donde la capa tiene píxeles. Como la capa crea su propio contexto de apilamiento, la mezcla ocurre contra el dibujo de esa capa.

| Tipo | Degradado | Mezcla | Opacidad | Movimiento |
|---|---|---|---|---|
| `holo` | El mismo arcoíris del holo de carta, escalado al 280 % | `color-dodge` | `intensidad × (0.55 + hyp × 0.6)` | Sigue la inclinación |
| `destello` | Franja a 105°: transparente 42 %, blanco 95 % al 50 %, transparente 58 %; ancho 320 % | `screen` | `intensidad` | Animación `cc-destello` de 3.2 s, `ease-in-out`, infinita: cruza de derecha a izquierda en el 65 % del ciclo y espera |
| `oro` | 115°: `#5a3a0a, #ffe9a8 18%, #b8862c 34%, #fff7d6 48%, #a87420 62%, #ffe08a 80%, #5a3a0a`; 260 % | `overlay` | `intensidad` | Sigue la inclinación |
| `plata` | 115°: `#4a505c, #f2f5fa 18%, #9aa1b0 34%, #ffffff 48%, #8a91a0 62%, #e4e8ef 80%, #4a505c`; 260 % | `overlay` | `intensidad` | Sigue la inclinación |

## Partículas

Cada partícula es un `<i>` con una forma y una animación CSS. Las genera un pseudoaleatorio con semilla, así que la misma `semilla` siempre da la misma distribución.

| Tipo | Formas | Animación | Colores |
|---|---|---|---|
| Destellos dorados | estrella (42 %) y punto | `tw` | `#fff8dc #ffe08a #ffd36b #fffbe9`, resplandor `rgba(255,214,120,.95)` |
| Destellos de colores | estrella (42 %) y punto | `tw` | `#ff9ec7 #ffd36e #8af0c4 #7cc8ff #c79bff`, resplandor blanco |
| Confeti | rectángulo | `fall` | `#ff5c93 #ffd36e #5ce1a5 #5cb8ff #b07cff #ff9a5c` |
| Burbujas | aro con reflejo | `rise` | `#cdeeff #ffffff #e2d4ff` |
| Luces bokeh | círculo difuso | `pulse` | `#ff8ab0 #ffd36e #7cc8ff #c79bff` |
| Corazones | corazón (SVG) | `rise` | `#ff5c93 #ff8ab0 #ffc2d6` |
| Nieve | punto | `fall` | `#ffffff #eaf4ff` |
| Chispas de fuego | punto | `rise` | `#ffb35c #ffd36e #ff7a3d`, resplandor naranja |
| Pétalos de sakura | pétalo (SVG) | `fall` | `#ffc2d6 #ffd9e6 #ff9ec0` |

Tamaños en `cqw` (antes del multiplicador `tamano`): estrella 2.2–6.2, punto 0.5–1.4, rectángulo 1.2–2.3, aro 1.6–5, bokeh 6–16, corazón 2–4.6 y pétalo 1.8–3.6.

| Animación | Duración del ciclo (÷ `velocidad`) | Qué hace |
|---|---|---|
| `tw` (parpadeo) | 1.8–4 s | Opacidad 0 → 1 (45 %) → 0.85 (60 %) → 0; escala 0.25 → 1 y giro de 30° |
| `fall` (caer) | 6–12 s | Nace arriba (−8 %), baja `165cqw` con una deriva lateral de ±10 % y gira entre 180° y 720°; aparece al 10 % y se desvanece al final |
| `rise` (subir) | 6–11 s | Igual que `fall`, pero nace abajo (106 %) y sube |
| `pulse` (latir) | 3–6 s | Opacidad 0.12 ↔ 0.7 y escala 0.85 ↔ 1.1 |

Cada partícula empieza en un punto distinto de su ciclo (retraso negativo aleatorio), así que nunca parpadean todas a la vez.

## Sello

- **Siempre:** flota con `cc-bob`, un ciclo de 3.4 s que sube `1.8cqw` y gira −2.5°. Lleva sombra hacia abajo y un resplandor dorado suave.
- **`ocultarSello()`:** opacidad 0 y escala 0.2.
- **`entrar()`:** el sello hace `cc-pop` (0.75 s, `cubic-bezier(.2,1.6,.4,1)`, de escala 0.2 y −18° a escala 1 con rebote) y vuelve a flotar. Al mismo tiempo pasa el destello de la carta.
- **Sello de texto:** dos copias del texto, una con contorno de `2cqw` y sombra de `1.2cqw` del color de contorno y otra encima con el gradiente del estilo como relleno.

## Destello al revelar

`.cc-sweep`: franja de 105° (transparente 35 %, blanco 75 % al 50 %, transparente 65 %) en `overlay`. Al llamar `entrar()` cruza de −130 % a 130 % en 1.1 s, con 0.2 s de espera y `ease-out`.

## Aparición

Con `aparecer: true` la carta empieza invisible y aparece con una transición de opacidad de 0.45 s cuando cargan todas las imágenes, o a los 4 s como máximo.

## Modo estático (`estatica: true`)

Para rejillas con muchas cartas: sin bucle, sin inclinación y sin escuchar el ratón. Se conservan el marco, el reflejo en reposo, el holo y las partículas, pero estas últimas se reducen al 40 %.

## Movimiento reducido

Si el sistema pide `prefers-reduced-motion: reduce`:

- La carta no se balancea sola, pero sigue respondiendo al ratón, al dedo y al teclado.
- Las partículas quedan quietas con opacidad 0.6.
- El sello no flota ni rebota.
- No pasa el destello al revelar.
- El brillo `destello` queda quieto al centro.
