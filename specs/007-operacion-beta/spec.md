# Spec 007 — Operación y cumplimiento (parte para la beta)

## Contexto y objetivo
La web ya funciona en local de punta a punta. Antes de abrirla a testers hace falta lo que no es
funcionalidad pero sí obligación: páginas legales claras, una edad mínima, saber cuándo algo falla,
métricas básicas de uso, copias de seguridad que se puedan restaurar y pruebas automáticas en cada
cambio. El despliegue en un servidor, las cabeceras de seguridad avanzadas y la cola de trabajos
quedan para la segunda parte de esta spec.

## Usuarios / actores
- **Visitante**: lee las páginas legales sin sesión.
- **Coleccionista**: acepta los términos y confirma su edad al entrar.
- **Administrador**: ve métricas, errores de copias y el estado de la última copia.
- **Sistema de integración continua (GitHub)**: ejecuta las pruebas en cada cambio.

## Historias de usuario
- H1: Como visitante quiero leer los términos, la privacidad y cómo funciona el contenido antes de entrar.
- H2: Como responsable quiero que solo usen la web personas de 16 años o más que aceptaron los términos.
- H3: Como responsable quiero enterarme de los errores sin exponer datos de los usuarios.
- H4: Como responsable quiero ver cómo se usa la beta sin rastrear a nadie.
- H5: Como responsable quiero poder recuperar los datos si algo se rompe.
- H6: Como desarrollador quiero que cada cambio pase las pruebas antes de darlo por bueno.

## Requisitos funcionales (criterios de aceptación en EARS)

### Edad y aceptación de términos
- RF-1: CUANDO alguien entra por primera vez, EL SISTEMA le pedirá confirmar que tiene 16 años o más y aceptar los términos antes de usar sus sobres, su colección o su cuenta.
- RF-2: MIENTRAS un usuario no haya confirmado su edad ni aceptado los términos, EL SISTEMA solo le dejará ver las páginas públicas y cerrar sesión.
- RF-3: CUANDO se publique una versión nueva de los términos, EL SISTEMA pedirá a cada usuario aceptarla en su siguiente visita.

### Páginas legales
- RF-4: EL SISTEMA publicará, en inglés y en español y sin necesidad de sesión, los términos de uso, la política de privacidad y una página sobre el contenido y el uso de IA, enlazadas desde el pie de todas las páginas junto a la de probabilidades.
- RF-5: Los términos explicarán al menos: que el operador es «Waifu Baker»; que las cartas y las galletas son digitales, sin valor monetario y no intercambiables; que los sobres son aleatorios con probabilidades públicas; la edad mínima de 16 años y los requisitos del contenido 18+; que en Bélgica no se pueden abrir sobres; que los pagos y reembolsos son los de Patreon; y cómo se borra una cuenta.
- RF-6: La política de privacidad explicará qué datos se guardan y para qué, las cookies que usa la web (todas esenciales), el envío de errores a Sentry sin datos personales, cuánto tiempo se conservan los datos y cómo pedir acceso o borrado.
- RF-7: EL SISTEMA mostrará en las páginas legales el correo de contacto configurado; SI no hay correo configurado, ENTONCES mostrará la página de Patreon como vía de contacto.
- RF-8: EL SISTEMA mostrará en cada página legal su versión y la fecha de su última actualización.

### Errores
- RF-9: CUANDO ocurre un error no controlado en el servidor o en el navegador, EL SISTEMA lo enviará a Sentry identificando al usuario solo por su identificador interno, sin nombre, avatar ni identificador de Patreon.
- RF-10: SI Sentry no está configurado, ENTONCES EL SISTEMA funcionará igual sin enviar nada.

### Métricas
- RF-11: EL SISTEMA mostrará en el panel, por día y para los últimos 30 días: usuarios nuevos, usuarios activos, sobres abiertos, sobres gratis reclamados, recompensas diarias reclamadas y álbumes públicos activos.
- RF-12: EL SISTEMA calculará las métricas con sus propios datos, sin cookies de seguimiento ni servicios externos.

### Copias de seguridad
- RF-13: EL SISTEMA hará cada día una copia cifrada de la base de datos y de las imágenes de las cartas en la carpeta configurada.
- RF-14: EL SISTEMA borrará las copias con más de 30 días.
- RF-15: EL SISTEMA permitirá restaurar una copia en una base de datos aparte y comprobar que está completa, sin tocar la base de datos en uso.
- RF-16: SI una copia falla, ENTONCES EL SISTEMA lo registrará, lo enviará a Sentry y lo mostrará en el panel.
- RF-17: EL SISTEMA mostrará en el panel la fecha y el tamaño de la última copia correcta.

### Integración continua
- RF-18: CUANDO se sube un cambio a GitHub, EL SISTEMA ejecutará la revisión de código, la comprobación de tipos, los tests unitarios y de integración y los E2E de escritorio, y marcará el cambio como fallido si alguno falla.

## Requisitos no funcionales
- Ningún texto legal ni métrica usa servicios de seguimiento ni cookies que no sean esenciales (por eso no hace falta aviso de cookies).
- Una copia diaria de la beta tarda menos de 1 minuto y se puede restaurar en menos de 5.
- Textos en inglés y español (spec 008).

## Casos límite
- Usuario que ya existía antes de esta spec: se le pide la confirmación en su siguiente visita.
- Usuario que entra con el enlace de un álbum público: el álbum se ve sin confirmar nada (es público).
- Carpeta de copias inexistente o sin permisos: la copia falla y se avisa (RF-16).
- Contraseña de cifrado de copias ausente: no se hacen copias y el panel lo indica.

## Fuera de alcance
- Desplegar en un servidor, el dominio, las cabeceras CSP y HSTS y la cola de trabajos (parte 2 de la spec 007).
- Revisión de los textos por un abogado: los textos son una base clara, no asesoría legal.
- Descarga de los propios datos en un archivo.
- Analítica externa, aviso de cookies y monitorización de disponibilidad.

## Criterios de finalización
Todos los RF con test en verde; E2E: un usuario nuevo entra → debe confirmar edad y términos para ver
sus sobres → las páginas legales se leen sin sesión en los dos idiomas con su versión y contacto → el
administrador ve las métricas y la última copia → una copia se hace, se cifra y se restaura en una base
de datos aparte con los mismos datos → la integración continua de GitHub pasa en verde.

## Dudas abiertas
- Ninguna. Decisiones de la entrevista (15 oct 2026): en los textos figura solo el nombre comercial
  «Waifu Baker»; edad mínima 16 años (18+ y tier adulto para el contenido adulto); errores con Sentry
  gratuito; métricas propias sin cookies; copias diarias cifradas en una carpeta local durante 30
  días; contacto por un correo propio del proyecto, configurable.
- Riesgos que asume el usuario: con solo el nombre comercial los textos legales tienen menos peso; y
  una edad mínima de 16 años obliga a vigilar que todo lo que entre en colecciones SFW sea apto para
  esa edad, dado el estilo sugerente.
- Spec aprobada el 15 oct 2026.
