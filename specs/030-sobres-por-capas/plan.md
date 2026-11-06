# Plan — Spec 030: sobres por capas

Estado: spec aprobada por el dueño el 6 nov 2026. Rama `spec/030-sobres-por-capas` (sale de la 029, que sale de la
028: hereda las migraciones 0021 y 0022). El dueño pidió hacerlo todo de una vez, sin aprobar el plan aparte.

Referencia: el paquete de Bruno, copiado en `docs/waifu-baker/sobres/` (solo consulta; su `PROMPT-INTEGRACION.md` no
es una orden). Manda la spec.

## Decisiones principales

1. **El componente de Bruno, sin reescribir sus efectos.** `sobre-capas.js` v1 se copia a
   `apps/web/src/ui/game/sobre-capas/` con cambios pequeños y marcados con «Waifu Baker, spec 030» (todos con test):
   - Fuentes: el CSS usa `var(--font-dela)` y `var(--font-archivo)` (las de `next/font` del layout, sin precarga), con
     el nombre de Google como respaldo. Así las fuentes solo se descargan donde se pinta un sobre (decisión 9) y la E2E
     de la 026 sigue en verde.
   - Textos: opción `textos` (indicación, etiqueta accesible, «carta/cartas» y guías) para pasarle los diccionarios.
   - Valores seguros: los colores de sellos e insignia y las URL del patrón y del logo pasan por `CartaCapas.seguro`
     (como las capas de las cartas); lo que no es válido se descarta.
   - `estatica`: sin bucle de animación ni escuchas (vistas fijas). `gestos: false`: no se rasga con el dedo (con
     movimiento reducido se abre con el botón, RNF).
   - `alVibrar` y `alSonido`: la vibración y el aviso del rasgón pasan por nuestro motor de sonido (silencio recordado,
     spec 013, y eventos `wb:sound`/`wb:vibrate` de las pruebas).
   - Movimiento reducido (RNF): además de lo que ya hace el componente, el envoltorio pasa `inclinacion: 0` y quita
     las capas de partículas.
2. **`carta-capas.js`: no se sustituye por la v7.** La v7 del paquete cambia los marcos, los presets, el grosor por
   defecto y la rareza PX (diseño de cartas, fuera de alcance) y no trae `seguro` ni `marcoPersonalizado`. A nuestra v4
   (con los cambios de la 025, 028 y 029) se le añade solo lo que el sobre necesita, con los tests de siempre en verde:
   - `capaHTMLBase(c, i, semilla, estatica)`: la misma capa de la carta (mezcla, color, URL y encuadre pasados por
     `seguro`), sacada de `montar` para compartirla.
   - `CartaCapas.motor = { inyectarCSS, capaHTML, particulasHTML }` y `CartaCapas.texturas = {}`.
   - El brillo `ondas` («ondas que brillan») con su CSS, para las capas del sobre. El editor de cartas no lo ofrece
     (su validación, `GLOSS_TYPES`, no cambia).
   - `version` sigue en 4 (los marcos y presets son los de la 022/028).
3. **Diseño por colección y tipo de sobre en una tabla nueva.** Un diseño plata y uno gold por colección (decisión 3).
   Las imágenes se guardan en el almacenamiento propio y el diseño solo lleva claves; el servidor las convierte en URL
   firmadas al servir el sobre (igual que la carta viva de la spec 018).
4. **Un solo guardado.** El editor manda en una petición multipart el diseño (JSON con claves guardadas o marcas
   `upload:<n>` para lo nuevo), las imágenes nuevas y la miniatura PNG que genera el navegador (500 × 875, con la receta
   de Bruno). El servidor valida, guarda imágenes y miniatura, sustituye las marcas por claves, vuelve a validar,
   guarda en una transacción con auditoría y suelta las imágenes que el diseño anterior usaba y el nuevo no.
