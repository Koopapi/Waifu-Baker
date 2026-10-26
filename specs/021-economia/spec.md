# Spec 021 — Economía: colecciones gratuitas y de Patreon, probadita y beneficios de patron

Estado: borrador para aprobación del dueño (25 oct 2026).

## Contexto y objetivo
Hoy cualquier colección publicada sale en todas las fuentes gratis (sobre cada 12 h, día 7, expediciones), así que un
jugador que no paga saca de la misma colección 60 u 80 sobres al mes frente a los 3 del tier. Esta spec separa las
colecciones en **gratuitas** (el fan art de promoción) y **de Patreon** (las OCs): lo gratis solo da gratis, las de
Patreon llegan con la suscripción, y el jugador gratis las conoce por dos probaditas y por avisos claros de cómo
conseguirlas. Además da al patron lo que lo distingue sin tocar el sorteo: insignia y un tercer espacio de expedición.
Las reglas completas están en `docs/economia.md`.

## Usuarios / actores
- **Coleccionista** sin suscripción (jugador gratis).
- **Patron**: coleccionista con un tier activo que tenga reglas de sobres.
- **Visitante** del álbum público.
- **Administrador**.

## Historias de usuario
- H1: Como dueño quiero que pagar la suscripción sea la única forma regular de conseguir las colecciones de OCs.
- H2: Como jugador gratis quiero saber qué me falta y cómo conseguirlo, sin sentirme engañado.
- H3: Como jugador gratis quiero probar lo bueno una vez para decidir si me suscribo.
- H4: Como patron quiero que se note que apoyo, sin que me regalen ventajas en el sorteo.

## Vocabulario
- **Colección gratuita**: marcada así por el administrador; sale en las fuentes gratis. Siempre SFW.
- **Colección de Patreon**: la que no es gratuita (por defecto). Llega con la suscripción.
- **Fuentes gratis**: el sobre cada 12 h y el del día 7 (spec 009) y el sobre de expedición (spec 020).
- **Probadita**: el sobre de bienvenida (spec 001) y el sobre semanal de la tienda (spec 022).
- **Patron**: coleccionista cuya membresía de Patreon está activa en un tier con reglas de sobres.

## Requisitos funcionales (criterios de aceptación en EARS)

### Colecciones
- RF-1: EL SISTEMA permitirá al administrador marcar cada colección como gratuita o de Patreon, de Patreon por defecto.
- RF-2: SI el administrador marca como gratuita una colección 18+, ENTONCES EL SISTEMA no lo aceptará e informará del
  motivo.
- RF-3: EL SISTEMA mostrará en el panel, en la lista de colecciones y en cada colección, si es gratuita o de Patreon.

### Fuentes gratis
- RF-4: CUANDO el coleccionista reclame el sobre gratis cada 12 h, EL SISTEMA solo le ofrecerá colecciones gratuitas
  publicadas (sustituye a la elección de la spec 009, RF-4).
- RF-5: CUANDO el coleccionista reclame el sobre del día 7, EL SISTEMA solo le ofrecerá colecciones gratuitas publicadas
  (sustituye a la elección de la spec 009, RF-9).
- RF-6: CUANDO una expedición gane un sobre, EL SISTEMA solo lo dará de colecciones gratuitas publicadas (sustituye a la
  elección de la spec 020, RF-22).
- RF-7: SI no hay ninguna colección gratuita publicada, ENTONCES EL SISTEMA no concederá sobres por esas fuentes,
  conservará lo que el coleccionista tenga por reclamar y le explicará que todavía no hay colecciones gratuitas.
- RF-8: EL SISTEMA permitirá elegir como colección de bienvenida cualquier colección SFW publicada, gratuita o de
  Patreon.

### Cómo se consigue cada colección
- RF-9: MIENTRAS el coleccionista no sea patron, EL SISTEMA le mostrará en cada colección de Patreon que vea (lista de
  colecciones, álbum de la colección y «Mis sobres») que llega con la suscripción, con un enlace a la página de Patreon.
