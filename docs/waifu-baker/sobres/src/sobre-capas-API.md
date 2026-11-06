# sobre-capas.js · API (v1)

Sobre de cartas por capas, con plástico 3D, sellos de aluminio y apertura de rasgar o de sticker. Un solo archivo sin dependencias de npm que inyecta su propio CSS (`<style id="sobre-capas-css" data-v="2">`).

**Requiere `carta-capas.js` v7 con `CartaCapas.motor`** cargado antes: el sobre arma sus capas de arte con las mismas piezas que las cartas.

```html
<script src="carta-capas.js"></script>
<script src="sobre-capas.js"></script>
<div id="sobre" style="width:300px"></div>
<script>
  SobreCapas.recursos = { brillo: '/sobres/plastico-brillo.webp', sombra: '/sobres/plastico-sombra.webp', silueta: '/sobres/plastico-silueta.webp' };
  CartaCapas.texturas.ondas = '/marcos/patrones/estelas.webp';   // si algún sobre usa "ondas que brillan"

  fetch('/sobres/fa01.json').then(r => r.json()).then(function (registro) {
    var sobre = SobreCapas.montar(document.getElementById('sobre'), Object.assign({}, registro, {
      alAbrir: function (s) { /* sacar las cartas */ s.ocultar(); },
      alPista: function () { /* sacudir la indicación */ }
    }));
    indicacion.textContent = sobre.textoIndicacion;   // «Desliza el dedo por la línea»
  });
</script>
```

El contenedor necesita un **ancho**. El alto sale solo de la proporción 1000 × 1750. Las medidas internas están en `cqw`, así que el sobre escala completo con su ancho.

## `SobreCapas.montar(el, opciones) → Instancia`

`opciones` es el **registro** del sobre (ver `docs/FORMATO-DE-DATOS.md`) más estas opciones de comportamiento, que no se guardan en el registro:

| Opción | Por defecto | Qué hace |
|---|---|---|
| `inclinacion` | 1 | Cuánto se inclina con el puntero (0 a 2). |
| `reposo` | `true` | Se balancea solo cuando nadie lo toca. |
| `flotar` | `true` | Sube y baja suavemente. |
| `sonido` | `true` | Sonidos de rasgado, despegado y pegado (Web Audio, sin archivos). |
| `zona` | el padre de `el` | Elemento que escucha el puntero para inclinar. Usa la pantalla de apertura entera para que se incline aunque el puntero no esté encima. |
| `etiqueta` | «Sobre {nombre} {código}» | Texto accesible. Se le agrega cómo abrirlo. |
| `alAbrir(sobre)` | — | Se llama **en el momento** en que se abre: al terminar de rasgar o despegar, con Enter o espacio, o con `abrir()`. Aquí empieza la revelación de cartas. |
| `alPista(sobre)` | — | Se llama cuando el jugador toca el sobre sin deslizar (menos de 260 ms). Buen momento para sacudir la indicación. |

El componente lanza un error si no encuentra `CartaCapas.motor`.

## Instancia

| Miembro | Qué hace |
|---|---|
| `elemento` | El elemento enfocable con `role="button"` (para enfocarlo o medirlo). |
| `estado` | `'cerrado'`, `'abriendo'` (los primeros 900 ms) o `'abierto'`. |
| `textoIndicacion` | «Desliza el dedo por la línea» o «Despega el sticker de arriba →», según la apertura. |
| `opciones` | Las opciones vivas. `inclinacion`, `reposo` y `sonido` se pueden cambiar directamente y aplican en el siguiente cuadro. |
| `abrir()` | Abre con animación, como si el jugador deslizara: rasgar, 520 ms; sticker, 900 ms. Luego llama a `alAbrir`. |
| `reiniciar()` | Lo vuelve a cerrar y a mostrar. Sortea un borde roto nuevo. |
| `ocultar()` | Lo baja y lo desvanece. Devuelve una promesa que se resuelve a los 650 ms. |
| `set(cambios)` | Cambia opciones del registro y lo vuelve a dibujar. `sellos` se combina con los sellos actuales. Si estaba abierto, lo cierra. |
| `guias(true \| false)` | Muestra u oculta las guías del lienzo: sellos, línea de rasgado, logo, banda y márgenes. |
| `destruir()` | Detiene el bucle, quita los eventos, cierra el audio y vacía el elemento. Llámalo al desmontar. |

## Propiedades de `SobreCapas`

| Propiedad | Qué es |
|---|---|
| `recursos` | `{ brillo, sombra, silueta }`: rutas de las imágenes del plástico. Por defecto `img/plastico-*.webp`, relativas a la página. Cámbialas antes de montar. |
| `aperturas` | `{ rasgar: 'Rasgar por la línea', sticker: 'Despegar el sticker' }`, para menús. |
| `zonas` | Zonas del lienzo en px: `lienzo [1000, 1750]`, `selloArriba [0, 150]`, `selloAbajo [1625, 1750]`, `corte 230`, `logo [260, 480]`, `set [1450, 1650]`, `margen 80`. |
| `version` | `1`. |

## Clases CSS

Todo lleva el prefijo `sc-`; las capas de arte, las clases `cc-` de `carta-capas.js`.

| Clase | Elemento |
|---|---|
| `.sc` | El contenedor (`el`). Lleva `.sc-v3d` en 3D, `.sc-quieto` si no flota, `.sc-con-holo` con holo y `.sc-sale` al ocultarse. |
| `.sc-sobre` | El sobre que se inclina. Lleva `.sc-rasgar` o `.sc-sticker`, `.sc-cortando` mientras se rasga o despega y `.sc-abierto` al abrirse. |
| `.sc-cuerpo`, `.sc-tira` | Las dos partes, cada una con su `.sc-pila` de capas. |
| `.sc-solapa` | El reverso del sticker que se dobla. |
| `.sc-corte`, `.sc-linea`, `.sc-luz-corte`, `.sc-dedo` | La línea punteada, la barra lima del avance y la guía animada. |
| `.sc-flash` | El destello al abrir. |
| `.sc-guias` | Las guías del lienzo. |

## Con React

`integraciones/react/SobreCapas.tsx`:

```tsx
const sobre = useRef<SobreCapasHandle>(null);
<SobreCapas
  ref={sobre}
  registro={registro}                       // estable: de la base de datos o con useMemo
  recursos={{ brillo: '/sobres/plastico-brillo.webp', sombra: '/sobres/plastico-sombra.webp', silueta: '/sobres/plastico-silueta.webp' }}
  texturaOndas="/marcos/patrones/estelas.webp"
  onAbrir={() => setFase('revelando')}
  onPista={sacudirIndicacion}
  style={{ width: 300 }}
/>
<button onClick={() => sobre.current?.abrir()}>Abrir sin deslizar</button>
```
