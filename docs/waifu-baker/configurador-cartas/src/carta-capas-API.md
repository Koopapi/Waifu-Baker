# Carta por capas · Waifu Baker (v4)

## Novedades de la versión 4

- **Rareza EX.** La rareza más alta se llama `ex`: marco arcoíris, sello "EX" y holo. `'ur'` sigue funcionando como sinónimo, así que las cartas guardadas con `ur` no se rompen.
- **Brillo solo en el dibujo.** Cualquier capa de imagen acepta `brillo: { tipo, intensidad }`. El efecto se pinta solo donde la capa tiene dibujo, nunca en la parte transparente del PNG, porque usa la misma imagen como máscara.
  - `tipo`: `'holo'` (arcoíris que cambia al inclinar), `'destello'` (franja de luz que cruza), `'oro'` o `'plata'` (reflejo metálico).
  - `intensidad`: de 0 a 1 (0.7 por defecto).
  - Si el arte se sirve desde otro dominio (un CDN o almacenamiento con URL firmada), ese dominio debe responder con `Access-Control-Allow-Origin`, porque los navegadores piden CORS para usar una imagen como máscara.
- **Intensidad del holo.** `holoIntensidad` (de 0 a 1, 0.4 por defecto) controla qué tan fuerte se ve el holo de toda la carta. Se puede cambiar en vivo con `carta.set({ holoIntensidad: .8 })`.
- El creador de cartas tiene los controles nuevos: "Brillo solo en el dibujo" en cada capa de imagen, "Intensidad del holo" y el chip EX.

```js
CartaCapas.montar(el, {
  marco: 'ex', holo: true, holoIntensidad: .6,
  capas: [
    { src: 'cartas/yuki/yuki_1_fondo.webp', profundidad: .2, margen: 5 },
    { src: 'cartas/yuki/yuki_3_personaje.webp', profundidad: 1, brillo: { tipo: 'holo', intensidad: .7 } }
  ],
  sello: { texto: 'EX', estilo: 'arcoiris', esquina: 'sup-izq', tamano: 14 }
});
```


Componente para mostrar cartas con profundidad: varias capas de arte que se mueven a distinta velocidad (parallax), destellos que parpadean, capas con modo de mezcla como en Photoshop, marco de rareza y un sello (por ejemplo, "SSR") que flota fuera de la esquina.

Es un solo archivo JavaScript, sin dependencias. Funciona en cualquier sitio: HTML plano, React, Vue, Next, Nuxt o plantillas del servidor.

## Qué trae el paquete

```
carta-capas.js                  el componente (incluye su CSS)
ejemplo.html                    demo completa: ficha de carta y apertura de sobre
creador-cartas.html             herramienta para armar cartas nuevas con tus archivos
cartas/yuki.json                la definición de la carta de Yuki
cartas/yuki/*.webp              las capas de Yuki, ya optimizadas
integraciones/react/CartaCapas.jsx
integraciones/vue/CartaCapas.vue
```

## Probarlo

Abre `ejemplo.html` en el navegador. No necesita servidor. Arriba hay dos pestañas: **Ficha de carta** y **Apertura**.

## Cartas de una sola imagen: presets por rareza (v3)

Para que todas las cartas del sitio se vean como las cartas por capas, aunque solo tengan una ilustración:

```js
CartaCapas.montarRareza(el, 'ssr', 'cartas/mika.webp', { etiqueta: 'Mika, SSR' });
```

| Rareza | Marco | Partículas | Sello | Holo |
|---|---|---|---|---|
| `n` | Plateado | No | No | No |
| `r` | Azul | Destellos de colores, pocos | No | No |
| `sr` | Morado | Destellos de colores | Texto "SR" morado | No |
| `ssr` | Oro | Destellos dorados | Texto "SSR" oro | No |
| `ex` | Arcoíris | Destellos de colores, muchos | Texto "EX" arcoíris | Sí |

- Con una sola imagen, las partículas van al frente en modo `screen`. Si pasas un arreglo de capas, van entre el fondo y la personaje.
- Lo que pases en el tercer argumento gana sobre el preset (por ejemplo `{ sello: { src: 'mika_ssr.webp' } }`).
- `CartaCapas.desdeRareza(rareza, imagen, extra)` devuelve la configuración sin montar nada.

