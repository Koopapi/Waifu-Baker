# Spec 010 — Acabado premium (estilo Discord) y demo local

## Contexto y objetivo
La web funciona de punta a punta, pero su aspecto es el de un prototipo. Antes de enseñarla, el usuario
quiere un acabado premium inspirado en la interfaz de Discord (estructura, botones, animaciones y
sensación de app), y una demo local con datos de ejemplo para recorrerla como coleccionista y como
administrador sin preparar nada a mano. La funcionalidad no cambia: esta spec es de experiencia.

## Usuarios / actores
- **Coleccionista** y **administrador**: los mismos de siempre, con la nueva interfaz.
- **Quien enseña la demo**: el usuario, en su Mac, eligiendo con qué papel entrar.

## Historias de usuario
- H1: Como coleccionista quiero una interfaz cuidada y fluida, con la sensación de una app como Discord.
- H2: Como administrador quiero que el panel tenga el mismo acabado.
- H3: Como responsable quiero arrancar una demo con un comando y entrar como coleccionista o como administrador con un botón.
- H4: Como responsable quiero que la demo tenga contenido real: la colección de fan art con sus 30 cartas, sobres, galletas y una racha empezada.

## Requisitos funcionales (criterios de aceptación en EARS)

### Estructura estilo Discord
- RF-1: EL SISTEMA mostrará en escritorio una barra de iconos a la izquierda con el inicio y un icono por cada colección del usuario.
- RF-2: EL SISTEMA mostrará junto a esa barra un panel de navegación con las secciones (Mis sobres, Mi colección, Álbum, Recompensas, Mi cuenta) y la sección actual resaltada.
- RF-3: EL SISTEMA mostrará el contenido de la sección en la zona central, sin recargar la página completa al cambiar de sección.
- RF-4: MIENTRAS la pantalla sea de móvil, EL SISTEMA ocultará la barra y el panel de navegación en un menú deslizable que se abre con un botón y con un gesto desde el borde.
- RF-5: EL SISTEMA aplicará la misma estructura al panel de administración, con sus propias secciones.
- RF-16: MIENTRAS la pantalla sea de móvil, EL SISTEMA mostrará además una barra inferior con pestañas a Mis sobres, Mi colección, Recompensas y Mi cuenta, con la actual resaltada.

### Acabado
- RF-6: EL SISTEMA usará una única paleta de colores, tipografía y radios de borde en toda la web, elegidos entre las opciones que se presenten en maquetas.
- RF-7: EL SISTEMA mostrará estados al pasar el ratón, al pulsar y al tener el foco en botones, enlaces y tarjetas.
- RF-8: CUANDO una acción termina (reclamar, abrir, guardar, error), EL SISTEMA lo comunicará con un aviso emergente animado que desaparece solo.
- RF-9: MIENTRAS se carga una sección o una imagen, EL SISTEMA mostrará un esqueleto de carga en lugar de un hueco vacío.
- RF-10: EL SISTEMA animará los cambios de sección y la aparición de tarjetas solo con transformaciones y opacidad, y sin animaciones cuando el usuario pida movimiento reducido.
- RF-11: EL SISTEMA mantendrá el contraste de texto de al menos 4,5:1 y el uso completo con teclado.

### Edad mínima configurable
- RF-17: EL SISTEMA permitirá al administrador elegir desde el panel la edad mínima de la web, 16 o 18 años, pidiendo confirmación y guardando el cambio en el historial.
- RF-18: CUANDO la edad mínima sube, EL SISTEMA pedirá a cada usuario que confirmó una edad menor que confirme la nueva antes de seguir usando la web.
- RF-19: EL SISTEMA mostrará la edad mínima vigente en la bienvenida, en los términos y en la política de privacidad.

### Demo local
- RF-12: CUANDO el usuario ejecuta el comando de la demo, EL SISTEMA creará una base de datos de demo con la colección de fan art (30 cartas con rarezas y marcos, con nombres propios y sin los nombres reales de los personajes), probabilidades publicadas, un coleccionista con sobres sin abrir, cartas, galletas y una racha empezada, y un administrador.
- RF-13: MIENTRAS la web corra en modo demo, EL SISTEMA mostrará una portada con «Entrar como coleccionista» y «Entrar como administrador» que inician sesión sin Patreon.
- RF-14: MIENTRAS la web corra en modo demo, EL SISTEMA mostrará una franja que lo indica y un botón para cambiar de papel.
- RF-15: EL SISTEMA no permitirá el modo demo en producción.

## Requisitos no funcionales
- Las pantallas principales cargan en menos de 1 s en local y las animaciones van a 60 fps en un portátil y un móvil de gama media.
- Inspirado en Discord, sin usar su nombre, logotipos, iconos ni recursos.
- Textos en inglés y español (spec 008).

## Casos límite
- Usuario sin colecciones: la barra muestra solo el inicio y una invitación a abrir su primer sobre.
- Muchas colecciones: la barra se desplaza; el icono de la colección actual siempre está visible.
- La demo se arranca dos veces: se recrea desde cero.

## Fuera de alcance
- Publicar la demo en internet (será con el despliegue).
- Chat, servidores o cualquier función social de Discord: solo se toma la estructura visual.
- Sonidos de la interfaz (se pueden añadir después con los de la apertura).

## Criterios de finalización
Todos los RF con test en verde; E2E: `pnpm demo` arranca → la portada ofrece los dos papeles → el
coleccionista recorre sobres, colección, álbum y recompensas en la nueva interfaz en escritorio y
móvil → cambia a administrador y recorre el panel → los avisos y esqueletos aparecen → con
movimiento reducido no hay animaciones.

## Dudas abiertas
- Paleta: elegida la B «Cereza» (16 oct 2026).
- Ampliación del 16 oct 2026, a petición del usuario: barra de pestañas en móvil (RF-16), edad mínima
  configurable 16/18 para cuando se suba contenido más subido de tono (RF-17 a RF-19) y nombres propios
  en las cartas de fan art (RF-12). El fan art no se marca como «solo gratis»: el principio 8 de la
  constitución (nada con licencia en contenido de pago) se sigue cumpliendo a mano al configurar tiers.
- Decisiones de la entrevista (16 oct 2026): demo en local con un comando; contenido de la demo, las
  30 imágenes de fan art; diseño validado primero con maquetas en Pencil. Spec aprobada el 16 oct 2026.
