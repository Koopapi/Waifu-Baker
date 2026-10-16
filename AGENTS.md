# AGENTS.md — Waifu Baker TCG

## Proyecto
Cartas coleccionables digitales de estilo anime (no jugables) con apertura de sobres
interactiva y colección persistente por usuario. Patreon cobra, gestiona tiers y verifica
18+; esta web abre los sobres, guarda la colección y publica el álbum. Monorepo pnpm:
`apps/web` (Next.js 15 + TypeScript + Tailwind + GSAP), `packages/shared` (tipos, drop
tables), `packages/cards-build` (arte → cartas), `infra/` (Docker Compose, Caddy).
PostgreSQL 16 y Redis 7. El taller de arte vive fuera del repo, en `ART_DIR`
(`/Users/koopa/Documents/Waifu Baker`), y `cards-build` lo lee.

## Comandos
Desde `apps/web` (pnpm 10 por corepack; Postgres 16 local de Homebrew, sin Docker por ahora):
- Ejecutar: `pnpm dev --port 3100` (prototipo de apertura en `/lab`)
- Tipos y lint: `pnpm typecheck` y `pnpm lint`
- Tests: `pnpm test` (Vitest: proyecto `unit` en `src/**/*.test.ts` y `integration` en
  `tests/integration`, que recrea la BD `waifu_baker_test` y aplica migraciones en cada ejecución)
- Migraciones: `pnpm db:generate --name <nombre>` y `DATABASE_URL=… pnpm db:migrate`
- Login de desarrollo: `/login` con `DEV_LOGIN=1`; marca "Entrar como administrador" para el panel
- Recorridos manuales del panel en navegador (servidor de desarrollo en marcha): `node scripts/admin-smoke.mjs`,
  `scripts/admin-e2-smoke.mjs <out>`, `scripts/admin-e3-smoke.mjs <out> public/lab`,
  `scripts/upload-order-check.mjs`, `scripts/editor-check.mjs <png>`, `scripts/admin-e4-smoke.mjs <out>`,
  `scripts/regenerate-check.mjs <png>`, `scripts/admin-e5-smoke.mjs <out>`, `scripts/admin-e6-smoke.mjs <out>`, `scripts/tablet-check.mjs <out>`; carta de muestra: `pnpm exec tsx scripts/sample-card.mts <arte> <png> <rareza> "<nombre>" <n>`
- En pruebas de la revisión 18+ usar solo arte de personajes adultos; nunca umamusume ni estudiantes
- Imágenes de cartas en desarrollo: `apps/web/var/cards/` (ignorado por git; `CARD_STORE_DIR` lo cambia)
- E2E: `pnpm e2e` (Playwright; levanta su propio servidor en el puerto 3200 con la BD `waifu_baker_e2e`,
  que recrea en cada ejecución, y `.next-e2e`; no toca la BD de desarrollo). Corre en cuatro
  proyectos: `chromium-desktop`, `pixel-7`, `iphone-14` (WebKit) y `reduced-motion`, tras un paso
  `warmup` que compila todas las rutas (`e2e/warm.ts`). Cada test empieza con la BD vacía (`e2e/fixtures.ts`); el
  administrador entra siempre en escritorio y el coleccionista con el dispositivo del proyecto.
  Los datos de partida (colecciones publicadas, sobres regalados) se siembran con `POST /api/dev/seed`
  (`createPublishedSet`/`giftPacks` de `e2e/helpers.ts`, mismos servicios que el panel); solo
  `e2e/admin-panel.spec.ts` recorre el panel de verdad. `next dev` retiene memoria por página servida:
  antes de cada test `POST /api/dev/memory` recoge basura y, si hace falta, reinicia el servidor entre
  tests (uso en `test-results/server-memory.log`).
  `e2e/qa-sweep.spec.ts` recorre todas las páginas en escritorio, tableta y móvil buscando errores
  de consola, respuestas fallidas, desbordes, imágenes rotas y controles sin nombre.
  Solo un proyecto: `pnpm exec playwright test --project=iphone-14`. Los contextos usan español por
  defecto (cookie `wb_locale=es` en `playwright.config.ts`); `e2e/i18n.spec.ts` y el barrido usan inglés.
