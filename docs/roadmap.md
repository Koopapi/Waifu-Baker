# Roadmap de specs — Waifu Baker TCG

Estrategia híbrida (ver `docs/architecture.md`, sección "Metodología"): el **motor** va por
spec con tests primero; la **experiencia** va por prototipo en `/lab` y se especifica
después de validarla en móvil. Antes de profundizar en ninguna spec, las dos primeras
semanas construyen un **esqueleto andante**: login con Patreon → un sobre concedido a mano →
apertura mínima → colección guardada, desplegado en el VPS.

| Spec | Funcionalidad | Cubre | Pista |
|---|---|---|---|
| 001 ✓ | Cuentas y vínculo con Patreon | Login OAuth, entitlements, webhooks + reconcile, gate 18+, sobre de bienvenida, baja de cuenta | motor |
| 002 | Catálogo: sets, personajes, cartas y probabilidades | Modelo de colecciones, rarezas y variantes, tablas de probabilidad versionadas y públicas, almacenamiento y procesado de imágenes | motor |
| 003 ✓ | Panel de administración | Acceso de administradores, carga de imágenes, alta y edición de colecciones, personajes y cartas, asignación de rarezas, probabilidades, publicación, vista previa | motor + prototipo de la UI |
| 004 ✓ | Sobres: concesión y apertura | Reglas de grant por tier, transacción de apertura idempotente, RNG auditable, geobloqueo, URLs firmadas | motor |
| 005 | Experiencia de apertura | Rasgado, abanico, volteo, holo (puntero y giroscopio), reveal por rareza, audio, reduced motion, presupuesto de rendimiento | experiencia (prototipo primero) |
| 006 ✓ | Colección y álbum público | Binder, filtros, álbum con slug, imagen OG, renders públicos con marca | experiencia (prototipo primero) |
| 008 ✓ | Idiomas | Inglés por defecto y español con selector en toda la web, panel incluido | motor |
| 007 | Operación y cumplimiento | Páginas legales y de probabilidades, divulgación IA, backups y restore, Sentry, CI, checklist de lanzamiento | motor |

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
