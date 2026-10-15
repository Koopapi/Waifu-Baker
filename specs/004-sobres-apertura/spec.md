# Spec 004 — Sobres: concesión y apertura

## Contexto y objetivo
El panel ya permite crear colecciones, publicarlas con probabilidades públicas y regalar sobres.
Falta el lado del coleccionista: ver los sobres que tiene, abrirlos con la experiencia animada del
laboratorio y que las cartas queden en su colección. El contenido de cada sobre debe decidirse en
el servidor, una sola vez, con las probabilidades publicadas y de forma auditable, porque es lo que
el usuario paga. Esta spec no depende de Patreon: los sobres llegan hoy por regalo del panel y por
el sobre de bienvenida; la concesión mensual por tier llega con la spec 001.

## Usuarios / actores
- **Usuario**: coleccionista con sesión iniciada.
- **Administrador**: configura la protección de mala suerte de cada colección.

Conceptos:
- **Sobre**: sellado, abierto o anulado. Pertenece a un usuario y a una colección.
- **Apertura**: resultado inmutable de abrir un sobre (cartas, holo, versión de probabilidades,
  semilla y tiradas).
- **Colección del usuario**: cartas que tiene, con su cantidad; las versiones holo cuentan aparte.
- **Protección de mala suerte (pity)**: tras N−1 sobres seguidos de una colección sin carta épica o
  superior, el siguiente garantiza una.

## Historias de usuario
- H1: Como usuario quiero ver cuántos sobres sin abrir tengo de cada colección.
- H2: Como usuario quiero abrir un sobre con la animación y ver mis cartas reales.
- H3: Como usuario quiero que si abro dos veces el mismo sobre, por error o por recargar, no pierda ni duplique nada.
- H4: Como usuario quiero que las cartas repetidas sumen a las que ya tengo.
- H5: Como usuario quiero abrir de golpe muchos sobres acumulados y ver todas las cartas.
- H6: Como usuario quiero que, tras una mala racha, el sistema me garantice una carta buena.
- H7: Como administrador quiero fijar en cada colección cada cuántos sobres actúa esa garantía.

## Requisitos funcionales (criterios de aceptación en EARS)

### Mis sobres
- RF-1: MIENTRAS un usuario tenga sesión, EL SISTEMA mostrará en «Mis sobres» sus sobres sin abrir agrupados por colección, con la cantidad de cada una.
- RF-2: SI alguien sin sesión pide «Mis sobres» o abrir un sobre, ENTONCES EL SISTEMA lo llevará al inicio de sesión y después de vuelta a donde estaba.
- RF-3: SI un usuario sin la verificación de edad tiene sobres de una colección 18+, ENTONCES EL SISTEMA no le mostrará su contenido ni le dejará abrirlos, y le indicará cuántos tiene y cómo verificar su edad.
- RF-4: EL SISTEMA conservará los sobres sin abrir sin fecha de caducidad, también si el usuario deja de ser patrón o la colección se archiva.

### Apertura
- RF-5: CUANDO un usuario pide abrir un sobre suyo sellado, EL SISTEMA decidirá su contenido en el servidor con las probabilidades publicadas de la colección y un generador aleatorio criptográfico, lo guardará y solo entonces lo enviará al navegador.
- RF-6: SI se pide abrir un sobre ya abierto (doble clic, dos pestañas o reintento), ENTONCES EL SISTEMA devolverá el mismo resultado sin abrir otro ni sumar cartas.
- RF-7: SI el sobre no existe, no es del usuario o está anulado, ENTONCES EL SISTEMA responderá que no existe.
- RF-8: SI la petición procede de Bélgica, ENTONCES EL SISTEMA no abrirá el sobre, conservará el sobre e informará del motivo legal.
- RF-9: EL SISTEMA guardará con cada apertura la versión de probabilidades usada, la semilla, las tiradas, si actuó la protección y las cartas resultantes, sin permitir modificarlas después.
- RF-10: CUANDO se abre un sobre, EL SISTEMA añadirá cada carta a la colección del usuario sumando una unidad si ya la tenía; una carta que sale holo se suma a su versión holo.
- RF-11: EL SISTEMA indicará en el resultado qué cartas son nuevas para el usuario y cuántas tiene de cada una tras la apertura.