- Textos de la interfaz: nunca literales en componentes; van en `src/i18n/dictionaries/{en,es}/<área>.ts`
  (el inglés manda y el tipo obliga al español a tener las mismas claves). Errores de negocio: código +
  `params` en `AdminError`, traducción en `dictionaries/*/errors.ts`. `src/i18n/i18n.test.ts` falla si queda
  texto en español fuera de los diccionarios o un código de error sin traducir.
- Reloj de pruebas (spec 009): en desarrollo, `POST /api/dev/clock {"advanceHours": 24}` adelanta la hora del
  servidor y `DELETE` la devuelve a la real (los E2E la reinician en cada test). Usa `now()` de `server/clock.ts`
  en vez de `new Date()` en todo lo que dependa de esperas o días.
- Demo local (spec 010): `pnpm demo` recrea la BD `waifu_baker_demo`, la llena con `apps/web/demo/fanart.json`
  (imágenes de `ART_DIR`, fuera de git) y arranca en el puerto 3300 con `DEMO_MODE=1`. El E2E también corre en modo
  demo con `e2e/demo-manifest.json` (imágenes de `public/lab`).
- Capturas para enseñar: con la demo recién creada, `pnpm showcase <carpeta> escritorio|movil` recorre todas las
  pantallas y deja las imágenes y un `manifest.json` (abre sobres: una pasada por demo).
- Copias de seguridad (spec 007): `pnpm backup` hace una copia cifrada en `BACKUP_DIR`; `pnpm backup:restore [archivo]`
  la restaura en `<bd>_restore` y `var/restore/cards` y la compara con su manifiesto. Necesitan `pg_dump`/`pg_restore`.
  Las tareas periódicas (Patreon, cuentas vencidas, copia diaria) se activan con `SCHEDULER=1`.
- CI: `.github/workflows/ci.yml` corre lint, tipos, Vitest y E2E de escritorio en cada push a `main`.
- Compilación de producción: `NEXT_DIST_DIR=.next-prod pnpm build` (no pisa `pnpm dev`).
- Validación RF por RF: `node scripts/rf-coverage.mjs ../../specs/<spec>` (escribe `validation.md`; los tests
  se nombran `test_s<NNN>_rfN_*` —la 003 puede omitir `s003_`— y cada E2E declara su spec en la
  primera línea y nombra sus pasos con «RF-N»)
- Capturas del flujo de `/lab` en escritorio e iPhone: `node scripts/lab-shots.mjs <carpeta>`
  (en móvil emulado el rasgado se envía como toques reales por CDP; use-gesture ignora el ratón ahí)
- Base de datos: `pg_ctl -D /opt/homebrew/var/postgresql@16 start`; BD `waifu_baker_dev`; `.env.local` ya apunta a ella

## Estilo y convenciones
- TypeScript estricto. Server Components por defecto; `"use client"` solo donde hay interacción.
- Identificadores en inglés; textos al usuario y documentación en español.
- Capas: `domain/` no importa nada del resto; `services/` solo `domain/` y `ports/`; los
  handlers de `app/api` traducen HTTP y no contienen reglas; `features/` no calcula
  resultados ni permisos, solo muestra lo que devuelve la API.

## Reglas
- Lee `docs/constitution.md`, `docs/architecture.md` y la spec activa en `specs/` antes de
  tocar el motor (Patreon, concesiones, sorteo, gate 18+, cumplimiento).
- La experiencia de apertura se itera en la ruta `/lab` con datos falsos y se prueba en
  móvil; su spec se escribe después de validarla, no antes.
- No añadas dependencias sin justificarlas antes en el plan de la spec.
- No cambies el esquema de la base de datos fuera de una migración de Drizzle.
- Nunca generes, cargues ni enlaces arte sugerente de personajes no adultos, ni arte de
  personajes con licencia en contenido de pago.
- No modifiques archivos dentro de `specs/` salvo petición explícita.
- Cualquier cambio de comportamiento del motor entra primero por la spec.

## Al terminar cualquier tarea
- Ejecuta `pnpm test` (y `pnpm e2e` si tocaste la interfaz) y confirma en tu respuesta que
  todo pasa.

## Reglas de negocio

`docs/reglas-de-negocio.md` resume todas las reglas acordadas, con la spec de origen de cada una. Al aprobar o
terminar una spec, actualízalo en la misma tarea (estado «Aprobada» → «Vigente»). Si choca con una spec, manda la spec.
