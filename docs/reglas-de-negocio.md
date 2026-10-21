# Reglas de negocio — Waifu Baker TCG

Resumen de todas las reglas acordadas, en un solo sitio. **La fuente de verdad son las specs**: cada
regla cita la suya. Si una regla cambia, se cambia primero la spec y después este documento.

Estado de cada regla: **Vigente** (construida y con tests) o **Aprobada** (en una spec aprobada,
pendiente de construir).

Última actualización: 15 de octubre de 2026. Todas las reglas de las specs 001, 003, 004, 006, 007 (parte beta), 008 y 009 están vigentes.

---

## 1. Principios que no se negocian

Vienen de la constitución (`docs/constitution.md`) y mandan sobre cualquier otra regla.

| # | Regla |
|---|---|
| RN-1 | El contenido de un sobre lo decide siempre el servidor, con un generador aleatorio criptográfico, y se guarda antes de mostrarse. El navegador solo anima. |
| RN-2 | Las probabilidades de cada colección son públicas y no cambian una vez publicada. |
| RN-3 | No hay intercambio de cartas, ni venta, ni retirada de dinero, ni premios por completar una colección. Las cartas no tienen valor monetario. |
| RN-4 | En Bélgica no se pueden abrir sobres (la ley los trata como juego de azar). Los sobres se conservan. |
| RN-5 | Las cartas de pago solo usan personajes originales y adultos. Ningún personaje con licencia en contenido de pago. |
| RN-6 | El contenido 18+ exige doble verificación: declaración de edad más tier adulto de Patreon. |
| RN-7 | De cada persona solo se guarda lo mínimo: identificador, nombre y avatar de Patreon, y su estado de membresía. Nunca el email. |
| RN-8 | Las ilustraciones se declaran generadas con IA en la web. |

## 2. Cuentas y Patreon

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-10 | Se entra con la cuenta de Patreon; no hace falta ser patron. | Vigente | 001 |
| RN-11 | Al entrar se lee el estado de membresía (tiers, estado de patron, último cobro) y se vuelve a leer si tiene más de 15 minutos. | Vigente | 001 RF-1, RF-3 |
| RN-12 | Si Patreon no responde, se entra igual con el último estado conocido. | Vigente | 001 RF-4 |
| RN-13 | El administrador es la cuenta de creador de Patreon configurada en el servidor. Hay un solo rol de administrador. | Vigente | 003 |
| RN-14 | Borrar la cuenta la desactiva: se cierra la sesión y se oculta el álbum público. | Vigente | 001 RF-22 |
| RN-15 | Durante 30 días tras borrarla, volver a entrar con el mismo Patreon la recupera con todo. | Vigente | 001 RF-23 |
| RN-16 | A los 30 días se borra de forma definitiva: perfil, cartas, sobres y álbum. El registro de aperturas se conserva sin datos personales. | Vigente | 001 RF-24 |
| RN-17 | Quien vuelve tras el borrado definitivo empieza con una cuenta nueva y vacía. | Vigente | 001 RF-25 |