**Rejillas con muchas cartas:** agrega `estatica: true`. Conserva marco, brillo y partículas (menos), sin inclinación ni listeners.

## Creador de cartas

Abre `creador-cartas.html`. Elige una rareza y toca **Aplicar estilo de la rareza** para ponerle marco, partículas y sello automáticamente. Arrastra las capas de una carta, ordénalas, elige partículas, modos de mezcla, marco y sello, y copia la configuración que aparece abajo. Esa configuración se pega tal cual en el sitio (o se guarda como `cartas/<nombre>.json`).

Los archivos no salen del navegador. El creador recuerda los ajustes entre visitas, pero no las imágenes: al volver, arrastra los mismos archivos y cada uno se acomoda en su capa.

Si el sello es un lienzo completo con el logo en una esquina, el creador detecta la parte visible y guarda el recorte en la configuración (`recorte` y `relacion`). No hace falta recortar el archivo.

## Uso básico (HTML plano)

```html
<div id="carta" style="width: 330px"></div>

<script src="carta-capas.js"></script>
<script>
  const carta = CartaCapas.montar(document.getElementById('carta'), {
    etiqueta: 'Yuki, rareza SSR',
    marco: 'ssr',
    capas: [
      { src: 'cartas/yuki/yuki_1_fondo.webp',       profundidad: 0.2,  margen: 5 },
      { particulas: 'destellos-dorados',            profundidad: 0.55, margen: 4 },
      { src: 'cartas/yuki/yuki_3_personaje.webp',   profundidad: 1 },
      { src: 'cartas/yuki/yuki_4_particulas1.webp', profundidad: 1.3,  margen: 6, mezcla: 'overlay' },
      { src: 'cartas/yuki/yuki_5_insignia.webp',    profundidad: 1.6 }
    ],
    sello: { src: 'cartas/yuki/yuki_ssr.webp', esquina: 'sup-izq' }
  });
</script>
```

El contenedor define el **ancho**. La altura se calcula sola con la proporción de la carta.

Deja algo de espacio alrededor del contenedor (unos 40 px arriba y a la izquierda) para que el sello que sobresale no quede cortado por un `overflow: hidden` del padre.

## Formato de una carta

Es el mismo objeto que recibe `montar()`. Se puede guardar como JSON (ver `cartas/yuki.json`) o en la base de datos.

| Campo | Qué hace | Por defecto |
|---|---|---|
| `capas` | Lista de capas, **de atrás hacia adelante** | `[]` |
| `marco` | `'ex'` (o `'ur'`, que es lo mismo), `'ssr'`, `'sr'`, `'r'`, `'n'`, `'ninguno'` o cualquier gradiente CSS | `'ssr'` |
| `borde` | Grosor del marco, en % del ancho de la carta | `2.2` |
| `aura` | Color del resplandor alrededor (para marcos personalizados) | según el marco |
| `sello` | Imagen: `{ src, esquina, tamano, recorte?, relacion? }`. Texto: `{ texto, estilo, esquina, tamano }` con estilos `oro`, `plata`, `arcoiris`, `rosa`, `azul`, `morado`. Esquinas: `sup-izq`, `sup-der`, `inf-izq`, `inf-der` | sin sello |
| `holo` | Agrega el brillo arcoíris de la versión holo | `false` |
| `proporcion` | Ancho ÷ alto del arte | `0.7064` (700 × 991) |
| `profundidad` | Píxeles que se mueve una capa de profundidad 1 | `14` |
| `inclinacion` | Grados máximos que gira la carta | `14` |
| `reposo` | La carta se balancea sola cuando nadie la toca | `true` |
| `zona` | Elemento donde se escucha el ratón | el padre del contenedor |
| `etiqueta` | Texto para lectores de pantalla | `'Carta'` |

Cada capa acepta:

