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
| 1c. Premios con vida (**spec 015 ✓**, cerrada el 20 oct 2026) | Galletas y sobres que vuelan hasta su contador, celebración central para los sobres que llegan sin pedirlos y el día 7, racha que se estampa y avisa en el día de gracia, sonidos y vibración por el motor de la apertura, fuera los avisos del sistema para el coleccionista | maquetas aprobadas |
| 1d. Cartas por capas (**specs 016 ✓, 017 ✓ y 018 ✓**, del paquete de Bruno; 016 y 017 cerradas el 23 oct 2026, 018 el 25 oct 2026) | 016 editor en el panel; 017 armado de cartas por capas (la chica recortada crea la carta, biblioteca general de fondos, sellos, adornos y partículas, mover/escalar/girar capas, estilo automático, no publicar sin armar, importar/exportar); 018 las cartas por capas se ven en toda la web (imagen plana que sustituye al marco de Pencil, apertura, colección, ficha, giroscopio, zonas públicas con marca de agua, revisión 18+). Marcos y sello de Bruno (N a UR) sin cambiar las rarezas del juego | aprobar cada spec |
| 1e. Más juego (**specs 019 ✓, 020 ✓, 021, 022 y 023**; 019 y 020 cerradas el 25 oct 2026) | 019 «Abrir todos» dinámico; 020 espacio de juegos con Expediciones (botín fijo y, de vez en cuando, un sobre gratis con probabilidad publicada); **021 economía** (colecciones gratuitas y de Patreon, probadita, insignia y tercer espacio de patron; `docs/economia.md`); 022 tienda y cosméticos con galletas; 023 tema Street pop como segundo estilo con interruptor | entrevistas cortas |
| 2. Contenido de pago | Pista de arte: elegir las 5 OCs, prueba A0 de consistencia, set SFW de ~30 cartas y set 18+; cargarlos con el panel | aprobar OCs y créditos |
| 3. Salir a internet (**spec 024**, parte 2 de la 007) | Servidor y dominio, Docker/Coolify, HTTPS, CSP y HSTS, imágenes en R2, Redis (límites y tareas), webhook real de Patreon, Cloudflare (bloqueo de Bélgica), Sentry, copias fuera del Mac; comprobar en la web publicada lo que quedó de la 013 (holo con giroscopio, vibración en Android, carga en 4G) | proveedor, dominio y presupuesto |
| 4. Piloto de pago (**spec 025**) | Tiers y precios en Patreon, reglas de tier en el panel, edad mínima a 18 si se publica fan art subido de tono, revisión legal, pledge real de prueba, checklist de lanzamiento | precios, abogado, pledge |
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
  de consistencia con una sola OC) o etapa 3 (publicar la web).
- 18 oct 2026: el usuario pide, antes de seguir, que recibir premios sea mucho más dinámico (los avisos de abajo a la
  derecha no le convencen). Entra como spec 015 «Premios con vida»; la publicación pasa a ser la 016 y el piloto la 017.
- 19 oct 2026: spec 015 «Premios con vida» implementada y validada (17/17 RF, 469 tests, E2E en los cuatro proyectos,
  205 kB como máximo por página); pendiente la prueba del usuario en su teléfono para cerrarla. Pedidos del usuario
  para después: botón de cerrar en «Probabilidades» (arreglo) y «Abrir todos» mucho más dinámico (spec 016).
- 20 oct 2026: spec 015 cerrada; el usuario la probó a mano. El repo pasa a público con dos ramas fijas, `main` y
  `pruebas` (la beta para el equipo).
