# Roadmap de specs — Waifu Baker TCG

Estrategia híbrida (ver `docs/architecture.md`, sección "Metodología"): el **motor** va por
spec con tests primero; la **experiencia** va por prototipo en `/lab` y se especifica
después de validarla en móvil. Antes de profundizar en ninguna spec, las dos primeras
semanas construyen un **esqueleto andante**: login con Patreon → un sobre concedido a mano →
apertura mínima → colección guardada, desplegado en el VPS.

| Spec | Funcionalidad | Cubre | Pista |
|---|---|---|---|
| 001 ✓ | Cuentas y vínculo con Patreon | Login OAuth, entitlements, webhooks + reconcile, gate 18+, sobre de bienvenida, baja de cuenta | motor |
| 002 ✓ | Catálogo: sets, personajes, cartas y probabilidades | Modelo de colecciones, rarezas y variantes, tablas de probabilidad versionadas y públicas, almacenamiento y procesado de imágenes | motor |
| 003 ✓ | Panel de administración | Acceso de administradores, carga de imágenes, alta y edición de colecciones, personajes y cartas, asignación de rarezas, probabilidades, publicación, vista previa | motor + prototipo de la UI |
| 004 ✓ | Sobres: concesión y apertura | Reglas de grant por tier, transacción de apertura idempotente, RNG auditable, geobloqueo, URLs firmadas | motor |
| 005 ◐ | Experiencia de apertura | Rasgado, abanico, volteo, holo (puntero y giroscopio), reveal por rareza, audio, reduced motion, presupuesto de rendimiento | experiencia (prototipo primero) |
| 006 ✓ | Colección y álbum público | Binder, filtros, álbum con slug, imagen OG, renders públicos con marca | experiencia (prototipo primero) |
| 008 ✓ | Idiomas | Inglés por defecto y español con selector en toda la web, panel incluido | motor |
| 009 ✓ | Sobres gratis y recompensa diaria | Sobre gratis cada 12 h (hasta 2), racha de 7 días con galletas y sobre, galletas en el panel | motor |
| 010 ✓ | Acabado premium y demo | Estructura estilo Discord (barra de colecciones, panel, cajón y pestañas en móvil), paleta «Cereza», avisos, esqueletos, edad mínima configurable y `pnpm demo` | experiencia |
| 011 ✓ | Sistema de diseño | Componentes reutilizables (acción, formulario, respuesta, superposiciones, contenido, juego y estructura), catálogo `/sistema`, Pencil, acciones optimistas y confirmaciones | experiencia |
| 012 ✓ | Moderación de álbumes públicos | Ocultar con motivo y nota, aviso al dueño, petición de revisión con alias nuevo (7 días entre peticiones), aprobar o rechazar, historial | motor |
| 013 ✓ | Rendimiento y sonido de la apertura | Sonidos CC0 por rareza, botón de silencio, vibración, 250 kB por página comprobados en la CI; comprobada en un iPhone | experiencia |
| 014 ✓ | Demo pulida con estilo kawaii | Paleta pastel sobre oscuro, pegatinas e iconos de doble tono, sobres compuestos con portada elegible o hechos a mano, apertura con agitado, brillo de rareza, confeti y resumen, anillo y racha de pegatinas, colección con portada y datos, sin cartas repetidas por sobre, `pnpm demo` optimizada | experiencia |
| 007 ◐ | Operación y cumplimiento | Páginas legales y de probabilidades, divulgación IA, backups y restore, Sentry, CI, checklist de lanzamiento | motor |

## Camino al lanzamiento (orden acordado el 16 oct 2026)

Cada etapa se cierra antes de abrir la siguiente; dentro de cada una, una spec cada vez (entrevista, spec,
plan, tareas, tests primero, validación). Lo que depende de una decisión del usuario se le pide al empezar la
etapa, no antes. Desde aquí cada spec va en su rama (`spec/NNN-nombre`) y entra en `pruebas` (desde el 20 oct 2026; luego `pruebas` pasa a `main`) por pull request con
el CI en verde.

| Etapa | Qué | Necesita del usuario |
|---|---|---|
| 1. Cerrar lo pendiente | 002 y 005 documentadas como absorbidas; **spec 012 ✓**: moderación de álbumes públicos (los términos ya la prometen); **spec 013 ✓**: rendimiento y sonido de la apertura (lo que faltó de la 005: presupuesto de peso de `/sobres/[id]`, 60 fps medidos, sonidos). **Etapa cerrada el 16 oct 2026.** | entrevistas cortas |
| 1b. Demo pulida (**spec 014**) | Estilo kawaii sobre oscuro: iconos tipo pegatina, sobres compuestos con el arte de la colección (o subidos a mano), apertura con suspense, recompensas y colección con más vida, sin cartas repetidas por sobre, demo optimizada. **Spec 014 ✓, cerrada el 18 oct 2026** tras la prueba del usuario en su teléfono. | maquetas aprobadas |
| 2. Contenido de pago | Pista de arte: elegir las 5 OCs, prueba A0 de consistencia, set SFW de ~30 cartas y set 18+; cargarlos con el panel | aprobar OCs y créditos |
| 3. Salir a internet (**spec 015**, parte 2 de la 007) | Servidor y dominio, Docker/Coolify, HTTPS, CSP y HSTS, imágenes en R2, Redis (límites y tareas), webhook real de Patreon, Cloudflare (bloqueo de Bélgica), Sentry, copias fuera del Mac; comprobar en la web publicada lo que quedó de la 013 (holo con giroscopio, vibración en Android, carga en 4G) | proveedor, dominio y presupuesto |
| 4. Piloto de pago (**spec 016**) | Tiers y precios en Patreon, reglas de tier en el panel, edad mínima a 18 si se publica fan art subido de tono, revisión legal, pledge real de prueba, checklist de lanzamiento | precios, abogado, pledge |
| 5. Beta cerrada | Pocos patrons invitados, métricas y correcciones antes de abrir | lista de invitados |
| Después | Tienda de galletas, juegos (una spec por juego), temas por colección, Storybook | — |