| Campo | Qué hace |
|---|---|
| `src` | Ruta de la imagen |
| `profundidad` | Cuánto se mueve. Menos de 1 queda detrás del personaje; más de 1, delante |
| `margen` | % extra que sobra en cada lado. Úsalo en capas que cubren toda la carta (fondos, texturas) para que no se vean bordes al moverse |
| `mezcla` | Modo de mezcla CSS: `overlay`, `screen`, `multiply`, `color-dodge`, `soft-light`… |
| `opacidad` | De 0 a 1 |
| `particulas` | Tipo de partículas generadas (no necesita imagen): `destellos-dorados`, `destellos-arcoiris`, `confeti`, `burbujas`, `bokeh`, `corazones`, `nieve`, `chispas`, `petalos` |
| `cantidad`, `tamano`, `velocidad` | Ajustes de las partículas (tamaño y velocidad son multiplicadores, 1 = normal) |
| `color` | Un solo color para todas las partículas (si no, usa la paleta del tipo) |
| `semilla` | Número que fija dónde aparece cada partícula, para que se vea igual en el creador y en el sitio |

## Métodos

```js
carta.set({ holo: true })      // cambia cualquier opción en vivo, incluidas capas, marco y sello
carta.ocultarSello()           // esconde el sello (antes de revelar la carta)
carta.entrar()                 // el sello aparece con rebote y un destello cruza la carta
carta.habilitarGiroscopio()    // en móvil, la carta sigue la inclinación del teléfono
carta.listo                    // promesa: todas las imágenes cargaron
carta.destruir()               // quita la carta y todos sus eventos
```

### Flujo de la apertura

```js
const carta = CartaCapas.montar(el, { ...yuki, reposo: false });
carta.ocultarSello();

// cuando el jugador toca y termina la animación de volteo:
carta.entrar();
carta.set({ reposo: true });
```

En `ejemplo.html` está el volteo completo con CSS (`.flip`, `.face`, `backface-visibility`).

### Giroscopio

`habilitarGiroscopio()` debe llamarse **desde un toque del jugador** (por ejemplo, un botón "Inclinar para mover"), porque iOS pide permiso y solo lo permite tras una interacción. En Android funciona directo. Devuelve una promesa con `true` si quedó activo.

## React y Vue

En `integraciones/` hay un componente para cada uno. Copia `carta-capas.js` junto al componente.

```jsx
import CartaCapas from './CartaCapas';
import yuki from '../cartas/yuki.json';

const ref = useRef(null);
<CartaCapas ref={ref} carta={yuki} holo={esHolo} style={{ width: 330 }} />
// ref.current.entrar(), ref.current.ocultarSello()
```

```vue
<CartaCapas ref="carta" :carta="yuki" :holo="esHolo" style="width:330px" />
```

Ambos solo corren en el navegador, así que funcionan con Next.js y Nuxt.

## Cómo preparar las capas de una carta nueva

1. Todas las capas del **mismo tamaño de lienzo** y alineadas, como si salieran del mismo archivo de Photoshop o Clip Studio. Yuki usa 700 × 991 px.
2. PNG con transparencia (el fondo puede ser opaco).
3. Conviértelas a **WebP** para que pesen menos. Calidad 85–92 está bien. Las capas de Yuki pesan entre 20 y 290 KB.
4. Nombres en orden: `nombre_1_fondo`, `nombre_2_…`, etc.
5. Si una capa con modo de mezcla se ve demasiado fuerte, bájale la `opacidad` en vez de editar la imagen.

## Guardar las cartas en la base de datos

Una forma simple, pensando en el editor de carta del panel:

```
carta          id, nombre, rareza, marco, proporcion, sello_src, sello_esquina, miniatura
carta_capa     carta_id, orden, src, profundidad, margen, mezcla, opacidad, destellos
```

La API arma el objeto con las capas ordenadas por `orden` y el front lo pasa tal cual a `montar()`.

## Rendimiento y accesibilidad

- Las cartas que no están en pantalla dejan de animarse solas (usa `IntersectionObserver`), así que una colección con muchas cartas no se pone lenta. Aun así, en la rejilla de colección conviene usar la **miniatura** plana y montar la carta por capas solo en la ficha y en la apertura.
- La carta aparece con un desvanecido cuando todas sus imágenes cargaron.
- Respeta "reducir movimiento" del sistema: sin balanceo ni parpadeo, pero la carta sigue respondiendo al ratón.
- Con teclado: la carta se enfoca con Tab y se inclina con las flechas.
- En pantallas táctiles, arrastrar sobre la carta la inclina y no desplaza la página.

## Compatibilidad

Navegadores con consultas de contenedor (unidades `cqw`): Chrome y Edge 105+, Safari 16+, Firefox 110+. Cubre prácticamente a todos los usuarios actuales.
