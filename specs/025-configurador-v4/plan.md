# Plan — Spec 025, configurador de cartas v4 en el panel

## Resumen técnico
Lo nuevo de `carta-capas.js` v4 de Bruno (brillo por capa, intensidad del holo y `ex`) se pasa a **nuestra** copia de
la carta, que conserva el encuadre (spec 017), los marcos y sellos de la 022 y los filtros de seguridad (decisión D4).
El editor del panel se reorganiza con la distribución y los controles del configurador de Bruno usando componentes
nuevos del sistema de diseño con la paleta actual (D1). Maquetas: `maqueta.html` (Pencil sin cupo; se pasan a
`waifubaker.pen` cuando vuelva).

## Carta (ui/game/carta-capas/carta-capas.js, v4)
- Brillo por capa: `.cc-brillo-<tipo>` dentro de la capa, con la propia imagen como máscara; sigue el encuadre de la
  imagen. La ruta va dentro de `url()`: solo se admiten rutas sin comillas, paréntesis, barras invertidas ni espacios
  (`seguro.url`), lo que cumplen los enlaces firmados y las `data:` de la imagen fija.
- Holo: opacidad por `--cc-holo-i` (`holoIntensidad`, 0,4 por defecto); se cambia sin volver a pintar.
- Movimiento reducido: el destello que pasa queda quieto en el centro (RF-6).
- Marco `personalizado` con `marcoColores` (dos hex), con la fórmula del configurador (oscuro al 45 %); un color no
  válido cae al marco común. `ex` y `PRESETS.ex` son sinónimos de `ur`.
- Arreglo: sin `borde` guardado, el grosor es el del escalón (antes `num(null)` daba 0 y el marco no se veía).

## Datos (domain/cards)
- `layers.ts`: `brillo` en la capa de imagen (tipo de `GLOSS_TYPES`, intensidad 0–1), `holoIntensidad` 0–1,
  `marco` de `FRAMES` (escalones + `personalizado` + `ninguno`) y `marcoColores` (#rrggbb); `personalizado` exige
  colores. Sin migración: es JSON en `cards.layers`.
- `layers-rarity.ts`: con marco personalizado o sin marco, el cambio de rareza solo cambia el sello (RF-17).
- `layers-io.ts`: exporta `ex`, `holoIntensidad`, `brillo` y el personalizado como el degradado del configurador con
  su `aura`; importa lo mismo (el degradado del configurador vuelve a ser dos colores).
- `layers-editing.ts` (nuevo): papel por nombre de archivo (RF-20), colocar lo subido, partículas detrás de la chica,
  «Usar como sello» (RF-12) y recorte del sello a su contenido (RF-13).

## Sistema de diseño (ui/)
`Slider`, `ChipGroup`, `Segmented`, `ColorField` (form), `LayerList` y `LayerRow` (content) y `PreviewStage` (game),
con su fila en la tabla de `docs/DESIGN.md`. Iconos `Eye`, `EyeOff` y `Shuffle`. `CartaCapas` acepta `view`
(parallax, inclinación, movimiento e intensidad del holo) y lo aplica con `set` sin volver a montar la carta.

## Editor (features/admin/cards/LayersEditor.tsx)
Vista previa en `PreviewStage` con sus ajustes debajo (RF-8 a RF-10, «Probar revelado» con `ocultarSello` +
`entrar`); a la derecha, chica, fondo, encuadre (deslizadores), estilo, lista de capas (la de adelante arriba, fila
abierta con sus ajustes, brillo, «Usar como sello», un solo color, otra variación), rareza (fichas, personalizado,
aplicar estilo, grosor) y sello (selector, texto o imagen, esquina y tamaño). Textos en `admin-layers` (`v4`).

## Servidor
Sin cambios: la carta viva copia la configuración tal cual y la imagen fija sale del mismo `carta-capas.js`.

## Pruebas
Unitarias (carta, reglas, componentes, textos), integración (imagen fija con brillo, holo y marco; carta viva) y E2E
`configurador-v4.spec.ts`; se adaptan `card-layers` y `card-assembly` al orden nuevo de la lista y al ojo.
