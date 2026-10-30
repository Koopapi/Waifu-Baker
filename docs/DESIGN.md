# Estilo visual — Waifu Baker TCG

## Estilo de la interfaz: kawaii pop sobre fondo oscuro (spec 014, 16 oct 2026)

Lámina «Kawaii (spec 014)» de `waifubaker.pen` (tema `paleta: kawaii`): fondo violeta oscuro con acentos pastel
vivos (chicle, lavanda, menta, celeste, limón y melocotón), radios muy redondeados, sombras de color y relieve en
los botones, tipografías Fredoka (títulos) y Nunito (texto). Los iconos clave son pegatinas propias (`Sticker`) y el
resto, Phosphor en doble tono. El sobre de cada colección es `PackArt` (compuesto con la portada) o un sobre hecho a
mano subido en el panel. En código, los tokens viven en `apps/web/src/ui/tokens.css`; el texto sobre los colores
sólidos va en tinta oscura (`--ui-on-accent`). Sustituye a la paleta «Cereza» de la spec 010.

### Premios con vida (spec 015, 18 oct 2026)

Lámina «Premios (spec 015) y cartas por capas (spec 016)», debajo de la kawaii (rehecha el 23 oct 2026: la primera versión se perdió al cerrar Pencil sin guardar). Lo pequeño vuela y lo grande se celebra: `FlightLayer` pinta las
pegatinas que vuelan en arco (Web Animations API, solo `transform` y `opacity`) hasta los elementos con
`data-fly-target` («packs» en la navegación, «cookies» en los contadores), que rebotan al recibirlas; los contadores
(`Badge` con `count`, `AnimatedCounter`) suben como un marcador. `Celebration` es un diálogo kawaii (píldora de
origen, título, el sobre en grande, contador «×n», confeti de `Confetti` y botones) que la cola de
`features/rewards/celebrations.tsx` muestra de una en una y nunca en la apertura. La pegatina del día (`StreakRow`)
se estampa al reclamar (`.streak-stamp`) y late en el día de gracia (`.streak-pulse`); la etiqueta «¡Nuevo!» es
`Badge tone="new"`; el error junto al botón es `Alert tone="danger"` con `actions`; el botón de silencio de la
cabecera reutiliza `SoundToggle`. Con movimiento reducido nada vuela, late ni estampa; la celebración aparece sin
animación.

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

**Juegos · Expediciones (spec 020, tablero en `waifubaker.pen`):** pegatina nueva de mapa para «Juegos» en la
navegación. El mapa es un lienzo oscuro con caminos punteados y una chincheta por zona: redonda, con borde blanco y el
color pastel de su terreno (Ciudad chicle, Bosque menta, Costa celeste, Ruinas lavanda, Montaña limón); con niebla, gris
translúcida con «Niebla · x/y»; con un equipo fuera, flota suave y enseña la cuenta atrás. Los equipos son filas con
las cartas apiladas, en menta al volver. Preparar es una ventana con 3 huecos, la barra de poder frente a la marca de
dificultad, la calificación como pastilla de color (Difícil rojo, Normal limón, Bien celeste, Excelente menta), las tres
duraciones con su botín y el selector de cartas con filtros. El reporte saca las frases una a una.

**Economía (spec 021, tablero «Economía (spec 021)»):** insignia de patron como pegatina chicle con corazón y borde
blanco (`Badge` tono `patron`), junto al nombre en la cuenta y el álbum público. Aviso «llega con la suscripción» en
acento suave con icono de destellos y enlace a Patreon, debajo de la tarjeta de colección, en el álbum de la colección
y compacto en «Mis sobres»; en Expediciones, el tercer espacio bloqueado con candado. En el panel, etiqueta «Gratuita»
(verde) o «Patreon» (acento) y un botón para cambiarla.

## Sistema de diseño (spec 011)

El código vive en `apps/web/src/ui` y el diseño en `Waifu Baker/waifubaker.pen`, lámina «Sistema de diseño
(spec 011)», con la paleta «Cereza» como variables `ui-*` (tema `paleta`). Cada componente del código tiene su
componente reutilizable en Pencil con las mismas variantes; el test `src/ui/pencil-map.test.ts` exige que
cualquier componente nuevo se añada a esta tabla.

**Temas (spec 026).** Kawaii (oscuro) es el de siempre. Street pop (claro, diseño de Bruno) vive en
`src/ui/themes/street.css`: redefine las variables `ui-*` bajo `[data-theme="street"]` y da la piel de cada componente
sobre sus clases `ui-*` (`ui-btn`, `ui-card`, `ui-field`…) dentro de un `@scope` que se detiene en las zonas marcadas con
`data-theme="kawaii"` (mesa de apertura, «Abrir todos», escenario de la carta). Un componente nuevo lleva su clase
`ui-*` y su regla en esa hoja; el catálogo `/sistema` tiene un interruptor para verlo en los dos temas.