- RF-10: EL SISTEMA indicará en la página de Probabilidades, junto a cada colección, si se consigue gratis o con la
  suscripción.

### Beneficios de patron
- RF-11: MIENTRAS el coleccionista sea patron, EL SISTEMA mostrará una insignia de patron en su cuenta y en su álbum
  público.
- RF-12: CUANDO el coleccionista deje de ser patron, EL SISTEMA quitará la insignia en la siguiente lectura de su
  membresía.
- RF-13: MIENTRAS el coleccionista sea patron, EL SISTEMA le dará 3 espacios de expedición en lugar de 2.
- RF-14: SI un coleccionista con 3 expediciones en curso deja de ser patron, ENTONCES EL SISTEMA dejará terminar las
  tres y no le permitirá enviar otra hasta que tenga menos de 2 en curso.
- RF-15: MIENTRAS el coleccionista no sea patron, EL SISTEMA le mostrará en Expediciones que el tercer espacio llega con
  la suscripción, con un enlace a la página de Patreon.

### Tiers
- RF-16: CUANDO el administrador añada una regla de tier, EL SISTEMA propondrá 8 sobres al mes.

## Requisitos no funcionales
- El servidor decide qué colecciones ofrece cada fuente; el navegador no puede pedir otra.
- Los sobres ya concedidos no cambian: si una colección pasa de gratuita a de Patreon, los sobres sellados que ya
  tenía el coleccionista se conservan y se abren.
- Textos nuevos en inglés y español; el enlace a Patreon sale de la configuración (sin direcciones fijas en el código).
- Sistema de diseño: la insignia y los avisos con componentes de `ui/`; maqueta en Pencil de la insignia y del aviso
  en una colección.

## Casos límite
- Colección gratuita archivada: deja de ofrecerse en las fuentes gratis.
- Colección de bienvenida de Patreon y ninguna gratuita publicada: la bienvenida llega; el sobre cada 12 h espera (RF-7).
- Patron con solo el tier «Free»: no es patron (ya lo dice la spec 001, RN-25).
- Membresía con cobro pendiente o reembolsada: no es patron mientras no esté activa.
- Cuenta borrada y recuperada: vuelve a ser patron si su membresía sigue activa.
- Jugador con 3 expediciones fuera que deja de ser patron y cancela una: sigue sin poder enviar hasta bajar de 2.

## Fuera de alcance
- La tienda, los sobres con galletas y los cosméticos exclusivos de patron (spec 022).
- Acceso anticipado a sets nuevos (rechazado el 25 oct 2026).
- Cambiar probabilidades, rara garantizada o protección de mala suerte por ser patron.
- Vender galletas, sobres o cualquier cosa por dinero fuera de Patreon.
- Colecciones gratuitas 18+.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde (E2E en 4 proyectos): marcar una colección gratuita, sobre
cada 12 h y día 7 solo con gratuitas, sobre de expedición solo gratuito, sin gratuitas publicadas, avisos y enlace en
las colecciones de Patreon y en Probabilidades, insignia que aparece y desaparece con la membresía simulada, tercer
espacio con membresía simulada y su pérdida; demo manual del dueño.

## Decisiones (25 oct 2026)
- Lo gratis solo da gratis; las OCs son de Patreon.
- Probaditas: bienvenida (OCs) y 1 sobre de Patreon a la semana en la tienda (spec 022).
- Tiers: 8 SFW; 18+: 8 SFW + 8 adultos.
- Patron: insignia, cosméticos exclusivos (spec 022) y tercer espacio de expedición; sin acceso anticipado.
- Derivadas, para que el dueño las confirme al aprobar: de Patreon por defecto al crear una colección; la insignia se
  quita en la siguiente lectura de la membresía (hasta 15 minutos, spec 001); con 3 expediciones en curso al dejar el
  tier, terminan las tres.

## Dudas abiertas
- Ninguna.
