# Plan — Spec 023, apertura nueva

## Resumen técnico
Se sustituyen el sobre (`PackMesh`) y el abanico de `OpeningStage` por un sobre nuevo con volumen, foil y dientes de
rasgado (`PackShell`) y por un mazo que se revela carta a carta. La lógica pura (umbral del rasgado, orden del mazo,
dirección del gesto) va en `domain/opening/`; la escena sigue animando solo lo que decide el servidor. Maquetas
aprobadas: lámina «Apertura nueva (spec 023)» en `waifubaker.pen`.

## Reglas (domain/opening/deck.ts)
- `TEAR_COMMIT = 0.6` y `tearProgress(dx, width)`: progreso 0–1 del rasgado en cualquier sentido (RF-6 a RF-8).
- `revealOrder(cards)`: orden estable de menor a mayor rareza (RF-13).
- `swipeSide(dx)`: lado hacia el que sale la carta apartada (RF-16); un toque sale a la derecha.

## Componentes
- `features/packs/PackShell.tsx` + `pack-shell.css` (sistema de diseño del sobre, RF-1 a RF-5): cuerpo con foil del
  tipo (plata o gold), ventana con la imagen de la colección (la imagen de sobre subida o la portada; si no hay, la
  pegatina de sobre), volumen en los bordes, tira con dientes y etiqueta PLATA/GOLD, nombre y código, destellos en el
  gold. Medidas en `cqw` para que valga a cualquier tamaño. Variantes: entero, abierto (sin tira) y rasgado (la tira
  sale volando, para «Abrir todos»).
- `features/opening/TearPack.tsx` (RF-4, RF-6 a RF-11, RF-23): el `PackShell` con la tira partida en dos capas
  recortadas por el punto de rasgado, borde roto en zigzag; arrastre con `@use-gesture`, en los dos sentidos; al
  soltar ≥ 60 % la tira se arranca y cae; si no, vuelve. Botón «Abrir sin deslizar» e Intro/Espacio. Inclinación por
  puntero o giroscopio con `useTiltSource`. Con movimiento reducido, solo el botón.
- `OpeningStage` (RF-10 a RF-19, RF-22, RF-23): pide el contenido al confirmar el rasgado; si falla, el sobre vuelve a
  cerrarse con el aviso y se puede reintentar. Mazo apilado que sale del sobre abierto; la carta de arriba brilla si es
  rara o mejor; toque o deslizamiento la voltea y la presenta al estilo de Bruno («¡Nueva!», insignia de rareza
  inclinada, nombre y colección); otro gesto la aparta hacia el lado del gesto; al apartar la última, el resumen.
  `autoOpen` retoma una apertura sin rasgar. Los efectos por rareza (sonido, vibración, partículas, confeti, destello,
  celebración y carta viva) se reutilizan.
- «Mis sobres», «Abrir todos» (reposo y ráfaga) y el simulador usan `PackShell` con su tipo (RF-5, RF-20, RF-21).

## Datos
Sin cambios de esquema. `LabCard` gana `isNew` para el «¡Nueva!». El simulador recibe el arte de la colección.

## Pruebas
Unidad: `deck.ts` (umbral, orden, lado). E2E: adaptar el rasgado y el volteo de los ayudantes (`tear`, abrir cartas)
al mazo nuevo. Por indicación del dueño (28 oct 2026), las pruebas se corren cuando él lo pida; mientras, se prueba en
local con la demo.