## 3. Cómo se consiguen sobres

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-20 | **Bienvenida**: 1 sobre de la colección de bienvenida al entrar por primera vez, sea patron o no. | Vigente | 001 RF-6 |
| RN-21 | La colección de bienvenida la elige el administrador en el panel; solo puede haber una y debe ser SFW y publicada. | Vigente | 001 RF-5 |
| RN-22 | Si al entrar no hay colección de bienvenida, el sobre llega en el primer inicio de sesión en que la haya. | Vigente | 001 RF-7 |
| RN-23 | Un solo sobre de bienvenida por cuenta de Patreon en toda su historia, aunque borre la cuenta y vuelva. | Vigente | 001 RF-8 |
| RN-24 | **Suscripción**: cada cobro pagado concede los sobres de las reglas de sus tiers, una sola vez por cobro. | Vigente | 001 RF-9 |
| RN-25 | Con varios tiers a la vez se suman los sobres de todos. Un tier sin reglas (por ejemplo «Free») no concede sobres de suscripción. | Vigente | 001 |
| RN-26 | Subir a un tier con más sobres concede la diferencia al confirmarse el pago, una sola vez por ciclo. Bajar y volver a subir no da sobres extra. | Vigente | 001 RF-10, RF-11 |
| RN-27 | Quien vincula su cuenta tarde solo recibe los sobres de su último cobro pagado, no los de meses anteriores. | Vigente | 001 RF-12 |
| RN-28 | Un cobro pendiente o rechazado no concede nada hasta que pase a pagado. | Vigente | 001 |
| RN-29 | Si un cobro pasa a reembolsado o fraude, se anulan los sobres sin abrir de ese cobro; lo ya abierto se queda y se anota en el historial. | Vigente | 001 RF-14 |
| RN-30 | Al cancelar o dejar de pagar se conservan los sobres sin abrir y dejan de llegar nuevos. | Vigente | 001 RF-13 |
| RN-31 | Las reglas de cada tier (colecciones y sobres al mes, de 1 a 50) se configuran en el panel y se aplican desde el siguiente cobro de cada miembro. | Vigente | 003 RF-24 |
| RN-32 | **Regalos**: el administrador puede regalar de 1 a 20 sobres de una colección publicada, con un motivo de 3 a 200 caracteres. Nunca sobres 18+ a quien no está verificado. | Vigente | 003 RF-25, RF-26 |
| RN-33 | Los avisos de Patreon se aceptan solo con firma válida, y siempre se aplica el estado actual que devuelve Patreon: un aviso repetido o desordenado nunca da sobres de más. | Vigente | 001 RF-15, RF-16 |
| RN-34 | Cada 6 horas se revisan todos los miembros para recuperar avisos perdidos. | Vigente | 001 RF-17 |

## 4. Sobres

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-40 | Los sobres sin abrir no caducan nunca, aunque la persona deje de ser patron o la colección se archive. | Vigente | 004 RF-4 |
| RN-41 | Un sobre se abre una sola vez. Repetir la petición (doble clic, dos pestañas, recarga) devuelve el mismo resultado. | Vigente | 004 RF-6, RF-17 |
| RN-42 | Cada apertura guarda la versión de probabilidades, la semilla, las tiradas, si actuó la protección y las cartas. No se puede modificar después. | Vigente | 004 RF-9 |
| RN-43 | «Abrir todos» abre hasta 50 sobres de una colección, cada uno por separado y con las mismas reglas. | Vigente | 004 RF-18, RF-19 |
| RN-44 | Como máximo 10 aperturas por minuto y usuario. | Vigente | 004 RF-21 |
| RN-45 | Las cartas repetidas se acumulan (x2, x3…). Una carta holo cuenta aparte de su versión normal. | Vigente | 004 RF-10 |

## 5. Probabilidades, rarezas y protección

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-50 | Rarezas, de menor a mayor: Común, Poco común, Rara, Épica, Legendaria, Secreta. | Vigente | 003 |
| RN-51 | Cada sobre tiene entre 1 y 10 cartas (5 por defecto). Cada ranura tiene sus porcentajes por rareza, que deben sumar 100 %. Dentro de una rareza, todas las cartas tienen la misma probabilidad. | Vigente | 003 RF-6, RF-20 |
| RN-52 | Probabilidades iniciales de una colección nueva: ranuras normales 70 / 25 / 5 (común / poco común / rara); penúltima ranura 60 / 30 / 8 / 2 (poco común / rara / épica / legendaria); última ranura con rara o mejor garantizada: 75 / 18 / 6 / 1 (rara / épica / legendaria / secreta). | Vigente | 003 |
| RN-53 | Una carta rara o mejor puede salir holo; la probabilidad se fija por colección (20 % por defecto). | Vigente | 003 RF-20 |
| RN-54 | **Protección de mala suerte**: tras N−1 sobres seguidos de una colección sin épica o mejor, el siguiente garantiza al menos una (sustituye la carta de la última ranura). N es de 0 a 100, 10 por defecto; 0 la desactiva. | Vigente | 004 RF-12, RF-13 |
| RN-55 | El contador de protección es de cada usuario y colección, y vuelve a cero al salir una épica o mejor. | Vigente | 004 RF-14 |
| RN-56 | La página pública de probabilidades muestra, por colección, cada ranura, la probabilidad de holo, la regla de protección y la fecha y versión de publicación. | Vigente | 003 RF-21, 004 RF-15 |