- 23 oct 2026: Bruno entrega un paquete de diseño y una propuesta de spec de cartas por capas (PR #14 y #17) que no
  puede seguir; se integra aquí, partida en las specs 016 a 018. Decisiones del dueño: marcos y sello de Bruno,
  kawaii por defecto con Street pop como segundo tema (spec 022), Expediciones dentro del espacio de juegos (020).
  Renumeración: publicar pasa a la 023 y el piloto a la 024.
- 23 oct 2026: spec 016 cerrada (editor de capas aprobado). **Decisión del dueño: todas las cartas serán cartas por
  capas** con el sistema de Bruno; el montaje con el marco de Pencil deja de ser la forma de hacer cartas. Las specs
  017 y 018 se replantean con esa premisa.
- 25 oct 2026: spec 020 «Juegos: Expediciones» aprobada e implementada (30 RF): mapa con zonas y niebla, equipos de 1 a
  3 cartas con terreno, rol, holo y vínculo, calificación y botín fijo a la vista, 2 espacios, reporte con frases, sobre
  al azar gratis con probabilidad publicada y panel con zonas y simulador. Decisión del dueño en la entrevista: el botín
  puede traer, de vez en cuando, un sobre al azar (gratis); sin cartas exclusivas por zona todavía. Pendientes la prueba
  en teléfono y la demo del dueño.
- 25 oct 2026: specs 018, 019 y 020 CERRADAS: el dueño las probó en su teléfono (demo por túnel HTTPS, giroscopio
  incluido) y todo funcionó. CI de GitHub en verde en todos los PR. Siguiente: spec 021 (tienda y cosméticos con galletas).
- 25 oct 2026: revisión de coherencia para monetizar, pedida por el dueño. Hallazgo: las fuentes gratis daban 60 u 80
  sobres al mes de las mismas colecciones que el tier (3 al mes). Decisiones «fuertes» del dueño en `docs/economia.md`:
  colecciones gratuitas (fan art) frente a de Patreon (OCs), probaditas (bienvenida y 1 sobre semanal en la tienda),
  tiers de 8 (8 + 8 el 18+), patron con insignia, cosméticos exclusivos y tercer espacio. Entran como **spec 021
  economía** (motor, antes de la tienda); la tienda pasa a la 022, Street pop a la 023, publicar a la 024 y el piloto a
  la 025. Recomendación pendiente: empezar la prueba de una OC ya y publicar la beta antes de la 023.
- 26 oct 2026: spec 021 «economía» implementada y validada (16/16 RF, 668 tests, E2E 78 en verde en los 4 proyectos;
  PR #27). Hallazgo de la prueba de la spec 006: en desarrollo React incluye en la página los datos que esperan los
  componentes de servidor, así que una página pública solo debe consultar lo mínimo (la consulta de patron leía el
  identificador de Patreon y salía en el álbum público; corregido). Pendiente: demo del dueño. La spec 022 (tienda)
  está redactada sobre la 021 y espera aprobación.
- 27 oct 2026: **economía versión 2** definida por el dueño (`docs/economia.md`): 5 rarezas con holo (común plana; rara,
  épica, legendaria y EX con parallax y efectos crecientes), sobres plata y gold, galletas (cosméticos y relojes) y
  diamantes (sobres; solo se ganan), botín de expedición al azar, repetidas para subir de nivel o hacer polvo y fabricar,
  y cuatro tiers de Patreon (booster y premium 1 a 3). Decisiones: los diamantes nunca se compran con dinero; EX es la
  rareza máxima y sigue siendo sugerente; se quita la separación de colecciones gratuitas y de Patreon de la spec 021
  (se quedan la insignia y los 3 equipos); cualquier tier de pago desbloquea el 18+. La spec 022 «tienda» queda
  sustituida. Nuevo orden: 022 rarezas y sobres plata/gold, 023 monedas y recompensas, 024 tiendas, 025 repetidas,
  026 tiers de Patreon; después Street pop (027), publicar (028) y piloto (029).
- 28 oct 2026: maquetas de la spec 022 aprobadas (5 marcos nuevos y tabla doble). El dueño quiere la apertura de
  sobres de Bruno: su «Laboratorio de sobres» (sobre por capas de 1000 × 1750, sticker que se despega con el dedo,
  dientes, foil y volumen, sonidos sintetizados, mazo de cartas que se pasan deslizando) estaba en su paquete original y
  ahora se copia a `docs/waifu-baker/waifu-baker/abridor-sobres/` como referencia. Entra como **spec 023**, justo después
  de la 022; el aspecto de los sobres plata y gold se define ahí. Renumeración: 024 monedas y recompensas, 025 tiendas,
  026 repetidas, 027 tiers de Patreon, 028 Street pop, 029 publicar, 030 piloto.
