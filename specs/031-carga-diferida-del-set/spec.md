# Spec 031 — Carga diferida en la página de una colección del panel

Estado: **borrador**, pendiente de aprobación del dueño (entrevista del 8 nov 2026).

Decisiones del dueño en la entrevista:
1. Solo la página de una colección del panel; el resto del panel y las páginas del coleccionista quedan como están.
2. Al abrir una carta, la ventana se abre al instante con la miniatura de la carta y un indicador de carga, y el editor
   aparece cuando está listo.
3. La página de una colección tiene un límite de peso que la CI revisa siempre: 260 kB.
4. En las colecciones grandes se siguen viendo todas las cartas, pero las miniaturas se descargan al acercarse a ellas
   al bajar.

## Contexto y objetivo
En el servidor de pruebas, entrar a una colección desde «Sets» tardaba tanto que parecía que el clic no funcionaba. El
PR #43 le puso a la colección su propia pantalla de carga, lo que da señal inmediata y quita la traba del router. Pero
la página sigue cargando de golpe cosas que solo se usan al editar una carta: el editor de capas, la vista previa 3D,
el historial de versiones, la configuración de capas de todas las cartas y la biblioteca completa de elementos. Por
eso pesa 393 kB de JavaScript, contra 223 kB de la lista de sets. Además, para preparar la biblioteca, el servidor lee
las capas de todas las cartas de todas las colecciones, solo para contar usos que esta página no muestra. El objetivo
es que la página de la colección cargue solo lo que se ve, y que el editor y sus datos se carguen al abrir una carta.

## Usuarios / actores
- **Administrador** (el dueño y Bruno): entra a una colección, revisa la cuadrícula y edita cartas.

## Historias de usuario
- H1: Como administrador quiero entrar a una colección sin esperar, para revisar sus cartas y ajustes de inmediato.
- H2: Como administrador quiero que al abrir una carta se vea al instante que está cargando, para saber que mi clic
  funcionó.
- H3: Como administrador quiero que las colecciones grandes no tarden más en abrir por tener muchas cartas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Entrar a la colección
- RF-1: CUANDO el administrador entre a una colección, EL SISTEMA mostrará su encabezado, sus datos, la publicación, el
  sobre, «gratuita», «bienvenida», las probabilidades y la cuadrícula de cartas sin descargar el editor de cartas.
- RF-2: CUANDO el administrador entre a una colección, EL SISTEMA no enviará al navegador la configuración de capas de
  las cartas.
- RF-3: CUANDO el administrador entre a una colección, EL SISTEMA no enviará al navegador la biblioteca de elementos.
- RF-4: EL SISTEMA preparará la página de una colección sin leer las cartas de otras colecciones.
- RF-5: CUANDO el administrador entre a una colección desde «Sets», EL SISTEMA mostrará al instante la pantalla de carga
  de la colección (la del PR #43) hasta que la página esté lista.
- RF-6: EL SISTEMA descargará la miniatura de cada carta de la cuadrícula solo cuando esté cerca de verse en pantalla.
- RF-7: EL SISTEMA seguirá mostrando todas las cartas de la colección en la cuadrícula, sin páginas.

### Abrir una carta
- RF-8: CUANDO el administrador abra una carta, EL SISTEMA abrirá la ventana de edición al instante con la miniatura de
  la carta y un indicador de carga.
- RF-9: CUANDO el editor y los datos de la carta terminen de cargar, EL SISTEMA mostrará el editor con sus capas, la
  biblioteca y la vista previa, igual que hoy.
- RF-10: CUANDO el administrador abra otra carta en la misma visita, EL SISTEMA no volverá a descargar el editor: solo
  pedirá los datos de esa carta.
- RF-11: SI el editor o los datos de la carta no se pueden cargar, ENTONCES EL SISTEMA mostrará en la ventana un aviso
  con un botón para reintentar, sin cerrar la ventana ni recargar la página.
- RF-12: SI el administrador cierra la ventana antes de que termine la carga, ENTONCES EL SISTEMA dejará de esperar esa
  carta sin mostrar avisos.

### Lo que no cambia
- RF-13: EL SISTEMA conservará en la cuadrícula la selección de varias cartas, los cambios en bloque, reordenar, la
  revisión 18+, el porcentaje por sobre de cada carta y los avisos de cartas sin armar o con cambios pendientes, con sus
  enlaces.
- RF-14: CUANDO el administrador guarde una carta, EL SISTEMA actualizará su miniatura en la cuadrícula, como hoy.
- RF-15: EL SISTEMA conservará en el editor el guardado único, el historial de versiones y el borrador de la spec 027,
  y los valores por defecto de la spec 028.

### Peso
- RF-16: EL SISTEMA mantendrá el JavaScript de primera carga de la página de una colección en 260 kB comprimidos o
  menos.
- RF-17: SI la página de una colección pasa de 260 kB comprimidos, ENTONCES la CI fallará e indicará cuánto pesa.

## Requisitos no funcionales
- Rendimiento: en el servidor de pruebas, una colección de 30 cartas muestra sus cartas en menos de 1 s después del clic
  en «Sets». El editor de una carta queda listo en menos de 1 s después de abrirla.
- Escala: el tiempo de preparar la página de una colección no crece con el número de cartas de las demás colecciones.
- Seguridad: los datos de una carta (capas, arte pendiente 18+) se piden solo con sesión de administrador, igual que
  hoy.
- Idioma: el indicador de carga y el aviso de error, en inglés y español.
- Sistema de diseño: el indicador, el aviso y el botón de reintentar usan los componentes reutilizables del sistema de
  diseño.
- Movimiento reducido: con movimiento reducido, el indicador de carga no se anima.

## Casos límite
- Colección sin cartas: no hay cuadrícula ni editor que cargar; la página se ve como hoy.
- Carta todavía en proceso (sin miniatura): la cuadrícula muestra «Procesando» como hoy, y la ventana abre sin
  miniatura con el indicador.
- La carta cambió desde que se abrió la página (otra pestaña u otro administrador): el editor carga la versión actual,
  y el guardado sigue avisando si la versión no coincide (spec 027).
- Carta de una colección 18+ con arte pendiente de revisión: el editor muestra el arte pendiente como hoy.
- Abrir varias cartas seguidas muy rápido: solo se muestra la última abierta.
- Conexión lenta: la ventana muestra el indicador todo el tiempo que tarde, sin pantallas en blanco.

## Fuera de alcance
- Otras páginas del panel (editor de sobres, biblioteca, simulador, ajustes) y las páginas del coleccionista.
- Dividir la cuadrícula en páginas.
- Cambiar cómo se generan o se guardan las miniaturas.
- Cambiar las funciones del editor de cartas.
- Mostrar en la página de la colección cuántas veces se usa cada elemento de la biblioteca.

## Criterios de finalización
Cada RF con su test en verde: unidad e integración para los datos que llegan a la página y a la ventana, y E2E de entrar
a una colección, abrir una carta, editarla, guardarla y abrir otra. `pnpm budget` con el límite de 260 kB en verde.
Suite completa en verde en los cuatro proyectos. Medición en el servidor de pruebas de los tiempos del RNF.

## Dudas abiertas
- Ninguna.