## 6. Colecciones y cartas (panel)

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-60 | Una colección nace en borrador, con código único de 2 a 8 letras o números, nombre de hasta 80 caracteres e indicación SFW o 18+. | Vigente | 003 RF-4 |
| RN-61 | En borrador no la ven los usuarios ni se usa para sobres. | Vigente | 003 RF-5 |
| RN-62 | Para publicar: cada ranura suma 100 %, toda rareza con probabilidad tiene cartas, toda carta tiene personaje, nombre, rareza e imagen, y en una 18+ todas están revisadas. Si algo falla, se listan todos los problemas. | Vigente | 003 RF-6, RF-7 |
| RN-63 | Publicada, no se pueden añadir ni quitar cartas, ni cambiar rarezas, números o probabilidades. Sí nombres, textos y arte. | Vigente | 003 RF-8 |
| RN-64 | Archivada, deja de usarse en concesiones nuevas; lo obtenido y los sobres sin abrir se conservan y se pueden abrir. | Vigente | 003 RF-9 |
| RN-65 | Imágenes aceptadas: PNG, JPEG o WebP, hasta 20 MB y al menos 600 px de ancho. Una imagen idéntica a otra de la misma colección se rechaza. | Vigente | 003 RF-12, RF-13 |
| RN-66 | La carta no lleva textos: solo el marco del color de su rareza, el sello WB y su número. | Vigente | DESIGN.md |
| RN-67 | Cada carta 18+ debe revisarla un administrador con la confirmación «personaje claramente adulto». Cambiar su imagen anula la revisión. | Vigente | 003 RF-18, RF-19 |
| RN-68 | Todo cambio del panel queda en el historial con autor, fecha, valores anteriores y nuevos. | Vigente | 003 RF-3 |
| RN-69 | Quien no es administrador recibe un 404 en el panel, y el intento queda registrado. | Vigente | 003 RF-2 |

## 7. Contenido 18+

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-70 | Para ver o abrir contenido 18+ hacen falta la declaración de edad y un tier adulto activo en el momento de verificarse. | Vigente | 001 RF-18, RF-19 |
| RN-71 | Sin verificación, las colecciones y sobres 18+ aparecen bloqueados, con una explicación de cómo verificarse. | Vigente | 004 RF-3, 006 RF-4 |
| RN-72 | La verificación es permanente: si después cancela o baja de tier, conserva y ve sus cartas 18+ y puede abrir los sobres 18+ que le queden. Solo deja de recibir nuevos. | Vigente | 001 RF-20 |
| RN-73 | Nada 18+ aparece nunca en un álbum público. | Vigente | 006 RF-14 |

## 8. Colección y álbum público

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-80 | «Mi colección» muestra cada colección con su progreso: cartas distintas obtenidas sobre el total (la holo no cuenta aparte). | Vigente | 006 RF-1 |
| RN-81 | De una carta que no se tiene solo se ve su número: ni imagen, ni nombre, ni rareza. | Vigente | 006 RF-3 |
| RN-82 | El álbum público está desactivado hasta que su dueño lo activa con un alias de 2 a 30 caracteres. | Vigente | 006 RF-8, RF-9 |
| RN-83 | El enlace del álbum es aleatorio y no adivinable. Desactivarlo lo apaga; reactivarlo recupera el mismo enlace; pedir uno nuevo invalida el anterior. | Vigente | 006 RF-9 a RF-11 |
| RN-84 | Hasta 5 cartas destacadas, propias y SFW, en el orden que elija su dueño. | Vigente | 006 RF-12 |
| RN-85 | El álbum público nunca muestra el nombre ni el identificador de Patreon, y solo usa imágenes reducidas con marca de agua. | Vigente | 006 RF-14, RF-15 |
| RN-86 | Los buscadores no indexan los álbumes públicos. | Vigente | 006 RF-17 |
| RN-87 | Las imágenes completas de las cartas solo se sirven a quien las posee, con enlaces que caducan a los 10 minutos. | Vigente | 004 RF-20 |

## 9. Idiomas

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-90 | La web está en inglés por defecto, y en español con el selector de cada página. La elección se recuerda un año en ese navegador. | Vigente | 008 |
| RN-91 | No se traduce el contenido creado por el administrador (nombres y textos de cartas, colecciones y personajes) ni el alias de un álbum. | Vigente | 008 RF-9 |

