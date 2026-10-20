# Plan 015 — Premios con vida

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Parte de recompensas (spec 009), del sistema de diseño
(011), del motor de sonido (013) y del estilo kawaii (014). Primero se diseña en Pencil y se aprueba; después se
programa. No cambia ninguna regla de recompensas ni de sobres: solo cómo se comunican.

## 1. Maquetas (antes de código)

En `waifubaker.pen`, en la lámina «Kawaii (spec 014)» o una nueva «Premios (spec 015)»: la celebración central en
sus dos variantes (llegadas y racha completa), los fotogramas de un premio que vuela (galletas al contador, sobre a la
pestaña), la pegatina del día estampada y latiendo, la etiqueta «¡Nuevo!» en «Mis sobres», el error junto al botón
con «Reintentar» y el botón de silencio en la cabecera; en móvil y escritorio. El usuario las aprueba antes de la
entrega 2.

## 2. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/feedback/sounds.ts` | Lista de sonidos de toda la web (los seis de la apertura más `cookies`, `pack` y `fanfare`); `domain/opening/feedback.ts` la reexporta | RF-12 |
| `features/sound/engine.ts` | El motor de la 013, movido desde `features/opening/sound.ts`: ahora un sonido se descarga la primera vez que suena si no se precargó | RF-12, RF-13 |
| `features/shell/HeaderSoundToggle.tsx` | `SoundToggle` en la cabecera del coleccionista con el mismo estado guardado | RF-14 |
| `domain/rewards/flight.ts` | Puro: destino de un vuelo (el elemento visible o el borde de la pantalla más cercano a él) | RF-4 |
| `ui/game/flight.ts` + `FlightLayer` | Vuelo de pegatinas con la Web Animations API en una capa fija: clones, arco, rebote del destino, evento `wb:fly`, nada con movimiento reducido; destinos por `data-fly-target` | RF-1, RF-2, RF-4 |
| `ui/content/Badge.tsx` | Los contadores (`count`) suben con `AnimatedCounter` | RF-3 |
| `ui/shell/AppShell.tsx` | El acceso a «Mis sobres» (pestaña, enlace y barra) y el pie con las galletas son destinos de vuelo; el pie admite contenido | RF-2, RF-3 |
| `ui/game/Confetti.tsx` | El confeti de la 014, movido desde la apertura, para reutilizarlo | RF-5, RF-6 |
| `ui/game/Celebration.tsx` | Diálogo de celebración sobre `Modal`: premio grande, título, origen, confeti, botones; fanfarria y vibración al abrirse | RF-5, RF-6, RF-12, RF-13 |
| `features/rewards/celebrations.tsx` | Cola de celebraciones (una a la vez, en orden) y quién puede mostrarlas (no en la apertura) | RF-9 |
| `features/rewards/RewardsPanel.tsx`, `StreakRow.tsx` | Estampado, latido, vuelos, anuncio para lectores de pantalla, error junto al botón; fuera el aviso emergente y el mensaje de la tarjeta | RF-1, RF-2, RF-5, RF-10, RF-11, RF-15, RF-16 |
| `domain/rewards/daily.ts` | `dailyAtRisk`: día de gracia con racha que perder | RF-11 |
| `domain/rewards/arrivals.ts` | Puro: qué sobres son llegadas, cómo se agrupan por colección y qué título les toca | RF-6, RF-8 |
| Migración `0010` | `packs.celebrated_at` (nula) y `users.packs_seen_at` (nula) | RF-7, RF-8 |
| `server/services/arrivals.ts` | `pendingArrivals`, `markCelebrated` (idempotente, solo del propio usuario), `newArrivalsBySet`, `markPacksSeen` | RF-6 a RF-8 |
| `features/rewards/ArrivalsCelebration.tsx` | Al cargar una página del coleccionista, encola la celebración de llegadas y las marca celebradas al mostrarse | RF-6, RF-7, RF-9 |
| «Mis sobres» | Etiqueta «¡Nuevo!» por colección y marcar vistos al visitar | RF-8 |
| `i18n` | Textos nuevos en inglés y español, con plurales | Todos |

## 3. Decisiones

