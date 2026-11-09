# Plan — Spec 034: la carta se ve igual que en el armador

## Punto de partida (9 nov 2026)
- Todas las pantallas usan `CartaCapas` (`ui/game/CartaCapas.tsx`, sobre `carta-capas.js`), pero cada una prepara la
  configuración a su manera:
  - **Armador** (`LayersEditor`, `previewConfig`):
    - pone a cada capa su encuadre completo (`encuadre: framingOf(l)`, con «contener» para la chica y «cubrir» para el
      resto);
    - pasa aparte la profundidad, la inclinación, el movimiento solo y la intensidad del holo (`view`), y el holo de la
      vista previa.
  - **Coleccionista** (`liveCardConfig`, usado en la apertura, «Abrir todos» y la ficha):
    - copia las capas sin calcular el encuadre que falta, así que `carta-capas.js` usa el suyo y la chica o el fondo
      quedan en otra posición;
    - devuelve `null` para las comunes (`isFlat`, spec 022), que se ven como imagen fija.
- La profundidad (14), la inclinación (14), el movimiento solo y la «Vista previa holo» son estado del armador: no se
  guardan (`useState` en `LayersEditor`).
- La apertura (`Card3D`) monta la carta viva encima de la imagen fija y la oculta al cargar. Deja de inclinarse al
  mostrar la viva, pero escucha el puntero solo sobre la carta (`zone` por defecto). En el armador se escucha sobre toda
  la vista previa.

## Diseño

### Una sola preparación de la carta (dominio)
- `domain/cards/final-card.ts` (nuevo, puro):
  - `VIEW_DEFAULTS = { profundidad: 14, inclinacion: 14, reposo: true }`.
  - `finalCardConfig(layers, src: (key) => string)` devuelve la `CartaConfig` que ve todo el mundo:
    - cada capa de imagen con `encuadre: framingOf(l)` y `src`, y el sello de imagen con `src`;
    - `holo`, `holoIntensidad`, `profundidad`, `inclinacion` y `reposo` con los guardados o los de fábrica (RF-14).
  - Lo usan:
    - la vista previa del armador (con `src` del panel);
    - las versiones (`VersionsPanel`);
    - `liveCardConfig` (con enlaces firmados).
  - Así, lo que se ve al guardar es lo que reciben las demás pantallas (RF-1 a RF-3, RF-5).
- `layersConfigSchema` añade `profundidad: num(0, 30)`, `inclinacion: num(0, 26)` y `reposo: z.boolean()`, los tres
  opcionales. `holo` ya existe (RF-12).

### Armador
- Los deslizadores «Profundidad» e «Inclinación» y la casilla «Movimiento solo» leen y escriben en `draft` (RF-12,
  RF-13). Cambiarlos marca la carta como cambiada: aviso al cerrar y borrador de la spec 027.
- «Vista previa holo» escribe `draft.holo`. Guardada activada, todas las copias se ven holo (RF-15). Hoy `draft.holo`
  ya existe y desactiva la casilla; ahora la casilla es ese mismo valor.
- La vista previa sigue sin remontarse al mover esos controles (pasan por `view`, como la intensidad del holo).
- El historial de versiones guarda la configuración entera, así que incluye los valores nuevos (RF-16).

### Coleccionista
- `liveCardConfig` deja de devolver `null` para las comunes (RF-9) y usa `finalCardConfig`. Los efectos del vínculo
  (`applyBondEffects`) se aplican encima, como hoy (RF-8).
- **Apertura** (`Card3D`):
  - `CartaCapas` recibe `zone` con la mesa de la apertura, como el armador con su vista previa (RF-1).
  - La carta sigue con la proporción 700 × 991 (RF-4) y conserva el volteo y la entrada (RF-6).
  - Mientras la carta viva no está montada, se ven la imagen fija y los brillos de `Card3D`. En cuanto carga se ocultan
    todos (regla `:has` actual), así que no queda brillo extra (RF-5).
- **«Abrir todos»** (`OpenAllFocus`) y la **ficha** (`CardSheet`) ya montan `CartaCapas` con `live.config`. Reciben la
  configuración de `finalCardConfig` (RF-2, RF-3). La ficha recibe también `zone` de su contenedor.
- **Copia holo** (RF-7): `holo = copia.holo || config.holo` (RF-15).

### Imagen fija (RF-10, RF-11)
- El aplanado del servidor (`flatten`) ya usa `framingOf`. Se comprueba con un test que el encuadre del aplanado y el
  de `finalCardConfig` sean el mismo para cada capa.

### Comprobar que es la misma
- `CartaCapas` publica `data-config-sig`, una firma de la configuración sin las URL: `src` se cambia por la clave o el
  nombre del archivo.
- La E2E compara la firma en el armador, la apertura, «Abrir todos» y la ficha. La de la ficha y la apertura pueden
  llevar el vínculo si el coleccionista tiene nivel; en la E2E es nivel 1.

## Pruebas
- **Unidad** (`final-card.test.ts`):
  - encuadre por defecto en cada capa;
  - valores de fábrica para cartas antiguas;
  - los guardados se respetan;
  - `holo` guardado;
  - la firma no depende de las URL (RF-1 a RF-5, RF-12, RF-14, RF-15).
- **Unidad:** el esquema acepta y limita `profundidad`, `inclinacion` y `reposo`.
- **Integración:**
  - `liveCardConfig` de una común ya no es `null`;
  - devuelve la profundidad y la inclinación guardadas;
  - guardar desde el armador las conserva en la carta y en su versión (RF-9, RF-12, RF-16).
- **E2E** (`e2e/carta-igual-al-armador.spec.ts`):
  1. Una colección con una común y una rara.
  2. En el armador se cambian la profundidad, la inclinación y el holo, y se guarda.
  3. Al reabrirla salen los valores guardados.
  4. Se regala un sobre y se abre: la firma de la carta volteada es la del armador, también la de la común.
  5. La ficha en «Mi colección» y «Abrir todos» tienen la misma firma.
  6. No hay capas de brillo de `Card3D` visibles con la carta viva cargada.
- Capturas lado a lado (armador y apertura) en `test-results/screens/s034-*` para la revisión del dueño.

## Riesgos
- **Rendimiento:** con las comunes vivas, un sobre de cinco cartas monta hasta cinco cartas vivas. La apertura ya monta
  la viva solo de la carta de arriba y de la siguiente (`preloadLive`); se mantiene así.
- **Peso:** `final-card.ts` es pequeño y no añade dependencias. La apertura sigue dentro de 250 kB.