## 10. Sobres gratis, recompensa diaria y galletas

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-100 | Cada usuario recibe una carga de sobre gratis cada 12 horas, hasta 2 acumuladas. Al máximo, la siguiente no empieza a cargarse hasta gastar una. | Vigente | 009 RF-1, RF-2 |
| RN-101 | Un usuario nuevo empieza con 1 sobre gratis listo. | Vigente | 009 RF-3 |
| RN-102 | Al reclamar un sobre gratis, el usuario elige de qué colección SFW publicada lo quiere. Sin colecciones disponibles no se reclama y las cargas se conservan. | Vigente | 009 RF-4, RF-7 |
| RN-103 | Los sobres gratis y el del día 7 se abren con las probabilidades publicadas y la protección de su colección, como cualquier otro. | Vigente | 009 RF-8 |
| RN-104 | Recompensa diaria con racha de 7 días: 10, 10, 15, 15, 20 y 20 galletas los días 1 a 6, y un sobre de la colección SFW que se elija el día 7. Después empieza otra racha. | Vigente | 009 RF-9, RF-14 |
| RN-105 | Una recompensa por día; el día cambia a la medianoche de la zona horaria del navegador del usuario. Se reclama con un botón. | Vigente | 009 RF-10 |
| RN-106 | Cambiar de zona horaria no permite dos recompensas en menos de 20 horas. | Vigente | 009 RF-11 |
| RN-107 | Se puede fallar un día sin perder la racha; dos días seguidos sin reclamar la reinician al día 1. Las galletas ganadas se conservan. | Vigente | 009 RF-12, RF-13 |
| RN-108 | Las galletas no tienen valor monetario: no se compran, venden, transfieren ni cambian por dinero. Cada movimiento queda registrado y el saldo nunca baja de cero. | Vigente | 009 RF-17 a RF-19 |
| RN-109 | El administrador puede dar o quitar galletas con un motivo de 3 a 200 caracteres. | Vigente | 009 RF-21 |
| RN-110 | Al borrar una cuenta de forma definitiva se borran también sus cargas, su racha y sus galletas. | Vigente | 009 |

## 11. Edad, legales y operación

| # | Regla | Estado | Spec |
|---|---|---|---|
| RN-120 | Edad mínima para usar la web: 16 años por defecto (ver RN-127). Al entrar por primera vez hay que confirmarla y aceptar los términos; sin eso solo se ven las páginas públicas. | Vigente | 007 RF-1, RF-2 |
| RN-121 | Una versión nueva de los términos se vuelve a pedir en la siguiente visita. | Vigente | 007 RF-3 |
| RN-122 | Términos, privacidad y la página de contenido e IA son públicos, en inglés y español, con versión y fecha, y enlazados desde el pie de todas las páginas. El operador figura como «Waifu Baker». | Vigente | 007 RF-4 a RF-8 |
| RN-123 | Contacto legal: el correo configurado del proyecto o, si no lo hay, la página de Patreon. | Vigente | 007 RF-7 |
| RN-124 | Solo se usan cookies esenciales (sesión, idioma y zona horaria): no hay aviso de cookies ni analítica externa. | Vigente | 007 RF-6, RF-12 |
| RN-125 | Los errores se envían a Sentry solo con el identificador interno del usuario; sin Sentry configurado no se envía nada. | Vigente | 007 RF-9, RF-10 |
| RN-126 | Copia de seguridad diaria, cifrada, de la base de datos y de las imágenes; se conservan 30 días y se puede restaurar en una base aparte para comprobarla. | Vigente | 007 RF-13 a RF-15 |
| RN-127 | El administrador elige la edad mínima de la web, 16 o 18 años, con confirmación y registro en el historial. Hay que subirla a 18 antes de publicar contenido más subido de tono. | Vigente | 010 RF-17 |
| RN-128 | Si la edad mínima sube, cada usuario que confirmó una edad menor debe confirmar la nueva antes de seguir. Bajarla no pide nada. La bienvenida, los términos y la privacidad muestran siempre la edad vigente. | Vigente | 010 RF-18, RF-19 |

## 12. Demo local

| Regla | Descripción | Estado | Origen |
|---|---|---|---|
| RN-130 | `pnpm demo` crea desde cero una base de datos aparte (`waifu_baker_demo`) con la colección de fan art, un coleccionista (3 sobres sin abrir, cartas, 240 galletas, racha en el día 4 y álbum público) y un administrador. No toca los datos de desarrollo ni habla con Patreon. | Vigente | 010 RF-12 |
| RN-131 | Las cartas de fan art llevan nombres propios, nunca los nombres reales de los personajes. | Vigente | 010 RF-12 |
| RN-132 | En la demo se entra con un botón por papel (coleccionista o administrador), con una franja visible y un botón para cambiar de papel. El modo demo no existe en producción. | Vigente | 010 RF-13 a RF-15 |

