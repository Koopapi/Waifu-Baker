# Plan — Spec 031: carga diferida en la página de una colección del panel

## Punto de partida (medido el 8 nov 2026)
- `/admin/sets/[id]`: 393 kB de primera carga según `next build`; `/admin/sets`, 223 kB.
- La página importa de forma estática `CardWorkspace.tsx`, que trae `CardEditor` (en el mismo archivo), y este
  `LayersEditor` (983 líneas, con `CartaCapas`), `CardPreview` (`Card3D` y `opening.css`), `VersionsPanel` y
  `useCardDraft`.
- Cada carta llega al cliente como `CardDTO` completo, con `layers` (la configuración de capas, o el cambio pendiente).
- `listLibrary(db)` lee todas las filas de la biblioteca y además `libraryUses(db)`, que lee `cards.layers` de todas
  las colecciones. La página solo usa `id, kind, name, key, particles`.
- Ya existe `GET /api/admin/cards/[id]`, que devuelve la carta completa (`toCardDTO`). La usa «Recargar» del editor.

## Diseño

### Servidor
- `domain/cards/tile.ts` (nuevo): `CardTileDTO`, lo que necesita la cuadrícula. Es `CardDTO` sin `layers`, `fullUrl`,
  `midUrl`, `flavorText` ni `hasOriginal`, más `assembled: boolean`, calculado en el servidor con `missingParts`.
  `toCardTile(dto)` es una función pura que se prueba con Vitest (RF-2).
- `server/services/library.ts`: nueva `listLibraryEntries(db)`, que solo consulta `library_items`, sin
  `libraryUses` (RF-4). `listLibrary` sigue igual para `/admin/library`.
- `GET /api/admin/library` (nuevo handler en la ruta existente): devuelve las entradas con su URL firmada, solo para
  administradores (RF-3, RF-9). Usa `listLibraryEntries` y `assetUrl`, igual que hacía la página.
- `app/admin/sets/[id]/page.tsx`: deja de llamar a `listLibrary`; pasa `CardTileDTO[]` a `CardWorkspace`. Los avisos
  (sin armar, cambios pendientes, sin revisar) se siguen calculando en el servidor con los datos completos, antes de
  convertir a teselas (RF-13).

### Cliente
- `features/admin/cards/CardEditor.tsx` (nuevo): el `CardEditor` actual, movido tal cual desde `CardWorkspace.tsx`,
  con su `Modal`. Recibe la carta completa y la biblioteca.
- `features/admin/cards/CardEditorLoader.tsx` (nuevo):
  - Abre al instante el mismo `Modal`, con la miniatura y un `Spinner` (RF-8).
  - En paralelo:
    - importa `CardEditor` con `import()`, que solo descarga el código la primera vez;
    - pide `GET /api/admin/cards/[id]` con un `AbortController`;
    - pide la biblioteca con una promesa guardada en el módulo, que se pide una vez por visita y se olvida si falla
      (RF-10).
  - Cuando todo llega, muestra `CardEditor` con la carta y la biblioteca, y pasa el `chance` de la tesela (RF-9).
  - Si algo falla, muestra un `Alert` con «Reintentar» dentro de la ventana (RF-11).
  - Al cerrar se cancela la petición y se ignoran las respuestas tardías (RF-12). Si abres otra carta mientras carga,
    el `key` del cargador cambia y solo cuenta la última.
- `CardWorkspace.tsx`: trabaja con `CardTileDTO`, abre `CardEditorLoader`, y sus miniaturas llevan `loading="lazy"`
  y `decoding="async"` (RF-6). La selección, los cambios en bloque, reordenar y la revisión siguen igual (RF-13).
- `known` (la versión más reciente tras guardar) se mantiene. El cargador pide siempre la carta actual, así que
  `latest()` solo sirve para la versión de los cambios en bloque.

### Presupuesto
- `lib/bundle-budget.ts`: lista `ADMIN_BUDGET_PAGES = [{ page: "/admin/sets/[id]/page", limitKb: 260 }]`. El script
  mide las dos listas, cada página con su límite, y falla con el exceso en kB (RF-16, RF-17). `pnpm budget` ya corre
  en la CI tras el build.
- Si sacar el editor no basta para bajar a 260 kB, se revisa el resto de la página (por ejemplo `@dnd-kit` o
  `OddsEditor`). Si ni así se llega, se avisa al dueño antes de subir el límite.

### Textos
- `i18n` (`admin.cards`): `editorLoading` («Cargando el editor…» / «Loading the editor…»), `editorLoadError`
  («No se pudo cargar la carta.» / «The card could not be loaded.») y `retry` («Reintentar» / «Retry»), si no
  existe uno común.

## Pruebas
- **Vitest (unidad):**
  - `toCardTile` no lleva `layers` ni URLs grandes, y `assembled` refleja `missingParts` (RF-2, RF-13).
  - Presupuesto con límites por página (RF-16, RF-17).
- **Vitest (integración, BD de test):**
  - `listLibraryEntries` devuelve las entradas sin consultar `cards`: se prueba con dos colecciones con capas y se
    comprueba que el resultado no depende de ellas (RF-4).
  - `GET /api/admin/library` responde 404 sin administrador y 200 con él (RF-3, seguridad).
- **E2E** (`e2e/carga-diferida.spec.ts`):
  - Entrar a la colección: la cuadrícula se ve, y el HTML y el RSC no contienen la configuración de capas ni la
    biblioteca. Se busca una clave de capa conocida en la respuesta (RF-1 a RF-3).
  - Las miniaturas llevan `loading="lazy"` (RF-6).
  - Abrir una carta: la ventana sale con la miniatura y el indicador; después, el editor (RF-8, RF-9).
  - Abrir otra: no se descarga otra vez el código del editor. Se cuentan las peticiones a los chunks (RF-10).
  - Error simulado con `page.route` a `/api/admin/cards/*` con fallo una vez: sale el aviso, «Reintentar» lo arregla
    (RF-11).
  - Cerrar mientras carga, con la respuesta retenida: no salen avisos (RF-12).
  - Guardar y ver la miniatura nueva en la cuadrícula (RF-14).
- Las E2E existentes que abren el editor (`defaults`, `layers-*`, `guardado`, `admin-panel`, etc.) siguen pasando: el
  editor se abre igual, solo tarda un momento. Usan `expect(...).toBeVisible()`, que espera.
- RF-5 lo cubre el PR #43. Se comprueba en el build de producción con el mismo script de clics del diagnóstico.

## Riesgos
- Los 260 kB son una estimación. Se mide tras el primer paso (sacar el editor) antes de seguir.
- `CardDefaultsContext` lo usa el editor: el `Provider` queda en `CardWorkspace`, y el editor cargado lo hereda.
- El borrador de la spec 027 se lee al montar `CardEditor` y no cambia, porque se monta igual que antes, solo que más
  tarde.
