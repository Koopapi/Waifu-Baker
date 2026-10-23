# Plan 017 — Armado de cartas por capas

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Parte de la spec 016 (editor, dominio de capas,
subida al área temporal, guardado con versión, `carta-capas.js` con listas cerradas). Primero las maquetas en Pencil;
después el código.

## 1. Modelo de datos

- **Configuración por capas** (jsonb `cards.layers`, formato del creador de Bruno), campos nuevos, todos opcionales
  para no romper lo que ya existe:
  - en cada capa de imagen: `rol` (`personaje` | `fondo` | `extra`) y `encuadre`
    `{ x, y, escala, giro, ajuste }` (x e y en % del lienzo entre −100 y 100; escala 0,1 a 4; giro −180 a 180;
    `ajuste` `cubrir` para fondos y `contener` para el personaje, que puede tener cualquier proporción);
  - en la configuración: `estiloAuto` (true mientras el sistema pone marco, partículas y sello).
- **Migración `0012_set_backgrounds`**: tabla `set_backgrounds` (`id`, `set_id`, `key`, `sha256`, `name`,
  `created_at`), única por `set_id` + `sha256`. La imagen vive en `sets/<setId>/backgrounds/<sha>.webp`. Un fondo está
  «en uso» si su clave aparece en la configuración de alguna carta de la colección.
- Las cartas siguen guardando `original_key` (la imagen de la chica tal cual se subió) para poder sustituirla y para la
  imagen provisional del coleccionista hasta la spec 018.

## 2. Módulos

| Módulo | Qué hace | RF |
|---|---|---|
| `domain/cards/layers.ts` | Esquema: `rol`, `encuadre` con sus límites, `estiloAuto`; `isAssembled` (personaje y fondo visibles); no quitar el personaje | RF-5, RF-10, RF-11, RF-15 |
| `domain/cards/layers-rarity.ts` | `retierLayers`: con `estiloAuto`, estilo completo del escalón nuevo; sin él, la spec 016 RF-25 | RF-13, RF-14 |
| `domain/cards/layers-io.ts` | Exportar e importar el formato del creador (claves ↔ nombres de archivo, encuadre incluido; mezclas no ofrecidas a normal con aviso) | RF-17 a RF-19 |
| `ui/game/carta-capas/carta-capas.js` | Encuadre por capa: `transform` en la imagen (no en la capa, que lleva el parallax) y `object-fit` según `ajuste` | RF-12 |
| `server/cards/character-images.ts` | Valida la imagen de la chica (PNG/WebP, ≤ 20 MB, ≥ 991 px de alto), la guarda en WebP con su proporción (alto máximo 1982 px) en el área temporal de capas y detecta si no tiene transparencia (`sharp().stats()`) | RF-2, RF-3 |
| `server/services/cards.ts` y `card-layers.ts` | La subida crea la carta con la chica como personaje y estilo automático (`configFromCharacter`); sustituirla conserva el encuadre (`replaceCharacter`); `exportCardLayers` arma el ZIP del creador (`server/zip.ts`, sin compresión y sin dependencias) | RF-1, RF-4, RF-17 |
| `server/services/set-backgrounds.ts` + API | Subir, listar y quitar fondos de la biblioteca; no se quita si está en uso | RF-6, RF-7, RF-9 |
| `server/services/collections.ts` (`publishSet`) | Nueva comprobación: todas las cartas armadas, con la lista de las que faltan | RF-15, RF-16 |
| `features/admin/cards/LayersEditor.tsx` | Elegir fondo (biblioteca o propio), encuadre arrastrando sobre la vista previa, controles numéricos y teclado, restablecer; marca `estiloAuto=false` al tocar marco, partículas o sello; exportar e importar | RF-8, RF-10, RF-11, RF-14, RF-17, RF-18 |
| `features/admin/sets/BackgroundsLibrary.tsx` | Biblioteca de fondos de la colección en su página del panel | RF-6, RF-9 |
| Subida del panel (`/api/admin/uploads`) | Las imágenes subidas crean cartas por capas (RF-1); aviso de «sin recortar» | RF-1 a RF-3 |
| `server/services/demo-seed.ts`, `dev-seed.ts`, `e2e/helpers.ts` | Cartas de demo y de prueba armadas (Yuki recortada; fan art completo sobre un fondo de la biblioteca) | RF-20 |
| `i18n/admin-layers.ts` | Textos nuevos (fuera del diccionario general) | RNF |