---

## 13. Interfaz

| Regla | Descripción | Estado | Origen |
|---|---|---|---|
| RN-140 | Las acciones irreversibles o importantes (borrar la cuenta o una carta, publicar o archivar una colección, regenerar el enlace del álbum, subir la edad mínima) se confirman en un modal que explica qué pasará. | Vigente | 011 RF-12 |
| RN-141 | Las acciones reversibles se aplican al momento; si el servidor las rechaza se deshacen solas y se avisa. Mientras dura el aviso de éxito se pueden deshacer. | Vigente | 011 RF-10, RF-11 |

## 14. Moderación de álbumes

| Regla | Descripción | Estado | Origen |
|---|---|---|---|
| RN-150 | El administrador puede ocultar un álbum público con un motivo (alias ofensivo, suplantación, spam u otro) y una nota opcional de hasta 300 caracteres, tras confirmarlo. | Vigente | 012 RF-4 |
| RN-151 | Un álbum oculto se ve igual que uno inexistente («Este álbum no está disponible», sin vista previa para redes) y no cuenta como álbum activo. No se borra nada: alias, enlace y destacadas se conservan. | Vigente | 012 RF-5, RF-6 |
| RN-152 | El dueño de un álbum oculto ve el motivo y la nota en «Mi cuenta» y en los ajustes del álbum. No puede volver a publicarlo por su cuenta, ni desactivándolo y activándolo: tiene que pedir una revisión con un alias distinto. | Vigente | 012 RF-7, RF-8, RF-14 |
| RN-153 | Solo hay una revisión pendiente a la vez y entre dos peticiones pasan al menos 7 días. | Vigente | 012 RF-9, RF-10 |
| RN-154 | Aprobar aplica el alias propuesto y vuelve a publicar el álbum con el mismo enlace; rechazar lo deja oculto con una nota opcional para el dueño. | Vigente | 012 RF-11, RF-12 |
| RN-155 | Cada ocultación, petición, aprobación y rechazo queda en el historial con quién, cuándo, motivo, nota y alias antes y después. | Vigente | 012 RF-3, RF-13 |

## 15. Sonido y rendimiento de la apertura

| Regla | Descripción | Estado | Origen |
|---|---|---|---|
| RN-160 | Los sonidos son de dominio público (CC0) y su origen, autor y licencia constan junto a ellos en el repositorio. | Vigente | 013 RF-1 |
| RN-161 | Rasgar y voltear suenan igual para todas las cartas; una rara, épica, legendaria o secreta añade un sonido de su nivel. En «Abrir todos» suena una sola vez, con la mejor carta. | Vigente | 013 RF-2 a RF-5 |
| RN-162 | En los móviles que lo permiten (Android), una rara o mejor vibra; más en legendaria y secreta. | Vigente | 013 RF-9 |
| RN-163 | El sonido está activado por defecto. El botón de silencio de la apertura y de «Abrir todos» corta sonido y vibración, y se recuerda en ese dispositivo. | Vigente | 013 RF-7, RF-8, RF-10 |
| RN-164 | Ninguna página del coleccionista ni pública carga más de 250 kB de JavaScript comprimido al abrirse; la integración continua falla si alguna se pasa. | Vigente | 013 RF-11, RF-12 |

## 16. Sobres, sorteo y demo (estilo kawaii)

