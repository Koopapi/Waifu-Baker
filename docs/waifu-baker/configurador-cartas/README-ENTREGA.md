# Configurador de cartas por capas · paquete de entrega

Paquete para integrar en Waifu Baker (Next.js + TypeScript + React) el configurador de cartas que se diseñó en las sesiones con Claude. Bruno pidió que el juego tenga **exactamente** estos efectos y este configurador: el mismo holo, el mismo brillo, las mismas partículas, el mismo marco, el mismo sello y el mismo movimiento.

Versión: **carta-capas.js v4** y **creador-cartas.html v4** (29 oct 2026).

## Índice

1. [Qué es](#1-qué-es)
2. [Cómo lo usa una persona, paso a paso](#2-cómo-lo-usa-una-persona-paso-a-paso)
3. [Archivos](#3-archivos)
4. [Dependencias y variables de entorno](#4-dependencias-y-variables-de-entorno)
5. [Cómo se ejecuta y cómo se prueba](#5-cómo-se-ejecuta-y-cómo-se-prueba)
6. [Cómo integrarlo en Next.js](#6-cómo-integrarlo-en-nextjs)
7. [Documentos detallados](#7-documentos-detallados)

---

## 1. Qué es

Son dos piezas:

- **`carta-capas.js`**: el componente que **dibuja** una carta. Un solo archivo JavaScript, sin dependencias. Monta la carta dentro de un elemento HTML a partir de un objeto de configuración (JSON). La carta tiene varias capas de arte que se mueven a distinta velocidad al inclinarla (parallax), partículas animadas, modos de mezcla, brillo solo sobre el dibujo de una capa, holo, reflejo, marco metálico por rareza y un sello que flota fuera de la esquina. Es lo que el juego usa en la ficha, la apertura de sobres y las colecciones.
- **`creador-cartas.html`**: el **configurador**. Una página que usa el componente para armar una carta con tus propios archivos y produce el JSON que el componente necesita. Es lo que tiene que convertirse en el editor de cartas del panel de administración, con el mismo diseño y los mismos controles.

No hay servidor, base de datos ni API. Todo pasa en el navegador: los archivos que subes no salen de él y el resultado es un JSON.

## 2. Cómo lo usa una persona, paso a paso

Las capturas están en `capturas/` y se describen en `capturas/CAPTURAS.md`.

1. **Abrir el configurador.** Arranca con la carta de ejemplo de Yuki ya armada (captura 01). A la izquierda está la vista previa sobre una escena oscura; a la derecha, el panel de controles.
2. **Mirar la carta.** Al pasar el cursor por la vista previa la carta se inclina y las capas se mueven a distinta velocidad. En celular se arrastra con el dedo. Si nadie la toca, se balancea sola ("Movimiento solo").
3. **Subir capas.** Se arrastran los archivos (PNG, WebP o JPG) a cualquier parte de la página o se toca la zona "Arrastra tus capas o toca para elegir". Se ordenan por nombre (`nombre_1_fondo`, `nombre_2_personaje`…) y el nombre decide valores iniciales:
   - `fondo`, `background` o `bg`: va hasta atrás, con profundidad 0.2 y margen 5.
   - `personaje`, `character`, `char`, `waifu` o `chica`: profundidad 1.
   - `overlay`, `brillo`, `glitter`, `textura` o `luz`: profundidad 1.3 y margen 6; si dice `overlay`, en modo superponer.
   - `sello`, `badge`, `rareza`, `ssr`, `ur`, `ex` o `sr`: se usa como sello, no como capa. Si la imagen tiene mucho espacio transparente, se recorta sola a su contenido.
   - Cualquier otro: un poco más adelante que la capa más cercana.
4. **Ordenar y ajustar capas.** La lista muestra la capa de adelante arriba. Cada capa tiene botones para ocultar, mover adelante o atrás y quitar. Al abrirla (capturas 02 y 03):
   - Todas: modo de mezcla (16 modos), opacidad, profundidad (0 a 2.5) y margen extra (0 a 15 %).
   - Capas de imagen: **Brillo solo en el dibujo** (holográfico, destello que pasa, metálico dorado o plateado) con su intensidad, y el botón "Usar como sello".
   - Capas de partículas: tipo (9), cantidad (0 a 200), tamaño, velocidad, "Un solo color" y "Otra variación" (cambia la semilla).
5. **Agregar partículas.** "+ Partículas" agrega una capa justo detrás del personaje.
6. **Elegir la rareza** (captura 04). Chips EX, SSR, SR, R, N, Personalizado y Sin marco. "Aplicar estilo de la rareza" pone el marco, las partículas, el sello y el holo del escalón; si ya hay un sello de imagen, lo respeta. Con "Personalizado" aparecen dos colores (color y brillo) para el marco (captura 05). "Grosor del borde" va de 0.8 a 5.
7. **Sello** (capturas 04 y 05). Ninguno, texto (hasta 6 letras, estilo oro, plata, arcoíris, rosa, azul o morado) o imagen. Se elige la esquina y el tamaño.
8. **Carta.** Nombre, carpeta en el sitio (prefijo de las rutas del JSON) y proporción (automática, 700 × 991, carta TCG 63 × 88 mm, 5:7, 2:3 o 3:4).
9. **Vista previa.** Debajo de la carta: profundidad del parallax (0 a 30 px), inclinación máxima (0 a 26°), versión holo, **intensidad del holo**, movimiento solo y "Probar revelado", que oculta el sello y lo hace entrar con rebote y un destello (captura 10).
10. **Copiar la configuración** (captura 07). "Configuración para el sitio" muestra el JSON en vivo y "Copiar configuración" lo copia. "Cargar ejemplo de Yuki" vuelve a la carta de ejemplo. "Empezar carta nueva" pide confirmación (captura 08) y deja la carta vacía (captura 09).
11. **Al volver.** Los ajustes se guardan en el navegador (`localStorage`, clave `wb-creador-carta-v1`), pero las imágenes no: hay que volver a arrastrar los mismos archivos y cada uno se acomoda en su capa por nombre. Mientras falten, la vista previa lo avisa.

## 3. Archivos

```
waifu-baker-configurador-cartas/
├─ README-ENTREGA.md               este archivo
├─ PROMPT-INTEGRACION.md           pasos y prompt para que Claude Code lo integre idéntico en el panel
├─ src/                            código fuente completo
│  ├─ carta-capas.js               componente de carta por capas v4 (JS + su CSS, sin dependencias)
│  ├─ carta-capas.d.ts             tipos de TypeScript del componente
│  ├─ carta-capas-API.md           API completa del componente, con las novedades de la v4
│  ├─ creador-cartas.html          el configurador (HTML, CSS y JS en un solo archivo)
│  ├─ ejemplo.html                 demo de cómo se ve una carta en el juego: ficha y apertura de sobre
│  ├─ cartas/yuki.json             configuración de la carta de ejemplo
│  ├─ cartas/yuki/*.webp           capas de la carta de ejemplo (700 × 991) y su sello
│  └─ integraciones/
│     ├─ react/CartaCapas.tsx      envoltorio React + TypeScript para Next.js (App Router, 'use client')
│     ├─ react/CartaCapas.jsx      el mismo envoltorio en JavaScript
│     └─ vue/CartaCapas.vue        envoltorio de Vue 3 (no hace falta en este proyecto)
├─ docs/
│  ├─ FORMATO-DE-DATOS.md          el JSON de una carta, todos sus campos y cómo se convierte en imagen
│  ├─ EFECTOS-Y-ANIMACIONES.md     cómo funciona cada efecto, con los valores exactos
│  ├─ RECURSOS-Y-LICENCIAS.md      fuentes, marcos, iconos, arte de ejemplo y sus licencias
│  ├─ LO-FRAGIL.md                 dependencias externas y puntos delicados
│  └─ ejemplos/                    JSON reales exportados por el configurador
├─ capturas/                       15 capturas del configurador y del juego, con CAPTURAS.md
└─ pruebas/                        pruebas automáticas (Playwright) y servidor local
```

| Archivo | Para qué sirve |
|---|---|
| `src/carta-capas.js` | Monta y anima la carta. Lo usan el juego y el configurador. Inyecta su propio CSS (`<style id="carta-capas-css">`). Expone `window.CartaCapas` y `module.exports`. |
| `src/carta-capas.d.ts` | Tipos de `Opciones`, capas, sellos, instancia y API. Comprobados con TypeScript 5.6 en modo estricto. |
| `src/creador-cartas.html` | El configurador completo. Su `<script>` usa `window.CartaCapas`. No tiene paso de compilación. |
| `src/ejemplo.html` | Referencia de cómo se ve la carta dentro de las pantallas del juego (ficha con tilt y apertura con revelado). |
| `src/integraciones/react/CartaCapas.tsx` | Componente de React listo para Next.js: monta en un efecto, llama a `destruir()` al desmontar y expone `entrar`, `ocultarSello`, `set` y `habilitarGiroscopio`. |
| `src/cartas/` | Arte y configuración de ejemplo para probar. |
| `docs/ejemplos/*.json` | Salidas reales del configurador: SSR de ejemplo, EX con brillo por capa, EX con sello de imagen y marco personalizado con sello de texto. |
| `pruebas/` | `configurador.spec.mjs` (6 pruebas), `playwright.config.mjs`, `servidor.mjs` (servidor estático sin dependencias) y `package.json`. |

## 4. Dependencias y variables de entorno

**En ejecución: ninguna dependencia de npm.** `carta-capas.js` y el configurador son JavaScript del navegador sin librerías.

| Qué | Versión | Dónde | Nota |
|---|---|---|---|
| Google Fonts: Archivo y Dela Gothic One | servicio en línea | interfaz del configurador | Para el juego conviene servirlas desde el propio proyecto con `next/font`. Ver `docs/RECURSOS-Y-LICENCIAS.md`. |
| Google Fonts: Space Grotesk | servicio en línea | solo `ejemplo.html` | No hace falta en el juego. |
| `@playwright/test` | 1.56.1 | solo pruebas (`pruebas/package.json`) | Necesita Chromium: `npx playwright install chromium`. |
| Node.js | 18 o superior | solo pruebas y servidor local | |
| TypeScript y `@types/react` | los del proyecto | envoltorio `.tsx` | Se comprobó con TypeScript 5.6.3 y `@types/react` 18.3.12. |

Navegadores: necesita *container queries* (unidades `cqw`), `aspect-ratio`, `mix-blend-mode`, `mask-image` e `IntersectionObserver`. Esto equivale a Chrome y Edge 105+, Safari 16+ y Firefox 110+.

**Variables de entorno: ninguna.** No hay claves de API, tokens ni archivos `.env`. El servidor de pruebas acepta opcionalmente `PORT` (4173 por defecto).

## 5. Cómo se ejecuta y cómo se prueba

**Ejecutar el configurador.** Hay que servirlo por HTTP, no abrirlo con doble clic:

```
cd pruebas
node servidor.mjs            # http://localhost:4173/creador-cartas.html
```

Funciona igual `npx serve src` o cualquier servidor estático. Abierto desde `file://`, todo funciona **menos** el brillo por capa y el recorte automático del sello, porque el navegador trata cada archivo local como de otro origen (ver `docs/LO-FRAGIL.md`).

**Ver la carta en el juego:** `http://localhost:4173/ejemplo.html`.

**Pruebas automáticas:**

```
cd pruebas
npm install
npx playwright install chromium
npx playwright test
```

Las 6 pruebas pasan en Chromium (5 s):

1. Carga con la carta de ejemplo, `CartaCapas.version === 4`, 5 capas en la lista y 4 imágenes en la carta, sin errores de consola.
2. Brillo solo en el dibujo: al elegir "Holográfico" en el personaje aparece `.cc-brillo-holo` con la imagen del personaje como máscara, y el JSON incluye `brillo`.
3. Rareza EX: sello "EX" arcoíris, holo activado, la intensidad cambia la variable `--cc-holo-i` y el JSON sale con `marco: "ex"` y `holoIntensidad`.
4. `'ur'` sigue funcionando como sinónimo de EX.
5. A 390 px de ancho no hay scroll horizontal.
6. `ejemplo.html` carga sin errores.

**Pruebas a mano** (5 minutos):

- La carta se inclina con el ratón y las capas se separan.
- "Probar revelado" oculta el sello y lo hace entrar con rebote.
- Con "Holográfico" en el personaje, el arcoíris aparece solo sobre ella y el fondo no cambia (captura 02).
- Al mover "Intensidad del holo", el holo de toda la carta cambia en vivo.
- Al recargar se conservan los ajustes y la vista previa pide los archivos que faltan.

## 6. Cómo integrarlo en Next.js

Recomendación para que quede idéntico:

1. **Componente.** Copia `src/carta-capas.js` y `src/carta-capas.d.ts` a la carpeta de UI del juego. El proyecto ya tiene una versión 3 en `apps/web/src/ui/game/carta-capas/`: reemplázala. Usa `src/integraciones/react/CartaCapas.tsx` como referencia del envoltorio.
2. **Mismo aspecto.** No reescribas los efectos: todo el aspecto de la carta sale del CSS que `carta-capas.js` inyecta. Si se reescribe en otro sistema, se pierde la paridad.
3. **El configurador como editor del panel.**
   - Pasa `creador-cartas.html` a una página de React del panel de administración, conservando su CSS tal cual (puede ir a un CSS Module o a un archivo global con un prefijo de clase) y la misma estructura de controles.
   - El estado de la carta es un objeto `state`. `opciones(exportar)` lo convierte en la configuración del componente y `renderJSON()` produce el JSON para guardar. Esa lógica se puede pasar casi literal a un hook.
   - Lo que cambia respecto al archivo independiente:
     - "Copiar configuración" pasa a **guardar** la configuración en la carta (`capas_json`).
     - Las imágenes se suben al almacenamiento del proyecto en lugar de quedarse como `blob:`.
     - Los textos pasan a los diccionarios en inglés y español.
     - Solo los administradores pueden editar.
4. **Rareza EX.** En código el escalón es `'ex'`; `'ur'` se acepta como sinónimo para lo ya guardado. En la interfaz siempre se muestra "EX".
5. **Imagen plana** (zonas públicas, miniaturas, redes). Este paquete **no** la genera. El algoritmo para reproducir la carta en reposo está en `docs/FORMATO-DE-DATOS.md`, sección "De JSON a imagen".

## 7. Documentos detallados

- `PROMPT-INTEGRACION.md`: pasos y prompt listo para pegar en Claude Code.

- `docs/FORMATO-DE-DATOS.md`: el JSON, campo por campo, con rarezas, marcos, capas, efectos y plantillas, y cómo se convierte en la carta en pantalla y en una imagen plana.
- `docs/EFECTOS-Y-ANIMACIONES.md`: cómo funciona cada efecto y cada animación, con sus valores.
- `docs/RECURSOS-Y-LICENCIAS.md`: de dónde sale cada recurso y su licencia.
- `docs/LO-FRAGIL.md`: lo que depende de terceros o puede romperse.
- `src/carta-capas-API.md`: referencia de la API del componente.