| Componente (código) | Componente en Pencil |
|---|---|
| Button | Button/Primary, Button/Secondary, Button/Danger, Button/Success, Button/Ghost (y fila «Estados») |
| IconButton | IconButton |
| TextField | TextField (y «TextField (error)») |
| TextArea | TextField (mismo aspecto, varias líneas) |
| Field | Etiqueta, ayuda y error de TextField (envoltorio común de los campos) |
| Select | Select (disparador y lista abierta con buscador) |
| Checkbox | Checkbox |
| Switch | Switch |
| RadioGroup | RadioGroup (tarjetas) |
| ToastProvider | Toast (y «Toast (error)» con Reintentar) |
| Alert | Alert/info, Alert/success, Alert/warning, Alert/danger |
| EmptyState | EmptyState |
| Skeleton | Skeleton |
| SectionSkeleton | Skeleton |
| Modal | Modal |
| ConfirmProvider | ConfirmDialog |
| Menu | Menu |
| Tooltip | Tooltip |
| Card | Card (y «Card (interactiva)») |
| Badge | Badge/neutral, accent, success, warning, danger, info y Badge/contador |
| Tabs | Tabs |
| Progress | Progress |
| Avatar | Avatares |
| Table | Table |
| Countdown | Countdown |
| AnimatedCounter | AnimatedCounter |
| FocusView | FocusView |
| SoundToggle | SoundToggle |
| RingTimer | RingTimer (anillo de «Recompensas» y «Mis sobres», lámina «Kawaii (spec 014)») |
| Sticker | Sobre, Carta, Galleta, Regalo, Reloj, Colección, Racha y Perfil (lámina «Kawaii (spec 014)») |
| FlightLayer | Premio que vuela (lámina «Premios (spec 015) y cartas por capas (spec 016)») |
| Celebration | Celebración (lámina «Premios (spec 015) y cartas por capas (spec 016)») |
| Confetti | Confeti (lámina «Premios (spec 015) y cartas por capas (spec 016)») |
| AppShell | RailIcon (estados), NavPanel con «Item de navegación», TabBar |
| Banner | Banner |
| CartaCapas | Carta por capas (componente) con los cinco escalones N, R, SR, SSR y UR (lámina «Premios (spec 015) y cartas por capas (spec 016)») |
| Armado por capas | Editor de la carta (chica, fondo, sello, adornos y partículas de la biblioteca o propios, encuadre, estilo automático, exportar e importar, «Guardar en la biblioteca»), página «Biblioteca» con pestañas por tipo, ventana «Añadir de la biblioteca» y aviso de cartas sin armar (lámina «Armado de cartas por capas (spec 017)») |
| Cartas por capas en la web | Revelación con la carta viva, ficha con la carta viva y el interruptor «Mover con el teléfono», imágenes fijas con acabado holo, álbum público con marca de agua y revisión 18+ de cambios pendientes (lámina «Cartas por capas en la web (spec 018)») |
| Slider | Deslizador con nombre y valor (maqueta HTML de la spec 025, `specs/025-configurador-v4/maqueta.html`; pendiente de pasar a Pencil) |
| ChipGroup | Fichas de rareza con muestra del marco (maqueta HTML de la spec 025; pendiente de pasar a Pencil) |
| Segmented | Selector de opciones juntas (maqueta HTML de la spec 025; pendiente de pasar a Pencil) |
| OptionCards | Tarjetas de opción con miniatura: el selector de tema (maqueta HTML de la spec 026; pendiente de pasar a Pencil) |
| ColorField | Muestra de color con su valor (maqueta HTML de la spec 025; pendiente de pasar a Pencil) |
| LayerList | Lista de capas con «Adelante» y «Atrás» (maqueta HTML de la spec 025; pendiente de pasar a Pencil) |
| LayerRow | Fila de capa cerrada y abierta (maqueta HTML de la spec 025; pendiente de pasar a Pencil) |
| PreviewStage | Escena oscura de la vista previa (maqueta HTML de la spec 025; pendiente de pasar a Pencil) |
| «Abrir todos» dinámico | Ráfaga de sobres con «Saltar», foco en las destacadas con la carta viva y resumen agrupado por rareza con totales (lámina «"Abrir todos" dinámico (spec 019)») |

Pantallas: tableros «Pantallas · Escritorio» y «Pantallas · Móvil» del mismo archivo, con las capturas reales
de la demo (`pnpm showcase`). Se regeneran tras cada cambio visible.
