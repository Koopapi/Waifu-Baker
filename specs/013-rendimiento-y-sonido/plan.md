# Plan 013 — Rendimiento y sonido de la apertura

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Reutiliza la escena de apertura (spec 004,
`features/opening`), «Abrir todos» (`features/packs/OpenAllView`) y el sistema de diseño (spec 011).
`howler` ya es dependencia del proyecto (plan inicial); no se añade ninguna otra.

## 1. Punto de partida (build de producción, 16 oct 2026)

JavaScript de la primera carga, comprimido, leído de los manifiestos del build (no de la tabla de Turbopack,
que da totales incoherentes):

| Página | kB | | Página | kB |
|---|---|---|---|---|
| base común (todas) | 233,2 | | `/cuenta` | **251,1** |
| `/sobres/[setId]` (apertura) | **271,9** | | `/bienvenida` | 246,0 |
| `/sobres/[setId]/todos` | 237,1 | | `/login` | 244,8 |
| `/coleccion/album` | 244,5 | | `/sobres`, `/recompensas` | 244,1 |

La base es casi todo el SDK de Sentry en el navegador (se carga en todas las páginas aunque no haya DSN) más
React. La apertura suma GSAP, `@use-gesture` y las partículas (unos 36 kB).

## 2. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `lib/bundle-budget.ts` + `scripts/bundle-budget.mjs` | Suma, por página, los JS de la primera carga comprimidos con gzip a partir de `app-build-manifest.json` y `build-manifest.json`; compara con 250 kB y lista las páginas que se pasan | RF-11, RF-12 |
| CI (`ci.yml`) | Paso «Peso de las páginas»: `next build` y el script; falla con la página, su peso y el exceso | RF-12 |
| `instrumentation-client.ts`, `lib/sentry-client.ts` | Sentry del navegador con `import()` dinámico, solo si hay DSN y después de cargar la página | RF-11 |
| `features/packs/PackOpener.tsx` | La escena (`OpeningStage`, con GSAP, gestos y partículas) se carga con `next/dynamic` y un esqueleto | RF-11, RF-13 |
| `public/sounds/*.mp3` + `public/sounds/LICENSES.md` | 6 sonidos CC0: `tear`, `flip`, `rare`, `epic`, `legendary` y `secret`, ≤ 200 kB en total, volumen igualado | RF-1 |
| `domain/opening/feedback.ts` | Reglas puras: sonido de reveal por rareza, patrón de vibración, mejor rareza de «Abrir todos» y su sonido final | RF-3 a RF-5, RF-9 |
| `features/opening/sound.ts` | Motor: carga `howler` con `import()` al entrar en la apertura, precarga los sonidos, `play()` y `vibrate()` que no hacen nada si está silenciado o no cargó; estado de silencio en `localStorage` con `useSyncExternalStore`; emite `wb:sound` y `wb:vibrate` (eventos del DOM) para las pruebas | RF-2, RF-6 a RF-8, RF-10 |
| `ui/game/SoundToggle.tsx` | Botón de icono con `aria-pressed` y etiqueta «Silenciar / Activar sonido»; componente del sistema (y en Pencil) | RF-7 |
| `OpeningStage`, `OpenAllView` | Llaman al motor en el rasgado, cada volteo, cada reveal y al final de «Abrir todos»; muestran el botón | RF-2 a RF-5, RF-7, RF-9 |

## 3. Decisiones

- **Medida**: gzip nivel 9 de cada fichero `.js` de `rootMainFiles` más los de la página en
  `app-build-manifest.json`, sin repetir. Es lo que el navegador descarga al abrir la página; lo cargado con
  `import()` o `next/dynamic` no cuenta (es lo que se busca). Páginas medidas: las 14 de RF-11 (la colección cuenta con su lista y su álbum) (no el panel,
  `/lab` ni `/sistema`).
- **Sentry**: el servidor no cambia. En el navegador, `@sentry/nextjs` se pide con `import()` en
  `requestIdleCallback` (o `load`) solo si hay `NEXT_PUBLIC_SENTRY_DSN`; `error.tsx` usa el mismo cargador. Se
  quita `onRouterTransitionStart` (sin trazas: `tracesSampleRate` es 0).
- **Desbloqueo del audio**: `howler` reanuda su contexto en el primer gesto; el rasgado (o «Abrir» con
  movimiento reducido) llama a `unlock()` antes de sonar.
- **Silencio**: clave `wb:sound-muted` en `localStorage`, envuelta en `try/catch` (navegación privada → sonido
  activado y sin recordar). Silenciar detiene lo que suena.
- **Vibración**: `navigator.vibrate` si existe: rara `[30]`, épica `[45]`, legendaria `[60, 40, 60]`, secreta
  `[80, 40, 80, 40, 120]`. iPhone no lo tiene; no se hace nada.
- **Solo transform y opacity (RF-14)**: los `@keyframes`, las transiciones y los tweens de GSAP de la apertura y
  de «Abrir todos» solo mueven `transform` y `opacity`. Los dos brillos que usaban `background-position` (el del
  sobre y el holo de «Abrir todos») pasan a desplazarse con `transform`. El holo que sigue al puntero o al
  giroscopio no es una animación de la secuencia sino una interacción continua: repinta degradados solo dentro
  de la capa de la carta (`contain: paint`) y no se toca (cambiaría su aspecto, fuera de alcance); su fluidez se
  comprueba en el teléfono (punto 1 de la lista).
- **Sonidos**: de Kenney (Casino Audio, Interface Sounds, Music Jingles; CC0), recortados, a mono MP3 96 kbps y
  normalizados con `ffmpeg loudnorm`. El de reveal de cada nivel es más largo y brillante que el anterior.

## 4. Pruebas

- Unidad: medida del peso (manifiesto de ejemplo, ficheros repetidos, página que se pasa); reglas de sonido y
  vibración por rareza; mejor rareza de «Abrir todos»; motor de sonido con `howler` falso (silencio que se
  recuerda, sin sonar ni vibrar silenciado, fallo de carga sin error); licencias (cada `.mp3` está en
  `LICENSES.md` como CC0 y el total ≤ 200 kB); la apertura solo anima `transform` y `opacity`.
- Build: el script de peso en la CI con las 14 páginas ≤ 250 kB.
- E2E (cuatro proyectos): abrir un sobre y recoger los eventos `wb:sound` (rasgado, 5 volteos, nivel de la
  rara); silenciar, recargar y comprobar que sigue silenciado y no suena; «Abrir todos» emite un solo sonido;
  `navigator.vibrate` simulado recibe el patrón de la rara y nada con silencio.
- Teléfono real: la lista de la spec, que firma el usuario (RF-14).