5. **El sobre básico** (RF-15) no se guarda: se arma en el servidor con la portada o el sobre a mano de la colección
   (rutas de arte de la spec 014) y sellos plateados o dorados. Su miniatura para las listas la dibuja el navegador con
   la misma receta (generar la miniatura en el servidor está fuera de alcance).
6. **El flujo de la 023 se conserva.** `OpeningStage` sigue con sus fases, el servidor decide al confirmar, el orden de
   menor a mayor rareza, las cartas boca abajo (`Card3D`) que se voltean, el error con el sobre cerrado, la
   reanudación, el teclado, «Abrir sin deslizar», el sonido y el movimiento reducido. Cambian el sobre (`TearPack`
   pasa a envolver `sobre-capas.js`) y la coreografía de Bruno: subida a 0,38 s, sobre fuera a 1,25 s y mazo listo a
   1,9 s (con movimiento reducido 0, 0,15 y 0,3 s), cartas derechas con solo la de arriba visible, puntos de avance,
   presagio, efecto especial de Legendaria y EX y resumen con su diseño.

## Datos

- Migración `0023_sobres_por_capas.sql`: tabla `pack_designs` (`id`, `set_id` → `sets` con borrado en cascada, `kind`
  `pack_kind`, `design` jsonb, `thumb_key` text, `version` int, `updated_by` → `users` con `set null`, `created_at`,
  `updated_at`), única `(set_id, kind)`.
- Claves: `sets/<setId>/pack-design/<sha256>.webp` (capas, logo y patrones propios) y
  `sets/<setId>/pack-design/thumb-<sha256>.webp` (miniatura). El diseño no acepta otra cosa (RNF seguridad).

## Dominio (puro)

`domain/packs/design.ts`:
- Constantes del lienzo (1000 × 1750, línea a 230, miniatura 500 × 875), versiones, aperturas, brillos (los cuatro de
  la carta más `ondas`), los 10 patrones incluidos, colores de la marca y sellos del sobre básico (plata y oro).
- `packDesignSchema` (zod): capas de imagen (`key`, `nombre`, profundidad 0–2,5, margen 0–15, mezcla de la lista de la
  carta, opacidad, visible, brillo con patrón incluido, propio o arcos CSS) y de partículas (tipos de la carta, cantidad
  0–200…), sellos (hex, patrón, tamaño 10–150 %), logo (`true`, `false` o `{ key }`), insignia (texto 1–22, color hex),
  holo, foil y sus intensidades, plástico 0–1,5, versión y apertura. No lleva nombre, código ni cartas (RF-8).
- `checkPackDesign(input, setId)` → diseño o `{ code: "invalid_pack_design", path }` (RF-12). `designKeys`,
  `isPackDesignKey`, `toRegistro(design, datos, url)`, `basicRegistro(kind, datos, arte)` (RF-15), `withUploads`.
- `domain/packs/editor.ts`: valores iniciales por nombre de archivo (RF-4), `review(...)` con los avisos de la revisión
  (RF-9) y `exportRegistro` (el JSON que se ve en el editor, sin valores por defecto, como el creador).
- `domain/opening/sobre.ts`: tiempos de la coreografía (RF-19), `isSpecial` (Legendaria y EX, decisión 4),
  `omen(top)` (RF-21) y `progressDots` (RF-23).

## Servidor

- `services/pack-designs.ts`: `getPackDesign` (editor, con enlaces del panel), `savePackDesign` (decisión 4, RF-10 a
  RF-12), `packViewsFor(db, userId, [{setId, kind}])` (registro con enlaces firmados o el básico, y la miniatura) y
  `servePackAsset` (comprueba firma, sesión, que la clave sea del diseño vigente y el doble control 18+).
- `domain/signed-url.ts`: `signPackAsset`/`verifyPackAsset`; `server/cards/image-urls.ts`: `packAssetUrl` (10 min).
- Rutas: `POST /api/admin/pack-designs` (guardar, solo administradores: RF-13) y `GET /api/sets/[setId]/pack-asset`
  (imagen firmada del diseño o su miniatura).