## 3. Decisiones

- **El encuadre va en la imagen, no en la capa**: la capa (`.cc-capa`) ya recibe el `translate3d` del parallax; el
  encuadre se aplica a su `<img>` con `translate(x%, y%) scale() rotate()`, así se suman sin pisarse.
- **Personaje con `contener`**: el recorte de la chica puede tener cualquier proporción, así que no se le aplica la
  regla del lienzo de la spec 016 (sí a los fondos); se dibuja entero y el administrador lo escala.
- **«Sin recortar»** = ningún píxel con alfa por debajo de 250. Es un aviso, no un rechazo.
- **Imagen provisional del coleccionista**: hasta la spec 018 se sigue componiendo con el marco de Pencil a partir de la
  imagen original, como hoy; el proyecto no está en producción y la 018 la sustituye por la imagen plana.
- **Biblioteca sin tabla de uso**: como en la spec 016, «en uso» se calcula recorriendo las configuraciones de la
  colección (pocas cartas por colección).

## 4. Pruebas

- Unidad: esquema del encuadre y sus límites, `isAssembled`, estilo automático, exportar/importar, detección de
  transparencia (con imágenes generadas con y sin alfa).
- Integración: crear carta desde la chica, sustituirla conservando el encuadre, biblioteca (subir, en uso, quitar),
  publicar con y sin cartas armadas, crear desde capas, importar con errores.
- E2E en escritorio según los criterios de la spec; `pnpm budget`.

## 5. Ampliación: biblioteca general de elementos (RF-6 a RF-9 y RF-21)

- **Migración `0013_library_items`**: tabla `library_items` (`id`, `kind` `fondo` | `sello` | `adorno` | `particulas`,
  `name`, `key` y `sha256` para las imágenes, `particles` jsonb para las partículas, `created_at`), con `sha256` único
  cuando hay imagen. Copia los fondos de `set_backgrounds` como `fondo` (misma clave, sin duplicar por huella) y borra
  esa tabla. Las imágenes nuevas viven en `library/<sha>.webp`.
- **Qué clave es de la biblioteca**: la que está en `library_items` (consulta a la base al guardar una carta), así valen
  también las claves de los fondos que ya existían. `releaseLayerImages` nunca borra una clave de la biblioteca.
- **Uso (RF-9)**: se recorren las configuraciones de todas las cartas (vigente y pendiente) y se cuentan cartas y
  colecciones por clave. Las partículas guardadas se copian a la carta: no tienen uso.
- **Guardar desde una carta (RF-21)**: se lee la imagen de la capa o del sello (de la colección o del área temporal) y
  se guarda como `library/<sha>.webp`; la carta no cambia. Una huella repetida avisa con el nombre del que ya está.

| Módulo | Qué hace | RF |
|---|---|---|
| `domain/cards/library.ts` | Tipos de elemento, reglas de imagen por tipo (lienzo o sello) y partículas guardadas (sin semilla ni orden) | RF-6, RF-7 |
| `server/services/library.ts` | Subir, guardar partículas, guardar desde una carta, listar con uso, renombrar, quitar; `ensureLibraryImage` para la siembra | RF-6, RF-7, RF-9, RF-21 |
| `app/api/admin/library/route.ts` + `app/admin/library/` | Subida (multipart), acciones del panel y página «Biblioteca» con pestañas por tipo; enlace en el menú del panel | RF-6, RF-9 |
| `features/admin/library/LibraryPage.tsx`, `LibraryPicker.tsx` | Página de la biblioteca y ventana «Añadir de la biblioteca» (filtros, buscador, varias a la vez) | RF-6, RF-8 |
| `features/admin/cards/LayersEditor.tsx` | Fondo y sello de la biblioteca, adornos y partículas desde la ventana, «Guardar en la biblioteca» | RF-8, RF-21 |
| `server/services/dev-seed.ts`, `demo-seed.ts` | El fondo de prueba sale de la biblioteca (uno para todas las colecciones) | RF-20 |
