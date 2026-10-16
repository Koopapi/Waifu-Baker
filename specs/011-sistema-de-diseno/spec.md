# Spec 011 — Sistema de diseño

## Contexto y objetivo
La spec 010 dio a la web su estructura y su paleta, pero con piezas sueltas: clases repetidas en cada pantalla,
botones con estilos distintos y confirmaciones del navegador. El usuario quiere que todo se construya con
componentes reutilizables de un sistema de diseño estandarizado: rápidos, sin problemas de flujo y preparados
para crecer (más adelante, juegos y nuevas funciones). Esta spec crea el sistema, su catálogo y pasa todas las
pantallas a él. No cambia reglas de negocio.

## Usuarios / actores
- **Coleccionista** y **administrador**: ven la misma web, ahora coherente en todas sus pantallas.
- **Quien desarrolla** (el usuario y los agentes): construye pantallas nuevas solo con los componentes del sistema.

## Historias de usuario
- H1: Como coleccionista quiero que cada botón, aviso, menú y ventana se vea y se comporte igual en toda la web.
- H2: Como coleccionista quiero que la web responda al instante y no me deje dudas de si algo se hizo.
- H3: Como responsable quiero consultar todos los componentes con sus variantes en un catálogo, y su diseño en Pencil.
- H4: Como responsable quiero que añadir una pantalla o un juego nuevo no obligue a crear estilos nuevos.

## Requisitos funcionales (criterios de aceptación en EARS)

### Base
- RF-1: EL SISTEMA definirá colores, tipografía, espaciado, radios, sombras, capas y tiempos de animación solo como tokens; ningún componente usará valores sueltos.
- RF-2: EL SISTEMA usará una sola paleta, «Cereza», con los tokens organizados para poder añadir más adelante un tema por colección o por juego sin cambiar los componentes.

### Componentes
- RF-3: EL SISTEMA ofrecerá componentes de acción: botón (principal, secundario, peligro, éxito y discreto; tamaños; con icono; estado de carga) y botón de icono.
- RF-4: EL SISTEMA ofrecerá componentes de formulario: campo de texto, área de texto, casilla, interruptor, grupo de opciones y desplegable personalizado (con buscador e iconos cuando haga falta), todos con etiqueta, ayuda y error.
- RF-5: EL SISTEMA ofrecerá componentes de respuesta: aviso emergente (con acción «Deshacer»), alerta en línea (información, éxito, aviso y error), estado vacío y esqueleto de carga.
- RF-6: EL SISTEMA ofrecerá superposiciones: modal, modal de confirmación, menú contextual y descripción emergente (tooltip).
- RF-7: EL SISTEMA ofrecerá componentes de contenido: tarjeta, etiqueta (badge), pestañas, barra de progreso, avatar y tabla.
- RF-8: EL SISTEMA ofrecerá componentes de juego ya previstos: temporizador de cuenta atrás, contador animado y vista a pantalla completa (modo foco), sin piezas propias de un juego concreto.
- RF-9: EL SISTEMA ofrecerá la estructura de navegación de la spec 010 (barra de colecciones, panel, cajón, pestañas y franja) como componentes del sistema.

### Comportamiento
- RF-10: CUANDO el usuario pulsa una acción reversible, EL SISTEMA mostrará el resultado al instante, sin esperar al servidor, y CUANDO el servidor la rechaza, EL SISTEMA la deshará y lo avisará.
- RF-11: CUANDO una acción reversible termina, EL SISTEMA mostrará un aviso con la opción «Deshacer» mientras sea posible deshacerla.
- RF-12: CUANDO el usuario va a hacer una acción irreversible o importante (borrar la cuenta, publicar una colección, subir la edad mínima), EL SISTEMA pedirá confirmación en un modal propio que explique qué pasará, con el botón de peligro en rojo; la web no usará las confirmaciones del navegador.
- RF-13: EL SISTEMA animará los componentes solo con transform y opacidad, entre 150 y 250 ms, y sin animaciones con movimiento reducido; las animaciones vistosas quedan solo para la apertura de sobres.
- RF-14: EL SISTEMA hará que todos los componentes se usen por completo con teclado y lector de pantalla (foco visible, foco atrapado en modales y menús, Escape para cerrar, roles y etiquetas correctos) y con contraste de al menos 4,5:1.

### Catálogo y adopción
- RF-15: MIENTRAS la web corra en desarrollo, EL SISTEMA ofrecerá una página de catálogo con todos los componentes, sus variantes y estados; en producción esa página no existirá.
- RF-16: EL SISTEMA tendrá cada componente diseñado en Pencil como componente reutilizable, con las mismas variantes que en código.
- RF-17: EL SISTEMA construirá todas las pantallas del coleccionista, del panel, la portada, la demo y las páginas legales solo con componentes del sistema.

## Requisitos no funcionales
- Los componentes no dependen de la página del catálogo, para poder llevarlos a Storybook más adelante sin cambios.
- Nada de lo nuevo aumenta el peso de las páginas principales más de 30 KB comprimidos.
- Textos en inglés y español (spec 008).

## Casos límite
- Dos avisos a la vez: se apilan, como mucho 3, y el más antiguo se va primero.
- «Deshacer» pulsado después de que el servidor confirmó: se envía la acción contraria; si ya no se puede, se avisa.
- Modal abierto y navegación: el modal se cierra y el foco vuelve a donde estaba.
- Sin conexión durante una acción optimista: se deshace y se avisa con un error que se puede reintentar.

## Fuera de alcance
- Componentes de un juego concreto (marcador, barra de energía, pantallas de resultado): irán con cada juego.
- Temas por colección o por juego, modo claro.
- Storybook (se adoptará después).
- Cambios de funcionalidad o de reglas de negocio.

## Criterios de finalización
Todos los RF con test en verde; el catálogo muestra todos los componentes; Pencil tiene sus equivalentes; ninguna
pantalla usa estilos sueltos (lo comprueba un test); el E2E completo pasa en los cuatro proyectos con los mismos
recorridos de antes.

## Decisiones de la entrevista (16 oct 2026)
Alcance A (web actual y piezas ya previstas), catálogo en la web y Pencil (Storybook más adelante), tema único
«Cereza» en tokens, respuesta rápida y sutil con acciones optimistas, desplegables totalmente personalizados
(con una librería de primitivas accesibles que se justificará en el plan) y confirmaciones en dos niveles.

Spec aprobada por el usuario el 16 oct 2026.