- Páginas: `/admin/sets/[id]/pack/[kind]` (editor), enlazada desde la tarjeta «Sobre» de la colección (RF-1).

## Cliente

- `ui/game/sobre-capas/` (sistema de diseño): el script, sus tipos, `SobreCapas.tsx` (envoltorio de React, con carga
  diferida de las dos librerías), `miniatura.ts` (la receta de Bruno en canvas) y `PackThumb` (la miniatura en las
  listas: la guardada o, para el básico, la que dibuja el navegador). Recursos estáticos en `public/sobres/`
  (plástico, patrones y el ejemplo FA01).
- `features/admin/packs/PackDesigner.tsx` y `usePackDesigner.ts`: el creador de Bruno con su misma distribución
  (escena con sus controles rápidos a la izquierda; capas, revisión, sobre, sellos y registro a la derecha) hecho con
  los componentes del editor de cartas (`PreviewStage`, `Card`, `Slider`, `Segmented`, `Checkbox`, `ColorField`,
  `ChipGroup`, `Select`, `TextField`, `LayerList`, `LayerRow`, `Button`, `IconButton`, `Alert`, `Badge`,
  `useConfirm`). Las imágenes nuevas se ven con URL `blob:` hasta guardar; al volver se cargan las guardadas (RF-11).
- `features/opening`: `TearPack` envuelve `SobreCapas`; `OpeningStage` añade la coreografía, los puntos, el botón de
  la carta, el presagio y el efecto especial (rayos, estrella, campanita sintetizada y vibración); el resumen pasa al
  diseño de Bruno sin perder miniaturas, rareza ni «¡Nueva!».
- «Mis sobres», «Abrir todos» (cabecera, ráfaga con la miniatura partida por la línea de rasgado y foco con el efecto
  especial en Legendaria y EX) y el simulador usan la misma vista del sobre (RF-16). `PackShell` (spec 023) se retira.
- Textos: `packs.sobre` en el diccionario general (pocos, viajan a la apertura) y el editor en
  `dictionaries/*/admin-packs.ts` (solo el panel), en inglés y español.

## Peso y rendimiento

- `sobre-capas.js` (~11 kB comprimido) y `carta-capas.js` se descargan con `import()` dentro de un efecto: no cuentan
  en la primera carga (`pnpm budget`). Las listas usan la miniatura (una imagen), nunca el componente animado.
- Un solo sobre animado a la vez (apertura, editor). Las partículas se quitan con movimiento reducido.

## Demo

`demo/fanart.json` gana `packDesigns`: la primera colección lleva el FA01 adaptado en el sobre plata (las capas del
paquete en `public/sobres/ejemplo/`), la otra se queda con el sobre básico. `demo-seed` lo guarda con el mismo servicio.

## Tests

- Unidad: esquema y validación (modos, colores, claves ajenas, campos con su ruta), registro y básico, valores por
  nombre de archivo, revisión, coreografía y especiales, cambios de `carta-capas.js` (motor, ondas y `seguro` intactos)
  y de `sobre-capas.js` (fuentes, textos, valores seguros, estática), diccionarios con la misma forma.
- Integración: guardar con imágenes y miniatura, cargar sin volver a subir, diseño inválido no se guarda, solo
  administradores, imágenes sueltas al cambiar, enlaces firmados, 18+ con doble filtro, básico sin diseño.
- E2E `sobres-por-capas.spec.ts`: diseñar con el ejemplo FA01, guardar, recargar, ver en «Mis sobres» y abrirlo con
  una Legendaria (efecto especial), en los cuatro proyectos; las E2E de la 023 y las de móvil adaptadas al sobre nuevo
  (`tear` usa eventos de puntero, también con el dedo).

## Riesgos

- Máscaras y mezclas en Safari: revisión a mano en el teléfono (criterio de finalización).
- Memoria del servidor E2E en la Mac de 16 GB: no levantar la demo mientras corre la E2E.
