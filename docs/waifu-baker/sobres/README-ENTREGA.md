# Creador de sobres y apertura de sobres · paquete de entrega

Paquete para integrar en Waifu Baker (Next.js + TypeScript + React) el **creador de sobres** y la **apertura de sobres** que se diseñaron en las sesiones con Claude. Bruno quiere en el juego **exactamente** este sobre: el mismo plástico 3D, los mismos sellos, la misma forma de rasgarlo y el mismo revelado de cartas.

Versión: **sobre-capas.js v1**, **creador-sobres.html v1** y **carta-capas.js v7 con motor compartido** (6 nov 2026).

Este paquete complementa el del configurador de cartas (`waifu-baker-configurador-cartas`, v7). Trae su propia copia de `carta-capas.js`: es la misma v7 más un objeto `CartaCapas.motor`, que el sobre usa para dibujar sus capas con los mismos efectos de las cartas. **Usa esta copia en lugar de la del paquete de cartas**: es compatible hacia atrás y las 10 pruebas de este paquete pasan con ella.

## Índice

1. [Qué es](#1-qué-es)
2. [Cómo lo usa una persona, paso a paso](#2-cómo-lo-usa-una-persona-paso-a-paso)
3. [Cómo se abre un sobre en el juego](#3-cómo-se-abre-un-sobre-en-el-juego)
4. [Archivos](#4-archivos)
5. [Dependencias y variables de entorno](#5-dependencias-y-variables-de-entorno)
6. [Cómo se ejecuta y cómo se prueba](#6-cómo-se-ejecuta-y-cómo-se-prueba)
7. [Cómo integrarlo en Next.js](#7-cómo-integrarlo-en-nextjs)
8. [Documentos detallados](#8-documentos-detallados)

---

## 1. Qué es

Son tres piezas:

- **`sobre-capas.js`**: el componente que **dibuja y abre** un sobre. Un solo archivo JavaScript, sin dependencias de npm. Monta el sobre dentro de un elemento HTML a partir de un **registro** (JSON). Hace todo lo del sobre:
  - Capas de arte con parallax, partículas y brillo solo en el dibujo, con el mismo motor que las cartas.
  - Plástico 3D: brillos, arrugas y silueta de almohada.
  - Sellos de aluminio con patrón holo opcional, foil, logo, insignia y banda del set.
  - Inclinación con el puntero, apertura **rasgando** por la línea o **despegando** un sticker, sonido y vibración.
- **`creador-sobres.html`**: el **creador**. Una página que usa el componente para armar un sobre con tus propias imágenes y produce el registro JSON y una miniatura PNG. Es lo que tiene que convertirse en el editor de sobres del panel de administración, con el mismo diseño y los mismos controles que el creador de cartas.
- **`apertura-sobre.html`**: la **apertura completa** como se vería en el juego. Lee el registro, el jugador rasga el sobre, las cartas suben desde dentro, se pasan una por una (con un efecto especial para SSR y EX) y al final aparece el resumen.

No hay servidor, base de datos ni API. Todo pasa en el navegador: las imágenes que subes no salen de él y el resultado es un JSON.

## 2. Cómo lo usa una persona, paso a paso

Las capturas están en `capturas/` y se describen en `capturas/CAPTURAS.md`.

1. **Abrir el creador.** Arranca con el sobre de ejemplo FA01 ya armado (captura 01). A la izquierda está la vista previa sobre una escena con rayos; a la derecha, el panel de controles.
2. **Mirar el sobre.** Al pasar el cursor por la escena, el sobre se inclina, las capas se separan y el brillo del plástico corre (captura 02). Si nadie lo toca, se balancea solo.
3. **Probarlo.** Hay dos formas:
   - Rasgarlo tú: arrastrar por la línea punteada de izquierda a derecha. La línea se va iluminando en verde (captura 04).
   - Pulsar **Probar apertura**: el sobre se abre solo, las cartas de muestra suben (captura 05) y aparece la primera (captura 06).

   **Siguiente carta** las pasa y **Volver a cerrar** regresa al sobre cerrado.
4. **Controles rápidos** (debajo de la escena):
   - **Versión:** 3D o plano (captura 08).
   - **Apertura:** rasgar o sticker (captura 07).
   - **Inclinación:** de 0 a 2×.
   - **Brillo del plástico:** de 0 a 150 %, solo en 3D.
   - **Ver guías:** las zonas del lienzo (captura 03).
   - **Movimiento solo** y **Sonido.**
   - **Fondo de pantalla:** rayos, oscuro o claro.
5. **Subir capas.** Se arrastran los archivos (PNG, WebP o JPG) a cualquier parte de la página o se toca la zona "Arrastra tus capas". El lienzo es de **1000 × 1750 px**. El nombre del archivo decide valores iniciales:
   - `fondo`, `background` o `bg`: va hasta atrás, con profundidad 0.25 y margen 3.
   - `personaje`, `character`, `char`, `waifu` o `chica`: profundidad 1.
   - `efecto`, `overlay`, `brillo`, `glitter`, `textura` o `luz`: profundidad 1.3, margen 3 y modo superponer.
   - `logo` (como palabra): no se agrega como capa; pasa a ser el logo del sobre.
   - Cualquier otro: un poco más adelante que la capa más cercana.
6. **Ajustar capas.** Igual que en el creador de cartas (capturas 10 y 11):
   - La lista muestra la capa de adelante arriba, con botones para ocultar, mover y quitar.
   - Arriba, bloqueadas, están las capas que pone el código: plástico 3D, banda del set, insignia, logo, sellos y foil.
   - Cada capa tiene modo de mezcla (12 modos), opacidad, profundidad (0 a 2.5) y margen extra (0 a 15 %).
   - Las capas de imagen tienen **Brillo solo en el dibujo**: holográfico, destello, dorado, plateado u **ondas que brillan**, este último con patrón y tamaño.
   - Las capas de partículas tienen tipo (9), cantidad, tamaño, velocidad, un solo color y "Otra variación".
   - **+ Partículas** agrega una capa detrás del personaje.
7. **Datos del sobre** (captura 12a):
   - Nombre del set (hasta 32 letras; desde 18 se achica para caber), código (hasta 8) y cartas por sobre (1 a 15).
   - Logo: Waifu Baker, una imagen propia o sin logo.
   - Insignia, por ejemplo "Edición especial", con su color.
   - Holo en todo el sobre y foil arriba y abajo, cada uno con su intensidad.
8. **Sellos** (captura 12b):
   - Colores de arriba y abajo, y el botón "Colores de la marca" para volver al rosa y al lima.
   - **Patrón holo**: sin patrón, 10 incluidos o uno propio, con su tamaño (10 a 150 %).
9. **Revisión automática** (captura 13). Avisa, sin bloquear, si:
   - una imagen no mide 1000 × 1750;
   - el fondo tiene transparencia;
   - algo de una capa cruza la línea de rasgado (y = 230);
   - el nombre es largo;
   - falta un archivo.
10. **Registro para el juego** (captura 14).
    - "Carpeta en el sitio" es el prefijo de las rutas del JSON. Se arma sola con el código (`sobres/fa02/`) hasta que la editas.
    - El JSON se ve en vivo, y **Copiar registro** lo copia.
    - **Descargar miniatura** baja un PNG de 500 × 875 del sobre cerrado (captura 17).
    - **Cargar ejemplo FA01** vuelve al ejemplo.
    - **Empezar sobre nuevo** pide confirmación (captura 15) y deja el sobre vacío (captura 16).
11. **Al volver.** Los ajustes se guardan en el navegador (`localStorage`, clave `wb-creador-sobre-v1`), pero las imágenes no. Hay que volver a arrastrar los mismos archivos, y cada uno se acomoda en su capa por nombre. Mientras falten, la vista previa y la revisión lo avisan.

## 3. Cómo se abre un sobre en el juego

`apertura-sobre.html` es la referencia de la pantalla de apertura (capturas 19 a 22):

1. El sobre aparece cerrado, flotando, con la indicación "Desliza el dedo por la línea". Las cartas ya están montadas detrás, pero **ocultas**, para que no se asomen al inclinar el sobre.
2. El jugador desliza por la línea, despega el sticker, pulsa Enter o toca **Abrir sin deslizar**. Al abrirse, la tira sale volando, hay un destello, un sonido de rasgado y una vibración corta.
3. A los 0.38 s las cartas suben medio cuerpo fuera del sobre. A los 1.25 s el sobre baja y se desvanece, y las cartas vuelven al centro un poco más grandes. A los 1.9 s se revela la primera.
4. Las cartas salen **derechas** y **solo se ve la de arriba**. Para pasar a la siguiente, el jugador la arrastra a un lado, la toca o pulsa "Siguiente carta". Si la que sigue es SSR o EX, el mazo late antes de mostrarla.
5. Una SSR o EX sale con rayos dorados, una estrella con su rareza, una campanita y una vibración.
6. Al final, el resumen muestra las cartas del sobre con su rareza, y "Abrir otro sobre" reinicia.

La tirada (qué cartas salen) es de ejemplo. En el juego la decide el servidor, y cada carta llega con su configuración de `carta-capas.js`.

## 4. Archivos

```
waifu-baker-sobres/
├─ README-ENTREGA.md                 este archivo
├─ PROMPT-INTEGRACION.md             pasos y prompt para que Claude Code lo integre idéntico
├─ src/                              código fuente completo
│  ├─ sobre-capas.js                 componente del sobre v1 (JS + su CSS, sin dependencias)
│  ├─ sobre-capas.d.ts               tipos de TypeScript del sobre
│  ├─ sobre-capas-API.md             API completa del componente
│  ├─ carta-capas.js                 componente de carta v7 + CartaCapas.motor (lo necesita el sobre)
│  ├─ carta-capas.d.ts               tipos de la carta, con el motor
│  ├─ creador-sobres.html            el creador (HTML, CSS y JS en un solo archivo)
│  ├─ apertura-sobre.html            la apertura completa como en el juego
│  ├─ img/plastico-*.webp            las 3 capas del plástico 3D (brillo, sombra, silueta)
│  ├─ sobres/fa01.json               registro del sobre de ejemplo, exportado por el creador
│  ├─ sobres/fa01/*.webp             capas del sobre de ejemplo (1000 × 1750)
│  ├─ cartas/yuki/*.webp             arte de las cartas de muestra de la apertura
│  ├─ marcos/patrones/*.webp         patrones holo (sellos, ondas que brillan y marco PX de las cartas)
│  └─ integraciones/react/
│     ├─ SobreCapas.tsx              envoltorio React + TypeScript para Next.js ('use client')
│     └─ CartaCapas.tsx              el envoltorio de la carta (el mismo del paquete de cartas)
├─ docs/
│  ├─ FORMATO-DE-DATOS.md            el registro del sobre, todos sus campos y cómo se convierte en imagen
│  ├─ EFECTOS-Y-ANIMACIONES.md       cómo funciona cada efecto y cada animación, con los valores exactos
│  ├─ RECURSOS-Y-LICENCIAS.md        fuentes, plástico, patrones, iconos, arte de ejemplo y sus licencias
│  ├─ LO-FRAGIL.md                   dependencias externas y puntos delicados
│  └─ ejemplos/                      registros de ejemplo (3D rasgar, plano sticker, sobre especial)
├─ capturas/                         24 capturas del creador y de la apertura, con CAPTURAS.md
├─ herramientas/
│  ├─ extraer-plastico.py            saca las 3 capas del plástico de un render gris del sobre vacío
│  ├─ render-plastico-gris.png       el render gris del que salieron las capas actuales
│  └─ generar-patrones.py            script que generó los patrones originales
└─ pruebas/                          pruebas automáticas (Playwright) y servidor local
```

| Archivo | Para qué sirve |
|---|---|
| `src/sobre-capas.js` | Monta, anima y abre el sobre. Inyecta su propio CSS (`<style id="sobre-capas-css">`). Expone `window.SobreCapas` y `module.exports`. Requiere `carta-capas.js` cargado antes. |
| `src/sobre-capas.d.ts` | Tipos de `Registro`, `Opciones`, `Instancia` y API. Comprobados con TypeScript 5.6 en modo estricto, junto con los dos envoltorios. |
| `src/carta-capas.js` | La carta. Aquí se usa para dos cosas: el motor de capas del sobre y las cartas que salen del sobre. |
| `src/creador-sobres.html` | El creador completo. Su `<script>` usa `window.SobreCapas` y `window.CartaCapas`. Sin compilación. |
| `src/apertura-sobre.html` | Referencia de la pantalla de apertura: secuencia, tiempos, gestos, efecto SSR y resumen. |
| `src/integraciones/react/SobreCapas.tsx` | Componente de React: carga las dos librerías en un efecto, monta el sobre, llama a `destruir()` al desmontar y expone `abrir`, `reiniciar`, `ocultar`, `estado` y `textoIndicacion`. Avisa con `onAbrir` y `onPista`. |
| `src/img/plastico-*.webp` | Imágenes del plástico 3D. Son las mismas para todos los sobres. |
| `docs/ejemplos/*.json` | Registros de ejemplo, uno por combinación importante de opciones. |
| `herramientas/extraer-plastico.py` | Por si cambian el plástico: con un render nuevo del sobre vacío en gris saca las 3 capas. Comprobado: con el render incluido reproduce exactamente las capas actuales. |
| `pruebas/` | `sobres.spec.mjs` (10 pruebas), `playwright.config.mjs`, `servidor.mjs`, `package.json` y una imagen de 800 × 1200 para probar la revisión. |

## 5. Dependencias y variables de entorno

**En ejecución: ninguna dependencia de npm.** `sobre-capas.js`, `carta-capas.js`, el creador y la apertura son JavaScript del navegador sin librerías.

| Qué | Versión | Dónde | Nota |
|---|---|---|---|
| Google Fonts: Dela Gothic One y Archivo | servicio en línea | logo y banda del sobre, interfaz del creador y de la apertura | En el juego conviene servirlas con `next/font`. Sin ellas, el logo y la banda salen con una fuente de respaldo. |
| `@playwright/test` | 1.56.1 | solo pruebas (`pruebas/package.json`) | Necesita Chromium: `npx playwright install chromium`. |
| Node.js | 18 o superior | solo pruebas y servidor local | Se probó con Node 22. |
| TypeScript y `@types/react` | los del proyecto | envoltorios `.tsx` | Se comprobó con TypeScript 5.6.3 y `@types/react` 18.3.12. |
| Python 3 con Pillow y NumPy | cualquiera reciente | solo `herramientas/` | No se usa en el juego. |

Navegadores: necesita *container queries* (unidades `cqw`), `aspect-ratio`, `mix-blend-mode`, `mask-image`, `clip-path` con `polygon()` y `color-mix()`. Esto equivale a Chrome y Edge 111+, Safari 16.2+ y Firefox 113+.

**Variables de entorno: ninguna.** No hay claves de API, tokens ni archivos `.env`. El servidor de pruebas acepta opcionalmente `PORT` (4173 por defecto).

## 6. Cómo se ejecuta y cómo se prueba

**Ejecutar.** Hay que servirlo por HTTP, no abrirlo con doble clic:

```
cd pruebas
node servidor.mjs            # http://localhost:4173/creador-sobres.html
                             # http://localhost:4173/apertura-sobre.html
```

Funciona igual `npx serve src` o cualquier servidor estático. Desde `file://` no funcionan:
- el sobre 3D: desaparece porque su silueta es una máscara;
- los patrones y el brillo por capa;
- la revisión automática;
- la lectura de `sobres/fa01.json` en la apertura.

El creador lo avisa. Ver `docs/LO-FRAGIL.md`.

**Pruebas automáticas:**

```
cd pruebas
npm install
npx playwright install chromium
npx playwright test
```

Las 10 pruebas pasan en Chromium 141 (unos 35 s):

1. El creador carga el ejemplo FA01: 4 capas, 5 capas fijas, revisión "Todo en orden", `CartaCapas.version` 7 y `SobreCapas.version` 1, sin errores de consola.
2. El registro que exporta el creador es idéntico a `src/sobres/fa01.json`.
3. En 3D las partes del sobre usan la silueta del plástico como máscara. En plano no hay máscara, el sobre se recorta con dientes y el plástico no se pinta.
4. Rasgar por la línea abre el sobre. Antes de abrir, las cartas están ocultas; después salen todas derechas y solo se ve una. Se pasan las 5 y "Volver a cerrar" regresa al inicio.
5. Sticker: cambia la indicación y el sobre se abre al despegar la tira hacia la derecha.
6. Código, insignia, patrón de sellos y holo llegan al registro y a la vista. Un nombre largo se achica.
7. La revisión avisa de una imagen de 800 × 1200 y de que cruza la línea de rasgado.
8. La miniatura es un PNG de 500 × 875.
9. La apertura del juego: rasgar, 5 cartas (la SSR con estrella), resumen con 5 cartas y "Abrir otro sobre".
10. A 390 px de ancho el creador no se desborda.

**Pruebas a mano** (5 minutos):
- El sobre se inclina con el ratón, y el brillo y las arrugas del plástico cambian.
- Rasgar a medias y soltar: la línea se apaga y el sobre sigue cerrado.
- Tocar el sobre sin arrastrar: la indicación se sacude.
- En celular, rasgar con el dedo: vibra al abrirse (Android).
- En la apertura, arrastrar una carta a un lado la saca; arrastrarla poco la regresa.

## 7. Cómo integrarlo en Next.js

Recomendación para que quede idéntico:

1. **Componentes.** Copia `src/sobre-capas.js`, `src/sobre-capas.d.ts`, `src/carta-capas.js` y `src/carta-capas.d.ts` a la carpeta de UI del juego. Si ya integraron la v7 del paquete de cartas, reemplaza `carta-capas.js` y su `.d.ts` por estos: son la misma v7 más `CartaCapas.motor`. Usa `src/integraciones/react/SobreCapas.tsx` como envoltorio.
2. **Recursos.** Copia a `public/` las imágenes del plástico (`img/plastico-*.webp`) y los patrones (`marcos/patrones/`).
   - Una sola vez al cargar la app, define `SobreCapas.recursos` con sus rutas; el envoltorio de React lo hace con la propiedad `recursos`.
   - Define también `CartaCapas.texturas.ondas`, si algún sobre usa "ondas que brillan".
3. **Mismo aspecto.** No reescribas los efectos: todo el aspecto del sobre sale del CSS que inyecta `sobre-capas.js` y de las 3 imágenes del plástico.
4. **Datos.** Cada sobre del juego guarda su registro (el JSON del creador) junto a sus datos. Las rutas del registro se cambian por las claves del almacenamiento del proyecto, que el servidor convierte en URL al servir el sobre.
5. **El creador como editor del panel.** Igual que el editor de cartas:
   - Pasa `creador-sobres.html` a una página de React del panel, conservando su CSS y su estructura.
   - La lógica del estado (`state`, `opciones(exportar)`, `renderJSON()`, `renderRevision()`) se puede pasar casi literal a un hook.
   - Lo que cambia respecto al archivo independiente:
     - "Copiar registro" pasa a **guardar** el registro.
     - Las imágenes se suben al almacenamiento en lugar de quedarse como `blob:`.
     - La miniatura se genera al guardar y se sube también.
     - Los textos pasan a los diccionarios en inglés y español.
     - Solo los administradores pueden editar.
6. **La apertura.** Usa `apertura-sobre.html` como especificación de la pantalla de abrir sobres:
   - Cuando el sobre llama a `alAbrir` (`onAbrir` en React), empieza la secuencia de las cartas.
   - Las cartas de la tirada llegan del servidor con su configuración de carta.
   - Los tiempos (0.38 s, 1.25 s y 1.9 s), los gestos y el efecto SSR están en `docs/EFECTOS-Y-ANIMACIONES.md`.
7. **Imagen plana** (tienda, menús, redes). El creador la genera en el navegador con `miniatura()` (canvas, 500 × 875). Si prefieren generarla en el servidor con `sharp`, la receta está en `docs/FORMATO-DE-DATOS.md`, sección "De registro a imagen".

## 8. Documentos detallados

- `PROMPT-INTEGRACION.md`: pasos y prompt listo para pegar en Claude Code.
- `src/sobre-capas-API.md`: referencia de la API del componente.
- `docs/FORMATO-DE-DATOS.md`: el registro, campo por campo, con capas, sellos, efectos, vistas y aperturas, y cómo se convierte en el sobre en pantalla y en una imagen plana.
- `docs/EFECTOS-Y-ANIMACIONES.md`: cómo funciona cada efecto y cada animación, con sus valores.
- `docs/RECURSOS-Y-LICENCIAS.md`: de dónde sale cada recurso y su licencia.
- `docs/LO-FRAGIL.md`: lo que depende de terceros o puede romperse.