### Protección de mala suerte
- RF-12: MIENTRAS una colección esté en borrador, EL SISTEMA permitirá al administrador fijar N entre 0 y 100 (10 por defecto; 0 desactiva la protección), y lo congelará al publicar junto con las probabilidades.
- RF-13: MIENTRAS un usuario lleve N−1 sobres seguidos de una colección sin ninguna carta épica o superior, EL SISTEMA garantizará al menos una carta épica o superior en su siguiente sobre de esa colección.
- RF-14: CUANDO un sobre traiga al menos una carta épica o superior, EL SISTEMA reiniciará a cero el contador de ese usuario y colección.
- RF-15: EL SISTEMA publicará la regla de protección de cada colección (su N) en la página de probabilidades.

### Experiencia
- RF-16: CUANDO el usuario abre un sobre, EL SISTEMA mostrará la apertura animada del laboratorio (rasgado, abanico, volteo y revelado por rareza) con las cartas reales y su efecto holo.
- RF-17: SI el usuario recarga o vuelve a la página a mitad de una apertura, ENTONCES EL SISTEMA le volverá a mostrar ese resultado sin abrir otro sobre.
- RF-18: MIENTRAS el usuario tenga más de un sobre sellado de una colección, EL SISTEMA ofrecerá «Abrir todos», que abrirá hasta 50 de esa colección y mostrará todas las cartas obtenidas en una cuadrícula, con las nuevas y las de mayor rareza destacadas.
- RF-19: EL SISTEMA abrirá cada sobre de «Abrir todos» por separado y con las mismas reglas que una apertura individual, incluida la protección.

### Seguridad
- RF-20: EL SISTEMA servirá la imagen de una carta solo a quien la posee, mediante enlaces firmados que caducan a los 10 minutos.
- RF-21: SI un usuario supera 10 peticiones de apertura en un minuto, ENTONCES EL SISTEMA rechazará las siguientes hasta que pase el minuto, sin abrir sobres.

## Requisitos no funcionales
- La respuesta de una apertura individual tarda menos de 500 ms en el servidor local; «Abrir todos» con 50 sobres, menos de 5 s.
- La apertura cumple el rendimiento de la constitución (60 fps de referencia, `prefers-reduced-motion`).
- Funciona en escritorio y móvil, con ratón, toque y teclado.
- Textos en español; errores con causa y acción.

## Casos límite
- Dos peticiones simultáneas para el mismo sobre: una lo abre y la otra recibe el mismo resultado (RF-6).
- Sobre de una colección archivada: se puede abrir con las probabilidades con las que se publicó.
- Usuario con sobres 18+ que pierde la verificación: los sobres se conservan, pero no se pueden abrir hasta volver a verificar (RF-3, RF-4).
- La última ranura no tiene peso para épica o superior y toca la protección: se usan los pesos de épica o superior sumados de todas las ranuras; si tampoco hay, la protección no actúa y queda registrado.
- Cuenta borrada con sobres: no se pueden abrir.
- «Abrir todos» interrumpido a mitad: los sobres ya abiertos quedan abiertos y guardados; el resto sigue sellado.

## Fuera de alcance
- Inicio de sesión con Patreon, sincronización de tiers y concesión mensual (spec 001); hasta entonces los sobres llegan por regalo y bienvenida.
- Página de colección, binder y álbum público (spec 006); aquí solo se guardan las cartas y se muestran en el resultado.
- Intercambio, venta, conversión de duplicados o cualquier economía interna.
- Logros, misiones o premios por completar una colección.
- Sonido de la apertura (pendiente de assets) y la versión 3D.

## Criterios de finalización
Todos los RF con test en verde: unitarios del sorteo con protección (semilla fija); integración de
la transacción de apertura, incluida la concurrencia (dos aperturas simultáneas del mismo sobre →
un solo resultado), los duplicados, el bloqueo 18+ y Bélgica; E2E: regalar 3 sobres desde el panel →
el usuario abre uno con la animación → «Abrir todos» → la colección refleja las cartas y las
repetidas suman.

## Dudas abiertas
- Ninguna. Decisiones de la entrevista (15 oct 2026): duplicados se acumulan; protección épica o
  superior configurable por colección (10 por defecto) con contador por usuario y colección;
  apertura uno a uno con «Abrir todos»; los sobres no caducan. Las cartas holo cuentan como
  versión aparte en la colección (confirmado). Spec aprobada el 15 oct 2026.
