# Plan — Spec 020, espacio de juegos con Expediciones

## Resumen técnico
Reglas puras en `domain/expeditions/` (poder, calificación, botín, vínculo, frases, simulador), una migración con las
tablas del juego, un servicio `server/services/expeditions.ts` con transacciones y bloqueos (enviar, cancelar, reclamar,
elegir el sobre, abrir zona) y otro para el panel (`expedition-zones.ts`). La web del coleccionista añade `/juegos` y
`/juegos/expediciones`; el panel, terreno y rol en Personajes y `/admin/expediciones` (zonas, botín, simulador). Los
textos del juego viven en un diccionario aparte (`i18n/games.ts`) que solo cargan las páginas de juegos.

## Reglas (domain/expeditions)
- **Rarezas a poder base**: común 10, infrecuente 12, rara 14, épica 17, legendaria 20, secreta 24. Con el terreno a
  ×1.5, una carta en su terreno supera siempre a otra dos rarezas por encima fuera del suyo (RF-11): 15 > 14, 18 > 17,
  21 > 20, 25.5 > 24.
- **Poder de una carta** = base × 1.5 (terreno) × 1.15 (holo) × (1 + 0.02 × nivel de vínculo). Poder del equipo = suma.
- **Calificación** con r = poder / dificultad: Excelente ≥ 1.4 (botín 125 %), Bien ≥ 1.0 (100 %), Normal ≥ 0.6 (80 %),
  Difícil < 0.6 (50 %).
- **Botín fijo**: el administrador fija por zona y duración las galletas y fragmentos de «Bien» y la probabilidad de
  sobre; cada calificación aplica su porcentaje (redondeo hacia abajo, mínimo 1 galleta). Roles: Recolectora en el
  equipo ×1.3 galletas, Cartógrafa ×2 fragmentos, Buscatesoros ×1.5 probabilidad de sobre (una vez por rol).
- **Duraciones**: 30 min, 2 h y 8 h. **Espacios**: 2. **Equipo**: 1 a 3 cartas distintas (carta + versión).
- **Vínculo**: experiencia 4 / 12 / 30 por duración; niveles 1 a 10 con umbrales 0, 50, 150, 300, 500, 750, 1000, 1500,
  2000 y 2500.
- **Frases**: 1, 2 o 3 según la duración; plantillas con huecos `{a}`, `{b}`, `{c}` y `{zone}` y el mínimo de cartas
  que piden. Se eligen con el RNG del reclamo y se guardan como clave de plantilla más nombres, para pintarlas en el
  idioma de quien mira.
- **Simulador**: calificación, botín, sobres esperados por expedición y por día con 2 espacios (24 h / duración × 2 ×
  probabilidad), más una simulación con semilla de 10 000 reclamos para los sobres.

## Datos (migración 0015)
- `characters`: `terrain`, `role` (enums nuevos, nulos = sin asignar; sin terreno no hay bonus).
- `expedition_zones`: nombre, terreno, dificultad, fragmentos para abrir (0 = abierta desde el inicio), orden, imagen,
  activa, `loot` jsonb por duración `{ cookies, fragments, packChance }`.
- `expedition_profiles`: fragmentos y expediciones completadas por usuario (fragmentos ≥ 0).
- `expedition_zone_unlocks`: zonas abiertas por usuario.
- `expeditions`: usuario, zona, duración, salida y vuelta (hora del servidor), poder, calificación, botín congelado,
  equipo congelado, estado (`active`, `claimed`, `cancelled`), resultado (frases, sobre, experiencia) y semilla.
- `expedition_cards`: carta y versión de cada expedición con `active`; índice único parcial (usuario, carta, holo)
  mientras está activa (RF-8, también ante concurrencia).
- `character_bonds`: experiencia por usuario y personaje.
- `pack_source`: valor nuevo `expedition`; el sobre ganado usa `grant_key = expedition:<id>` (una sola vez).

## Servicio (servidor decide)
- `sendExpedition`: bloquea el perfil del usuario; valida zona abierta y activa, duración, equipo, propiedad de cada
  carta y versión, filtro 18+ y espacios; calcula y congela poder, calificación y botín.
- `cancelExpedition`: solo activas y antes de la vuelta; libera las cartas.
- `claimExpedition`: bloquea la fila; si ya está reclamada devuelve el resultado guardado (RF-23); si no ha vuelto,
  `not_returned`; si no, semilla de 32 bytes, sobre con la probabilidad congelada, frases, galletas al libro, fragmentos,
  vínculo y estado en una transacción. Con una sola colección SFW publicada el sobre se concede al momento; con varias,
  queda pendiente hasta que el coleccionista elige (`choosePackSet`).
- `unlockZone`: descuenta fragmentos y abre la zona (bloqueo del perfil).
- `expeditionsReady`: cuántas han vuelto sin reclamar (contador de «Juegos», RF-2).

## UI
- Navegación: «Juegos» (pegatina nueva) en el panel lateral y en las pestañas del móvil, con el contador.
- `/juegos`: el espacio de juegos con Expediciones como tarjeta.
- `/juegos/expediciones`: mapa con las zonas (abiertas, niebla con fragmentos, en curso con cuenta atrás), tarjetas de
  los 2 espacios (cuenta atrás, «Reclamar», «Cancelar» con confirmación), hoja «Preparar expedición» (selector con
  filtros, barra de poder frente a dificultad, calificación en vivo, duraciones con su botín, «Enviar») y reporte
  (frases línea a línea, botín, vínculo; elegir colección y celebración si sale sobre).
- Ficha de carta: nivel de vínculo de la personaje y «En expedición hasta las HH:MM».
- Probabilidades: tabla de sobre por zona y duración.
- Panel: terreno y rol en Personajes; `/admin/expediciones` con zonas (crear, editar, imagen, activar), botín por
  duración y simulador.

## Pruebas
- Unidad: poder, RF-11 en todas las rarezas, holo, vínculo, calificación, botín con roles, niveles, frases, simulador.
- Integración (Postgres): enviar con todas sus validaciones, carta ocupada en paralelo, espacios, cancelar, reclamar
  antes y después, doble reclamo en paralelo, sobre con probabilidad 1 y elección de colección, congelado ante cambios,
  abrir zona con y sin fragmentos, 18+, contador.
- E2E (4 proyectos): panel (terreno y rol, zona con 100 % de sobre), coleccionista (mapa, equipo, calificación, enviar,
  cancelar, reloj adelantado, reclamar, reporte, sobre, abrir zona), ficha y probabilidades.
- Peso: `/juegos/expediciones` en el presupuesto de 250 kB.
