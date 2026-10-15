# Plan 004 — Sobres: concesión y apertura

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`. Reutiliza el
sorteo puro de la spec 003 (`domain/catalog/draw.ts`), la escena de apertura del laboratorio y el
almacén de cartas.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/catalog/pity.ts` | Cuándo actúa la protección y cómo avanza el contador | RF-13, RF-14 |
| `domain/catalog/draw.ts` (`drawPackWithPity`) | Sorteo con protección: si no salió épica o superior y toca, la última ranura se vuelve a sortear solo entre épica o superior | RF-5, RF-13 |
| `domain/random.ts` (`hmacRng`) | Generador reproducible desde una semilla de 32 bytes (HMAC-SHA256 en contador) | RF-5, RF-9 |
| `domain/rate-limit.ts` | Ventana deslizante con reloj inyectable | RF-21 |
| `domain/signed-url.ts` | Firma y verificación de enlaces de imagen (carta, tamaño, usuario, caducidad) | RF-20 |
| `server/services/packs.ts` | `listMyPacks`, `openPack`, `openAllPacks`, `getOpeningResult`, `ackOpening`, `pendingOpening` | RF-1, RF-3 a RF-11, RF-17 a RF-19 |
| `server/services/collections.ts` | `saveOdds` admite `pityThreshold`; `listPublicOdds` lo devuelve | RF-12, RF-15 |
| `app/sobres/**` | «Mis sobres», apertura individual y «Abrir todos» | RF-1 a RF-3, RF-16 a RF-18 |
| `app/api/cards/img` | Sirve imágenes con enlace firmado | RF-20 |
| `features/opening/*` | Escena reutilizada: notas «Nueva / Tienes N», aviso de protección, `onFinished` | RF-11, RF-16 |
| `features/packs/OpenAllGrid.tsx` | Cuadrícula de resultados de «Abrir todos» | RF-18 |

## 2. Modelo de datos (migración `0002`)

- `drop_tables.pity_threshold` integer, por defecto 10 (0 = sin protección).
- `user_cards.holo` boolean; la clave pasa a `(user_id, card_id, holo)`.
- `pity_counters (user_id, set_id) pk, packs_since_epic int, updated_at`.
- `pack_openings.pity_applied` boolean. `rolls` guarda por ranura: rareza sorteada, carta, holo,
  si la sustituyó la protección, si era nueva y la cantidad tras la apertura.

## 3. Algoritmos

- **Apertura (RF-5 a RF-11)**, en una transacción: bloquear el sobre (`FOR UPDATE`); si ya está
  abierto, devolver la apertura guardada; comprobar propietario, cuenta y edad; leer la última tabla
  de probabilidades publicada, las cartas con rareza y el contador de protección (con bloqueo);
  generar semilla de 32 bytes con `crypto.randomBytes`; sortear con `hmacRng(semilla)`; sumar a
  `user_cards` cada carta (versión holo aparte) y anotar si era nueva y la cantidad final; guardar
  la apertura; marcar el sobre como abierto; actualizar el contador. `pack_openings.pack_id` único
  es la segunda barrera ante dos aperturas simultáneas.
- **Protección (RF-13)**: activa si `N > 0` y el contador ≥ N − 1. Si el sorteo normal no trae
  épica o superior, la última ranura se sortea entre épica, legendaria y secreta con sus pesos en
  esa ranura; si suman cero, con los pesos sumados de todas las ranuras; si tampoco hay, no actúa y
  se registra.
- **Reproducibilidad (RF-9)**: con la semilla guardada y la misma tabla, `drawPackWithPity`
  devuelve exactamente las mismas cartas; hay un test que lo comprueba.
- **Bélgica (RF-8)**: el país viene de la cabecera `CF-IPCountry` (Cloudflare); en local no existe.
- **Enlaces firmados (RF-20)**: `HMAC-SHA256(AUTH_SECRET, cardId.tamaño.caducidad.userId)`; la
  ruta exige sesión del mismo usuario y caducidad futura; solo se emiten para cartas que el usuario
  posee.
- **Límite (RF-21)**: 10 peticiones de apertura por minuto y usuario, en memoria del proceso
  (único proceso en el VPS); con varios procesos se moverá a Redis.

## 4. Contrato

Server actions en `app/sobres/actions.ts`: `openNextPackAction(setId)`, `resumeOpeningAction(packId)`,
`openAllPacksAction(setId)`, `ackOpeningAction(packIds)`. Ruta `GET /api/cards/img`. Errores con
`code` y `message` en español.

## 5. Decisiones técnicas

- **Semilla + HMAC en vez de llamar a `randomBytes` por tirada**: el resultado es auditable y
  reproducible (RF-9) sin perder aleatoriedad criptográfica (la semilla sí es aleatoria).
- **Protección sustituyendo la última ranura** frente a volver a sortear el sobre entero: altera lo
  mínimo y es fácil de explicar en /drop-rates.
- **Límite en memoria** frente a Redis: suficiente con un proceso; descartado montar Redis solo
  para esto.
- **«Abrir todos» como N aperturas individuales** frente a una transacción gigante: cada sobre
  queda guardado aunque se corte a mitad (caso límite) y comparte exactamente la lógica.

## 6. Dependencias nuevas

Ninguna.

## 7. Estrategia de tests

- Unit: `pity`, `drawPackWithPity` (semilla fija), `hmacRng`, `rate-limit`, `signed-url`.
- Integración: `open-pack` (RF-3 a RF-14, RF-18, RF-19, concurrencia con dos aperturas en paralelo
  sobre la BD real), `odds` con protección (RF-12, RF-15).
- E2E: regalar 3 sobres → abrir uno con animación → recargar a mitad → «Abrir todos» → comprobar
  cantidades; sin sesión redirige al login.

## 8. Entregas

1. Dominio: protección, sorteo con protección, RNG con semilla, límite y firmas.
2. Datos y servicio de apertura con concurrencia, duplicados, 18+ y Bélgica.
3. Protección en el panel y en /drop-rates.
4. Experiencia: «Mis sobres», apertura real, reanudación, «Abrir todos», imágenes firmadas.
5. E2E y validación RF por RF.