| Regla | Descripción | Estado | Origen |
|---|---|---|---|
| RN-170 | Un sobre no repite carta: si en una ranura sale una que ya está en el sobre, se elige otra de la misma rareza; solo se repite si esa rareza no tiene más cartas distintas. Las probabilidades por rareza no cambian y la página de probabilidades lo explica. | Vigente | 014 RF-21 |
| RN-171 | Cada apertura guarda la versión del sorteo con que se hizo (v1 antes de la spec 014, v2 sin repetidas), para poder auditarla. | Vigente | 014 RF-22 |
| RN-172 | Cada colección tiene su sobre: el compuesto, con la carta de portada que elige el administrador (o la de mayor rareza), o un sobre hecho a mano subido en el panel, que lo sustituye mientras exista. Es el mismo en «Mis sobres», la apertura y «Abrir todos». | Vigente | 014 RF-5 a RF-8 |
| RN-173 | El arte del sobre solo se sirve con sesión; el de una colección 18+, solo con la edad verificada o al administrador. | Vigente | 014 RF-8 |
| RN-174 | La demo local arranca en versión optimizada. En producción, la demo y la entrada sin Patreon solo existen en ese build local (`DEMO_LOCAL=1`, sin `SITE_URL`); nunca en la web publicada. | Vigente | 014 RF-23 |

## 17. Premios con vida

| Regla | Enunciado | Estado | Spec |
|---|---|---|---|
| RN-180 | Un premio no se avisa, se ve: las galletas vuelan desde la pegatina del día hasta el contador y el sobre hasta el acceso a «Mis sobres», que rebota; los contadores suben como un marcador, nunca de golpe. Nada bloquea la pantalla; con movimiento reducido no vuela nada y los contadores cambian directamente. | Vigente | 015 RF-1 a RF-4 |
| RN-181 | Una «llegada» es un sobre sellado recibido sin pedirlo: bienvenida (`promo`), regalo del administrador (`manual`) o suscripción (`tier_grant`). Los sobres gratis y los del día 7 no lo son; un sobre anulado tampoco. | Vigente | 015 RF-6, RF-7 |
| RN-182 | Las llegadas se celebran en el centro de la pantalla una sola vez (también desde varios dispositivos), todas juntas, con su origen, al cargar una página del coleccionista; nunca encima de la apertura ni de otra celebración. Se marcan celebradas al mostrarse, no al cerrarse. | Vigente | 015 RF-6, RF-7, RF-9 |
| RN-183 | En «Mis sobres», las llegadas posteriores a la última visita llevan «¡Nuevo!» con cuántas son; desaparece en la siguiente visita o al abrirlas. | Vigente | 015 RF-8 |
| RN-184 | Al reclamar la recompensa diaria, la pegatina del día se estampa antes de que vuele nada; el día 7 se celebra en el centro y, al cerrar, el sobre vuela. En el día de gracia (ayer sin reclamar, hoy todavía no, con racha que perder) la pegatina de hoy late y la pantalla avisa. | Vigente | 015 RF-5, RF-10, RF-11 |
| RN-185 | Las galletas al llegar, el sobre al aterrizar y una celebración al abrirse suenan (sonidos CC0, por el mismo motor y silencio de la apertura); solo la celebración vibra, suave y una vez. El botón de silencio está también en la cabecera del coleccionista. | Vigente | 015 RF-12 a RF-14 |
| RN-186 | Las pantallas del coleccionista no muestran avisos emergentes ni mensajes de éxito por reclamar; los lectores de pantalla reciben un anuncio de texto. Un fallo se muestra junto al botón, con «Reintentar» solo si falló la red. El panel de administración conserva sus avisos. | Vigente | 015 RF-15 a RF-17 |

## 18. Cartas por capas (parallax)

