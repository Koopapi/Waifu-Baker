# Plan 018 — Las cartas por capas se ven en toda la web

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Parte de las specs 016 y 017 (configuración por capas,
`carta-capas.js` con encuadre, biblioteca). Primero las maquetas en Pencil; después el código.

## 1. Imagen fija (RF-1 a RF-5)

- **Compositor en el servidor con sharp** (`server/cards/flatten.ts`), sin dependencias nuevas: dibuja la carta armada
  en reposo en el lienzo 1400 × 1982 (2 × 700 × 991):
  - capas de imagen en orden, con su encuadre (`translate/scale/rotate` y `cubrir`/`contener`), margen, opacidad y
    mezcla (solo los modos que sharp reproduce, spec 016 RF-7);
  - partículas en reposo: las mismas posiciones que `carta-capas.js` (misma semilla y generador), dibujadas como SVG;
  - marco y brillo de cada escalón (N, R, SR, SSR, UR) como **superposiciones PNG** exportadas una vez de
    `carta-capas.js` (script de desarrollo con Playwright, como los marcos de Pencil) en `assets/frames-capas/`;
  - sello: el de imagen tal cual; el de texto con sus estilos dibujado en SVG con la fuente del proyecto;
  - holo (RF-5): superposición arcoíris (`assets/frames-capas/holo.png`) con mezcla `soft-light`.
- Salidas en las mismas claves que hoy (`key_full/mid/thumb/public` + blurhash), con la proporción del lienzo:
  full 1400 × 1982, mid 700 × 991, thumb 300 × 425 y public 600 × 849 con la marca de agua actual (RF-15). Así todo lo
  que hoy muestra la compuesta (colección, resumen, «Abrir todos», portada del sobre, álbum, vista previa de enlaces)
  pasa a la imagen fija sin tocar cada pantalla (RF-2, RF-8).
- La versión holo se genera aparte (`key_holo_mid`, `key_holo_thumb`; migración `0015`) solo para rara o mejor, porque
  la misma carta puede salir normal u holo.
- `composeCard` (marco de Pencil) deja de usarse para cartas; se borra junto con sus marcos al final.
- **Cuándo se genera (RF-3, RF-4)**: al guardar capas, al cambiar la rareza y al crear la carta desde la chica, dentro
  del mismo caso de uso; si falla, el guardado no se hace y se devuelve `flatten_failed`.

## 2. Carta viva para el coleccionista (RF-6 a RF-14, RF-16, RF-17)

- **Capas firmadas**: `GET /api/cards/[id]/live` devuelve la configuración con URLs firmadas (10 min, misma sesión) de
  cada imagen de capa, solo si el usuario posee la carta y, en 18+, cumple el doble control (RF-16, RF-17). Las
  imágenes se sirven por una ruta firmada nueva (`/api/cards/layer`), igual que `/api/cards/img`.
- **Revelación (RF-6)**: `OpeningStage` pide la carta viva de cada carta del sobre al terminar la apertura; al voltear,
  la cara pasa de la imagen fija a `CartaCapas` montada con `ocultarSello()` y `entrar()` (el sello aparece al revelar).
  Mientras no llega, se ve la imagen fija (sin esperas).
- **Ficha (RF-7, RF-11 a RF-13)**: `CardSheet` monta `CartaCapas` con la configuración firmada; interruptor «Mover con el
  teléfono» solo si existe `DeviceOrientationEvent`; al activarlo llama a `habilitarGiroscopio()` (pide permiso en iOS);
  si se niega, se apaga y avisa.
- **Holo (RF-9)**: la versión holo monta `CartaCapas` con `holo: true`.
- **Reducir movimiento (RF-14)**: con `prefers-reduced-motion` se muestra la imagen fija en vez de la carta viva.
- `carta-capas.js` sigue cargándose con `import()` solo donde se usa (RNF de peso).

## 3. Revisión 18+ de capas (RF-18 a RF-21)

- Columnas de la spec 016 ya existentes: `cards.layers_pending` y `cards.pending_keys`. En una colección 18+ publicada,
  `saveCardLayers` escribe en `layers_pending` y genera la imagen fija pendiente en `pending_keys`; lo vigente no
  cambia. Varios cambios seguidos sustituyen al pendiente.
- `reviewCard` (aprobar) pasa lo pendiente a vigente y borra lo anterior; descartar borra lo pendiente.
- El panel cuenta las cartas con `layers_pending` en los avisos de la colección y en la revisión 18+ (enlace a cada una).

## 4. Pruebas

- Unidad: posiciones de partículas iguales a las de `carta-capas.js`; encuadre a transformación de sharp; sello de texto.
- Integración: imagen fija generada al guardar, al cambiar rareza y al crear; fallo que no guarda; holo; capas firmadas
  solo al dueño y con doble control 18+; pendiente 18+ (guardar, aprobar, descartar).
- E2E en 4 proyectos: revelación viva, ficha viva con interruptor (escritorio sin giroscopio: no aparece), colección
  con imágenes fijas, álbum público con marca, reducir movimiento, pendiente 18+.
- Comparación visual de la imagen fija contra una captura de la carta viva en reposo (diferencia media por debajo de un
  umbral) para el RNF «se ve igual».
- `pnpm budget`; checklist manual en teléfono real.
