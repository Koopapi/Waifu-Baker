# Plan — Spec 033: filtros, búsqueda y orden de las cartas de una colección

## Punto de partida (9 nov 2026)
- `CardWorkspace` recibe `CardTileDTO[]` (spec 031). La tesela tiene `characterName`, pero no `characterId` ni si la
  carta está armada: «sin armar» se calcula en la página con `missingParts(layers)` y las capas no llegan a la
  cuadrícula.
- La selección usa los índices de `cards` (con Mayús se seleccionan rangos). «Reordenar» activa `sorting` y arrastra
  sobre `order`.
- `ChipGroup` del sistema de diseño es de una sola opción (radio). No hay fichas de varias opciones.
- Peso de la página: 258,6 kB de 260 (spec 031). Lo nuevo tiene que ser ligero: nada de dependencias nuevas.

## Diseño

### Datos de la tesela
- `TILE_FIELDS` suma `characterId`.
- `CardTileDTO` suma `assembled: boolean`, que `toCardTile` calcula con `missingParts(c.layers)` en el servidor (RF-3).
  Así la cuadrícula sabe si la carta está armada sin recibir sus capas.

### Dominio (`domain/cards/card-filters.ts`, nuevo, puro)
- `type CardFilters = { characters: string[]; rarities: Rarity[]; pending: PendingKind[]; q: string; sort: "number" |
  "rarity" | "name" }`.
  - `characters` admite el id `"none"` para «Sin personaje».
  - `PendingKind = "unassembled" | "processing" | "layers_review" | "adult_review"`.
- `pendingOf(tile, isAdultSet)` devuelve los pendientes de una carta:
  - **procesando:** `status !== "ready"`;
  - **sin armar:** `!assembled`;
  - **capas por revisar:** `pendingLayersUrl`;
  - **18+ sin revisar:** solo en 18+, sin `adultReviewedAt` o con arte o capas pendientes. Es la misma regla que el
    aviso de la página.
- `matches(tile, f, isAdultSet)`: dentro de un grupo vale cualquiera de las opciones (RF-5) y entre grupos se exigen
  todos (RF-6).
- `matchesQuery(tile, q)`: sin mayúsculas ni acentos (`normalize("NFD")`), con el nombre conteniendo el texto. Si el
  texto son solo dígitos, también vale el número (`Number(q) === number`, de modo que «12» y «012» encuentran la 012)
  (RF-7).
- `sortTiles(tiles, sort)` (RF-10, RF-11):
  - **por número;**
  - **por rareza:** de EX a Común y, dentro de cada una, por número;
  - **por nombre:** con `localeCompare` sin acentos ni mayúsculas; las cartas sin nombre van al final, por número.
- `optionCounts(tiles, isAdultSet)`: recuentos por personaje, rareza y pendiente, sobre la colección entera (RF-4).
- `isFiltered(f)`: hay filtros puestos o búsqueda; el orden no cuenta como filtro (RF-8).
- `parseFilters(params, { characterIds, isAdultSet })` y `filtersToParams(f)`:
  - Parámetros `character`, `rarity`, `pending` (separados por comas), `q` y `sort`.
  - Lo que no exista en la colección se ignora (RF-18).
  - Los valores por defecto no se escriben, así una dirección sin filtros queda limpia (RF-19).

### Componente del sistema de diseño
- `ui/form/ToggleChips.tsx` (nuevo): fichas de varias opciones.
  - Cada una es un `button` con `aria-pressed`, con un número opcional, dentro de un `role="group"` etiquetado.
  - Mismo aspecto que `ChipGroup`.
  - Se exporta en `ui/form/index.ts` y se añade al catálogo `/design-system`.

### Cuadrícula
- `features/admin/cards/CardFilters.tsx` (nuevo): la barra de filtros sobre la cuadrícula.
  - Fichas de personaje, rareza y pendientes con su número; la de «18+ sin revisar», solo en 18+ (RF-1 a RF-4).
  - `TextField` de búsqueda y `Select` de orden.
  - El contador «8 de 32» con `aria-live="polite"` y «Quitar filtros» (RF-8).
  - En pantallas estrechas, un botón «Filtros (n)» despliega la barra (RNF).
- `CardWorkspace`:
  - Lee los filtros iniciales de `useSearchParams` (RF-17) y calcula `visible = sortTiles(tiles.filter(matches))` con
    `useMemo` (RNF de menos de 100 ms y sin servidor).
  - Al cambiar, escribe la dirección con `window.history.replaceState` (RF-16). Next 15 lo sincroniza con
    `useSearchParams` sin recargar los datos ni añadir entradas al historial.
  - **Selección:**
    - el rango con Mayús usa los índices de `visible`;
    - «Seleccionar todas» selecciona `visible` y dice cuántas (RF-12);
    - un efecto quita de la selección lo que deja de verse (RF-13).
  - **«Reordenar»:** limpia los filtros y el orden antes de activar `sorting` (RF-14).
  - **Al guardar o aplicar un cambio en bloque:** `router.refresh()` trae teselas nuevas, que se filtran con los mismos
    filtros (RF-15).
  - Si no se ve ninguna carta, `EmptyState` con «Quitar filtros» (RF-9).
- Textos en `admin.cards.filters` (es y en).

## Pruebas
- **Unidad** (`card-filters.test.ts`):
  - personaje con «Sin personaje»; rareza; pendientes en colecciones normales y 18+;
  - cualquiera dentro de un grupo y todos entre grupos;
  - búsqueda (acentos, mayúsculas, «12» y «012», espacios);
  - los tres órdenes con empates y cartas sin nombre;
  - recuentos;
  - leer y escribir la dirección, ignorando lo desconocido (RF-1 a RF-11, RF-16 a RF-19).
- **Unidad** (`dto.test.ts`): `assembled` y `characterId` en la tesela.
- **Componente** (`ToggleChips`): `aria-pressed`, número y etiqueta del grupo.
- **E2E** (`e2e/filtros-de-cartas.spec.ts`), con una colección de 4 cartas, dos personajes y una sin armar:
  - filtrar por personaje y por rareza con el contador;
  - buscar «002»;
  - sin resultados y «Quitar filtros»;
  - ordenar por rareza;
  - el pendiente «sin armar»;
  - seleccionar las visibles y cambiarlas en bloque, con el filtro que se mantiene;
  - recargar con los filtros en la dirección;
  - entrar desde «Sets» sin filtros;
  - «Reordenar» quita los filtros.
- `pnpm budget` tras el build.

## Presupuesto (medido el 9 nov 2026)
Con los filtros y la zona de peligro de la 032, la página llegó a 263,2 kB (de 260). Se resolvió cargando al usarlo:
- el aviso de eliminar (032) al pulsar «Eliminar colección» (262,4 kB);
- el modo «Reordenar» con `@dnd-kit` (`SortableGrid.tsx`) al pulsar «Reordenar». La tarjeta pasa a `CardTile.tsx`,
  sin código de arrastre: **247,9 kB**, con 12 kB de margen.

## Riesgos
- **Presupuesto (previsto antes de medir):** quedan 1,4 kB. Si se pasa, `CardFilters` se carga con `import()` tras la primera pintura de la
  cuadrícula (las fichas no se necesitan para ver las cartas) y se avisa al dueño.
- **`replaceState`:** el refresco del servidor (`router.refresh()`) mantiene la dirección actual, así que los filtros
  no se pierden.