- **El servidor decide, el cliente anima.** Reclamar sigue siendo la misma acción de servidor; solo cambia lo que
  pasa después: la acción devuelve el premio (`{ kind, amount, cookies, packId, day }`) y el cliente estampa, vuela y
  anuncia. Al aterrizar el premio se pide `router.refresh()`: así los contadores del servidor (pestaña, pie, panel)
  llegan justo cuando el premio aterriza y `AnimatedCounter` los sube desde el valor anterior.
- **Vuelo sin React.** La capa de vuelo clona la pegatina en un elemento fijo y la anima con la Web Animations API
  (`transform` y `opacity`, arco en tres puntos); el destino rebota también con WAAPI. Nada reserva sitio ni mueve lo
  de alrededor. Con movimiento reducido no se anima y el vuelo termina al instante. El motor acepta las funciones de
  animar y de medir como dependencias para probarlo en jsdom.
- **Destinos por nombre.** Los elementos destino llevan `data-fly-target="packs"` o `"cookies"`; puede haber varios
  (pestaña en móvil, enlace en escritorio): vuela al primero visible; si ninguno lo está, al borde más cercano
  (`domain/rewards/flight.ts`).
- **Llegadas celebradas en servidor.** Una llegada es un sobre sellado con origen `promo`, `manual` o `tier_grant`.
  `celebrated_at` se marca cuando la celebración se muestra (no al cerrarla), para no repetirla si se cierra la
  pestaña a medias; si dos dispositivos la muestran a la vez, la marca es idempotente. Un sobre anulado (`void`) no
  cuenta. «Nuevo» en «Mis sobres» compara `granted_at` con `users.packs_seen_at`, que se actualiza al visitar la
  página desde el cliente (acción al montar), así la visita que los enseña aún los marca.
- **Título de las llegadas**: `promo` con motivo `welcome` → «¡Bienvenida!», `manual` → «Un regalo para ti»,
  `tier_grant` → «Tu suscripción de este mes»; mezcla → «¡Te han llegado sobres!». Siempre una sola celebración.
- **Cola de celebraciones**: un contexto en el shell del coleccionista; `ArrivalsCelebration` encola al cargar si la
  ruta no es de apertura (`/sobres/[id]` o `/todos`); la del día 7 la encola `RewardsPanel`. Se muestra la primera
  y, al cerrarla, la siguiente.
- **Sonido**: tres sonidos CC0 de Kenney, cortos, editados como los de la 013 (mono, normalizados, MP3 96 kbps);
  el tope del test de peso de sonidos sube de 200 a 300 kB si hace falta. El motor no cambia de API: `play(name)`
  descarga `howler` y el sonido si aún no estaban. La vibración de la celebración es un pulso corto (`[30]`).
- **Avisos**: `RewardsPanel` deja de usar `useToast` y `Alert` de éxito; para errores usa `Alert tone="danger"` con
  `actions` («Reintentar» solo si la acción falló por red o excepción; «ya reclamada» o «todavía no» no lo llevan).
  Un anuncio `aria-live` oculto dice el premio y el total. `ToastProvider` sigue para el panel.
- **Sistema de diseño**: `Celebration`, `Confetti` y `FlightLayer` viven en `ui/game`, salen en `/sistema`, en la
  tabla de `docs/DESIGN.md` y en el mapa de Pencil.

## 4. Pruebas

- Unidad (dominio): `dailyAtRisk` (gracia con racha, sin racha, día 7, ya reclamada); agrupar llegadas y elegir
  título; destino de vuelo visible o borde; lista de sonidos.
- Unidad (interfaz): motor de vuelo con `animate` falso (clones, rebote, evento, nada con movimiento reducido);
  `Celebration` como diálogo accesible con confeti; `Badge` que sube; `StreakRow` estampando y latiendo; `Alert`
  con «Reintentar»; `RewardsPanel` sin aviso emergente y con anuncio para lectores de pantalla; motor de sonido con
  carga perezosa.
- Integración (BD): `pendingArrivals` excluye `free`, `daily`, abiertos, anulados y celebrados; `markCelebrated`
  idempotente y solo del propio usuario; `newArrivalsBySet` y `markPacksSeen`.
- E2E `premios.spec.ts` en los cuatro proyectos según los criterios de la spec (con el reloj de pruebas para el día 7
  y el día de gracia; `wb:sound` y `wb:fly` para sonidos y vuelos; `toasts` vacío); `pnpm budget`; capturas.
