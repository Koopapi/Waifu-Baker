# Plan — Spec 029: vínculo de personaje y reciclaje de repetidas

Estado: spec aprobada por el dueño el 5 nov 2026 (decisiones en `docs/vinculo-y-reciclaje.md`, sección 5). Rama
`spec/029-vinculo-y-reciclaje`, sale de `spec/028-valores-por-defecto` terminada. Sin maqueta (el dueño está fuera):
los componentes nuevos usan los tokens del sistema y quedan como pendientes de Pencil. Sin dependencias nuevas.

## Decisiones (tomadas sin el dueño; ver «Supuestos»)

1. **Barra única.** El vínculo de la spec 020 (`character_bonds.xp`, `BOND_THRESHOLDS`, `bondLevel`, +2 % de poder por
   nivel en `cardPower`) es la única barra. Reciclar suma puntos a la misma `xp`; las expediciones siguen igual (RF-8).
2. **Reglas puras** en `domain/bonds/`:
   - `settings.ts`: valores de fábrica (puntos 10/25/60/150/400, polvo 5/15/40/120/300, holo × 1,5, fabricar
     100/300/800/2500, títulos en los niveles 2, 3, 5, 7 y 10), esquema zod y lectura con vuelta a fábrica.
   - `recycle.ts`: `recyclableCopies(qty)` (todas menos una por versión, RF-1), `planRecycle(items, xp, settings)`
     copia a copia: mientras el nivel no sea el 10, suma los puntos y la mitad del polvo; en el 10, el polvo completo y
     ningún punto (RF-2, RF-3). El polvo fraccionario se acumula y se redondea hacia abajo al final.
   - `effects.ts`: `bondEffects(level)` (nivel 3 destello, 5 holo, 7 marco de vínculo y partículas, 10 maestría),
     `nextUnlock(level)`, `bondTitle(level, titles)` y `applyBondEffects(config, level)` sobre la configuración viva: el
     brillo «destello» en la chica (si no tiene otro), `holo: true` (solo visual: el poder no cambia, RF-10), marco
     personalizado con los colores del vínculo y una capa de partículas «corazones» detrás de la chica (RF-9 a RF-11).
   - `craft.ts`: `craftProblem(...)` → `ex`, `monthly`, `unpublished`, `adult`, `dust` o `null` (RF-18 a RF-20).
   - `simulate.ts`: días hasta el nivel 10 con el valor esperado de copias por día de cada carta del personaje según las
     tablas publicadas (plata y gold), los sobres al mes y las expediciones al día (RF-23).
3. **Polvo**: columna `user_rewards.dust` (≥ 0), junto a las galletas (RF-17). Se muestra en el pie de la barra con
   las galletas. Se borra con la cuenta (y el vínculo también, caso límite).
4. **Reciclar y fabricar** (`server/services/bonds.ts`) en una transacción con `SELECT … FOR UPDATE` de la fila de
   recompensas, de las filas de `user_cards` y del vínculo; la cantidad se vuelve a leer bloqueada, así dos peticiones a
   la vez reciclan solo lo que queda (RF-6). Cada una deja su auditoría (`bond_recycle`, `bond_craft`) (RF-7, RF-21).
   Una carta sin personaje no se recicla. Colección archivada: se recicla, no se fabrica. 18+: solo con el doble filtro.
5. **Vista previa** (RF-4): `previewRecycle` calcula en el servidor lo mismo sin escribir; la página la pide antes de
   la confirmación (la interfaz no calcula resultados).
6. **Efectos visibles** (RF-9 a RF-13): `liveCardConfig` aplica `applyBondEffects` con el nivel del dueño; la ficha
   enciende el holo visual de las comunes planas en el nivel 5 y la insignia de maestría junto al nombre en el 10; el
   álbum público muestra la insignia en el 10. Las imágenes públicas con marca de agua no cambian.
7. **Línea de personaje** (RF-15, RF-16): página `/collection/character/[id]` con sus cartas (las que tiene y las que
   faltan, de las colecciones que puede ver), la barra, el título, lo que desbloquea el siguiente nivel, las repetidas
   (reciclar una versión o todas) y «Fabricar» por carta. Se llega desde la ficha de la carta. Nada por completarla.
8. **Panel** (RF-22, RF-23): tarjeta «Vínculo y reciclaje» en `/admin/settings` con puntos, polvo, factor holo,
   costes y títulos (auditoría `settings.bond_settings`) y un simulador por colección publicada y personaje.
9. **Componentes nuevos**: `BondBar` (barra con nivel, título y puntos), `CardLine` (fila de cartas que tiene/faltan) y
   `GainSummary` (resumen de lo que se gana, dentro de la confirmación). Filas en `docs/DESIGN.md`, pendientes de Pencil.

## Datos

- Migración `0022_vinculo_y_reciclaje.sql`: `user_rewards.dust integer not null default 0` con su `check >= 0`.

## Tests

- Unidad: ajustes, `planRecycle` (puntos, mitad del polvo, holo, nivel máximo, cruce al 10), `recyclableCopies`,
  `bondEffects`/`applyBondEffects`, `craftProblem`, simulador, componentes y diccionarios.
- Integración: reciclar (RF-1 a RF-3, RF-5, RF-7), concurrencia (dos reciclajes a la vez, RF-6), expediciones y reciclaje
  en la misma barra (RF-8), carta viva con efectos solo del dueño (RF-9 a RF-13), línea (RF-15, RF-16), fabricar y sus
  motivos (RF-18 a RF-21), concurrencia de fabricar, ajustes con auditoría (RF-22), simulador (RF-23), baja de cuenta.
- E2E `vinculo.spec.ts`: reciclar → subir de nivel → ver el efecto → fabricar (se corre en la verificación larga final).

## Supuestos

- «Carta del mes» aún no existe (llega con los tiers, spec 032): la regla está en el dominio (`monthly`) y hoy ninguna
  carta lo es.
- Títulos: un texto por hito (2, 3, 5, 7, 10) que el administrador puede cambiar y vale en los dos idiomas; sin
  cambiar, cada idioma usa el suyo. El nivel 1 no tiene título.
- Simulador: el personaje tiene en cuenta solo sus cartas de la colección elegida; un coleccionista gratuito abre
  64 sobres al mes (60 plata y 4 gold, cifras de la spec 028) y hace 2 expediciones de 8 h al día con ese personaje; un
  patron, 8 sobres plata más al mes (regla de tier por defecto, RN-223) y 3 expediciones.
- El marco de vínculo es el marco personalizado con dos colores fijos del vínculo (rosa y oro), que carta-capas ya pinta.