| Regla | Enunciado | Estado | Spec |
|---|---|---|---|
| RN-190 | Solo el administrador crea y edita cartas por capas, desde el panel: añadiendo capas a una carta existente o creando una carta nueva a partir de capas. Cada cambio queda registrado. | Aprobada | 016 RF-1, RF-2, RF-22, RF-23 |
| RN-191 | Una carta con capas se ve por capas, con el marco, la rareza y el sello de la carta por capas, sin el marco de Pencil y sin texto encima; una carta sin capas se ve como siempre. El número, el nombre y la rareza siguen saliendo de la base de datos. | Aprobada | 016 RF-15, RF-25, RF-53, RF-54, RF-58 |
| RN-192 | Las capas de imagen tienen la proporción 700 × 991 (±1 %), al menos 700 px de ancho, PNG, JPEG o WebP de hasta 20 MB; se guardan en WebP; como mucho 8 capas de imagen por carta (las partículas no cuentan). El sello de imagen no tiene que cumplir la proporción. | Aprobada | 016 RF-30 a RF-38 |
| RN-193 | Para guardar hace falta al menos una capa visible. Si otro administrador guardó antes, se avisa del conflicto: recargar o forzar a sabiendas. | Aprobada | 016 RF-17, RF-19 a RF-21 |
| RN-194 | Toda carta con capas tiene una imagen plana generada en el servidor (mezclas respetadas, partículas en reposo), que sustituye a la compuesta con Pencil donde se usa una imagen simple y, con marca de agua, en las zonas públicas. Las capas sueltas nunca se entregan sin sesión. | Aprobada | 016 RF-26 a RF-29, RF-61 a RF-63 |
| RN-195 | Al cambiar la rareza de una carta con capas cambian el marco y el sello de texto; un sello de imagen se mantiene con aviso; las partículas no cambian. | Aprobada | 016 RF-41 a RF-44 |
| RN-196 | En una carta 18+, añadir, quitar o sustituir una capa de imagen, o volver visible una que no lo era, anula la revisión. Si la carta está publicada, los coleccionistas siguen viendo la versión revisada hasta la nueva revisión. Las capas 18+ solo se entregan con el doble control de edad. | Aprobada | 016 RF-45 a RF-50 |
| RN-197 | Las capas se editan también en colecciones publicadas; quien ya tiene la carta ve la versión nueva (las 18+, cuando se revisan). | Aprobada | 016 RF-51, RF-52 |
| RN-198 | Una carta creada desde capas no puede quedarse sin capas; una con imagen original que las pierde vuelve a su imagen de Pencil. Solo se usan modos de mezcla que la imagen plana reproduce igual (los importados que no, pasan a normal con aviso), y el sello de texto usa la misma tipografía en la web y en la imagen plana. | Aprobada | 016 RF-67 a RF-71 |

## Parámetros en un vistazo

| Parámetro | Valor |
|---|---|
| Sobre de bienvenida | 1, de la colección elegida en el panel |
| Sobres al mes por regla de tier | 1 a 50 |
| Regalo del panel | 1 a 20 sobres, motivo de 3 a 200 caracteres |
| Cartas por sobre | 1 a 10 (5 por defecto) |
| Probabilidad de holo (rara o mejor) | 20 % por defecto, configurable |
| Protección de mala suerte | N de 0 a 100, 10 por defecto |
| «Abrir todos» | hasta 50 sobres |
| Nota de moderación | hasta 300 caracteres |
| Espera entre revisiones de un álbum oculto | 7 días |
| JavaScript de la primera carga por página (coleccionista y pública) | hasta 250 kB comprimidos |
| Sonidos | 9 (6 de la apertura y 3 de los premios), hasta 200 kB en total |
| Sobre hecho a mano | se recorta a 600 × 900 (2:3) en WebP |
| Aperturas por minuto | 10 por usuario |
| Caducidad de los sobres | ninguna |
| Enlaces de imagen privados | 10 minutos |
| Revisión del estado de Patreon | al entrar, cada 15 minutos con sesión y cada 6 horas para todos |
| Plazo para recuperar una cuenta borrada | 30 días |
| Alias del álbum | 2 a 30 caracteres |
| Cartas destacadas | hasta 5 |
| Imágenes subidas | PNG, JPEG o WebP; hasta 20 MB; mínimo 600 px de ancho |
| Código de colección | 2 a 8 letras o números |
| Idioma por defecto | inglés |
| Sobre gratis | 1 cada 12 h, hasta 2 acumulados; 1 listo al empezar |
| Racha diaria | 10, 10, 15, 15, 20, 20 galletas y un sobre el día 7; 1 día de gracia |
| Cambio de zona horaria | mínimo 20 h entre recompensas |
| Edad mínima de la web | 16 o 18 años, la elige el administrador (16 por defecto); 18+ y tier adulto para el contenido adulto |
| Copias de seguridad | diarias, cifradas, 30 días |
| Avisos emergentes (solo panel) | 4 s (éxito), 7 s (error), 6 s si se pueden deshacer; como mucho 3 a la vez |
| Premio que vuela | 0,7 s por pegatina, escalonadas 90 ms (3 galletas, 1 sobre); el destino rebota 0,42 s |
| Estampado de la pegatina del día | 0,45 s antes de que vuele el premio |
| Celebración | una a la vez, en orden; confeti de 70 piezas; vibración de 30 ms |
| Capas de una carta | proporción 700 × 991 (±1 %), mínimo 700 px de ancho (recomendado 1400 × 1982); hasta 8 de imagen |