Notas del cierre de la etapa 1: la 002 (catálogo) quedó cubierta por la 003 (panel, colecciones, cartas,
rarezas, probabilidades) y la 004 (sorteo y apertura); la 005 (experiencia de apertura) se construyó en `/lab`
y quedó en la 004 y la 010, salvo el sonido y la medición de rendimiento, que pasan a la spec 013.

Cambio del 14 oct 2026: se añade el panel de administración (003) a petición del usuario y se
renumeran las siguientes. El panel sustituye a la carga por línea de comandos como vía principal
para meter cartas; `cards-build` queda como importación opcional desde el taller.

Cada spec del motor se limita a 10–25 RF. Las specs 001 y 003 se escriben ligeras y en
paralelo al esqueleto. Orden de salida: primero el set SFW (`WB01`), y el set 18+ (`WB01A`)
dos o tres semanas después, con la página Adult de Patreon aprobada.

La **pista de arte** corre en paralelo y se documenta en `art/README.md`.

## Estado

- 15 oct 2026: spec 003 terminada y validada (27/27 RF). Adelanta de las specs 001, 002 y 004 lo que
  el panel necesitaba: tablas del catálogo, sobres, aperturas e inventario; login con Patreon y de
  desarrollo; rol de administrador; sorteo puro con RNG inyectable (`domain/catalog/draw.ts`), que la
  apertura real reutilizará en el servidor con `server/rng.ts`.
- 15 oct 2026: spec 004 terminada y validada (21/21 RF): «Mis sobres», apertura en servidor con semilla
  auditable, una sola vez y concurrencia, duplicados y holo aparte, protección de mala suerte
  configurable, reanudación, «Abrir todos», imágenes firmadas y límite por minuto. La experiencia de
  la spec 005 queda cubierta en su versión 2.5D por el laboratorio reutilizado; falta el sonido.
- 15 oct 2026: spec 006 terminada y validada (17/17 RF): «Mi colección» con progreso, álbum por colección
  con huecos y filtros, ficha con holo, álbum público opcional con alias, destacadas, enlace
  regenerable, imágenes con marca de agua, vista previa para redes y `noindex`.
- 15 oct 2026: spec 008 terminada y validada (10/10 RF): inglés por defecto y español con selector en
  toda la web, panel y mensajes de error incluidos. El usuario decidió seguir en local hasta una beta.
- 15 oct 2026: spec 001 terminada y validada (26/26 RF): membresía de Patreon al entrar y cada 15 min,
  sobre de bienvenida, sobres por cobro idempotentes, subida de tier, reembolsos, avisos firmados,
  revisión cada 6 h, verificación 18+, «Mi cuenta» y borrado con 30 días. Faltan los tiers reales
  en Patreon y una dirección pública para los avisos.
- 15 oct 2026: spec 009 terminada y validada (21/21 RF): sobre gratis cada 12 h acumulable hasta 2,
  racha diaria de 7 días con un día de gracia, galletas con historial y ajustes desde el panel.
- 16 oct 2026: spec 007, parte para la beta, terminada (18/18 RF): edad mínima 16 y aceptación de términos,
  páginas legales, Sentry, métricas propias, copias cifradas con restauración y CI en GitHub. Queda la
  parte 2: servidor, dominio, CSP/HSTS y cola de trabajos.
- 16 oct 2026: spec 010 terminada y validada (19/19 RF): estructura estilo Discord con barra de colecciones, panel,
  cajón y pestañas en móvil, paleta «Cereza», avisos, esqueletos, edad mínima configurable (16/18) y `pnpm demo` con la
  colección de fan art (26 cartas con nombres propios). Spec 011 (sistema de diseño) aprobada.
- 16 oct 2026: spec 011 casi terminada (16/17 RF): sistema de diseño en `src/ui` (tokens, botones, formularios,
  desplegable con buscador, avisos con deshacer, modales y confirmaciones, contenido, piezas de juego, estructura y
  acciones optimistas), catálogo `/sistema` y todas las pantallas migradas; peso añadido de 1 a 12 kB por página.
  Falta la lámina de Pencil (RF-16): Pencil no dibujaba elementos nuevos.
- 16 oct 2026: spec 011 terminada y validada (17/17 RF): lámina «Sistema de diseño» en Pencil con un componente
  por cada uno del código, y tableros «Pantallas · Escritorio/Móvil» con las capturas reales (`pnpm showcase`).
- 18 oct 2026: spec 014 terminada y validada (24/24 RF): demo pulida con estilo kawaii, probada y aprobada por el
  usuario en su teléfono y en su ordenador. Siguiente, a decidir por el usuario: etapa 2 (OCs propias, con una prueba
  de consistencia con una sola OC) o etapa 3 (spec 015, publicar la web).
