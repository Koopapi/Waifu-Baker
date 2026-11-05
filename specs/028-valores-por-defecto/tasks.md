# Tareas — Spec 028

- [x] T0 Spec aprobada por el dueño (5 nov 2026: EX a 20 sobres gold, sello de imagen sin cambios, ajustes en el panel,
  cartas de portada).
- [x] T1 Dominio de cartas: `card-defaults.ts` (15 y 3,0, rangos), `applyTierStyle`/`retierLayers`/`settleAutoStyle`/
  `configFromCharacter` con `defaults`, `parseCreatorConfig` que rellena lo que falta. RF-1, RF-2, RF-3, RF-5.
  Hecho cuando: tests de unidad `test_s028_rf1/2/3/5_*` en verde y los de 016/017/025 ajustados.
- [x] T2 Carta viva y editor: `carta-capas.js` usa 3,0 sin borde guardado; el deslizador del editor también; el sello de
  texto nuevo del editor y «Aplicar estilo» con los valores recibidos por props. RF-4, RF-7.
  Hecho cuando: test de `carta-capas` y typecheck en verde.
- [x] T3 Probabilidades de fábrica y «al menos una»: tablas de RF-8 y RF-9, `validateOddsTables`, `pack-chances.ts`,
  garantía de EX en `draw.ts`/`pity.ts`. RF-8, RF-9, RF-11, RF-12, RF-13, RF-16.
  Hecho cuando: tests de unidad con los números de la spec (0,20 %, 9,5 %, 5,9 %, 43 %) en verde.
- [x] T4 Migración `0021`: columnas `ex_pity_threshold` y `packs_since_ex`, relleno del borde de las cartas guardadas.
  RF-6, RF-10. Hecho cuando: test de integración del relleno en verde y la migración aplica en limpio.
- [x] T5 Ajustes en el servidor: `settings.ts` (valores de cartas, tablas, garantías, cartas de portada) con
  validación y auditoría; errores en `panel-errors.ts`. RF-15 a RF-17, RF-19, RF-20.
  Hecho cuando: tests de integración de cada `set…` y su auditoría en verde.
- [x] T6 Servicios que usan los ajustes: `createSet`/`updateSet`/`saveOdds`, apertura con garantía de EX, creación y
  re-estilo de cartas, semillas de demo y desarrollo. RF-1 a RF-3, RF-8 a RF-10, RF-12 a RF-14, RF-18.
  Hecho cuando: tests de integración de crear carta, cambiar rareza, colección nueva y 20 sobres gold en verde.
- [x] T7 Portada: `CardFan` en `ui/game` (y la demo lo usa), `publicCoverCards`, `GET /api/cover/[id]`, portada
  pública con el abanico; fila en `docs/DESIGN.md`. RF-21 a RF-23. Hecho cuando: test de `CardFan`, integración de
  cartas válidas/inválidas y `pencil-map` en verde.
- [x] T8 Panel `/admin/settings`: formularios de cartas nuevas, probabilidades, garantías y cartas de portada; textos
  en `i18n/admin-defaults.ts` (inglés y español); umbral de EX en el editor de probabilidades del gold. RF-15 a RF-17,
  RF-20. Hecho cuando: typecheck, lint y test del diccionario en verde.
- [x] T9 `/drop-rates`: «al menos una por sobre» y garantía de EX. RF-11, RF-14. Hecho cuando: test de integración o
  E2E lo comprueba.
- [x] T10 E2E `defaults.spec.ts` (4 proyectos), rutas en `e2e/warm.ts`, suite completa (`typecheck`, `lint`, `test`,
  `budget`, `e2e`), `validation.md`, `docs/roadmap.md`, `docs/reglas-de-negocio.md`. (5 nov 2026: por cambio de
  instrucciones del dueño, aquí corren `typecheck`, `lint` y `test`; `build`, `budget` y la E2E completa se lanzan una
  vez desde la rama 029, que incluye esta, y quedan en `/Volumes/KoopaDev/wb-029/e2e-resultado.log`.)
