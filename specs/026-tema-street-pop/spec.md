# Spec 026 — Tema Street pop seleccionable

Estado: borrador para aprobación del dueño (29 oct 2026). Se trabaja **en local**; no se sube al servidor de pruebas
hasta que el dueño lo pida.

Origen: el tema B «Street pop» del paquete de diseño de Bruno (`docs/waifu-baker/waifu-baker/tokens/tema-b-street-pop.css`,
`docs/estilo-visual.md` y las pantallas `disenos/b-*.html`). Es referencia: entra solo lo que dice esta spec. El 23 oct
2026 el dueño decidió que el kawaii oscuro sigue siendo el estilo de la web y que Street pop llegaría como segundo tema
con un interruptor, en su propia spec. Esta es esa spec.

## Contexto y objetivo
La web tiene un solo estilo, el kawaii oscuro de la spec 014. Bruno diseñó un segundo estilo, Street pop: claro, con
energía de promo de juego gacha, bordes de tinta, sombras duras y etiquetas inclinadas. Al dueño le gusta y quiere que
cualquier usuario pueda elegirlo en Configuración, sin quitarle el kawaii a quien lo prefiera. El objetivo es que cada
usuario vea la web completa en el tema que eligió, en todos sus dispositivos, mientras las cartas siguen viéndose igual
para todos.

## Usuarios / actores
- **Coleccionista** con sesión iniciada: elige su tema y ve la web en él.
- **Administrador** (el dueño y Bruno): igual que el coleccionista; el panel también cambia de tema.
- **Visitante sin sesión**: ve siempre el kawaii.

## Historias de usuario
- H1: Como coleccionista quiero elegir entre el tema kawaii y el Street pop para ver la web con el estilo que me guste.
- H2: Como coleccionista quiero que mi elección me siga en el teléfono y en la compu sin volver a elegirla.
- H3: Como coleccionista quiero que mis cartas se vean igual en los dos temas, con su holo y sus brillos.
- H4: Como administrador quiero que el panel también use el tema que elegí.

## Vocabulario
- **Kawaii**: el tema actual, oscuro (spec 014). Es el tema por defecto.
- **Street pop**: el tema claro de Bruno: fondo lila, tarjetas blancas, tinta casi negra para texto, bordes y sombras,
  índigo, rosa neón, lima, turquesa y trama de puntos amarilla. Títulos en Dela Gothic One y texto en Archivo.
- **Mesa de apertura**: el escenario donde se rasga el sobre y se revelan las cartas, incluido «Abrir todos».
- **Escenario de la carta**: el fondo oscuro donde el configurador del panel muestra la vista previa (spec 025).

## Requisitos funcionales (criterios de aceptación en EARS)

### Elegir y guardar el tema
- RF-1: EL SISTEMA tendrá dos temas: Kawaii y Street pop.
- RF-2: EL SISTEMA mostrará el tema Kawaii a quien no tenga sesión iniciada.
- RF-3: EL SISTEMA mostrará el tema Kawaii a quien tenga sesión y nunca haya elegido tema.
- RF-4: MIENTRAS el usuario tenga sesión iniciada, EL SISTEMA mostrará en la página de Configuración un selector de tema
  con los dos temas y una muestra visual de cada uno.
- RF-5: CUANDO el usuario elija un tema, EL SISTEMA lo aplicará en menos de 1 s sin recargar la página.
- RF-6: CUANDO el usuario elija un tema, EL SISTEMA lo guardará en su cuenta.
- RF-7: CUANDO el usuario abra la web en otro dispositivo con la misma cuenta, EL SISTEMA mostrará el tema guardado en
  su cuenta.
- RF-8: EL SISTEMA pintará cada página directamente en el tema del usuario, sin mostrar antes el otro tema.
- RF-9: SI no se puede guardar la elección, ENTONCES EL SISTEMA volverá a mostrar el tema anterior e informará que no
  se pudo guardar.
- RF-10: CUANDO el usuario cierre sesión, EL SISTEMA mostrará el tema Kawaii.

### Dónde aplica
- RF-11: MIENTRAS el tema sea Street pop, EL SISTEMA mostrará en Street pop todas las páginas de la web: portada, sobres,
  colección, ficha de carta, álbum, juegos, recompensas, Configuración, páginas legales, probabilidades, errores y el
  panel de administración.
- RF-12: MIENTRAS el tema sea Street pop, EL SISTEMA mantendrá oscura la mesa de apertura.
- RF-13: MIENTRAS el tema sea Street pop, EL SISTEMA mantendrá oscuro el escenario de la carta del configurador.
- RF-14: EL SISTEMA mostrará las cartas (arte, marco, sello, holo, brillos y partículas) igual en los dos temas.
- RF-15: EL SISTEMA mostrará los colores de rareza de las insignias y etiquetas igual en los dos temas.
- RF-16: CUANDO alguien visite el álbum público de otro usuario, EL SISTEMA lo mostrará en el tema del visitante, no en el
  del dueño del álbum.

### Cómo se ve Street pop
- RF-17: MIENTRAS el tema sea Street pop, EL SISTEMA usará la paleta de Bruno: fondo lila `#ECE4FA`, superficies blancas,
  tinta `#17132B`, índigo `#3B2FC9`, rosa neón `#FF3EA5` para la acción principal, lima `#C6F432` y turquesa `#3FE0D0`
  como acentos y trama amarilla `#FFD93D` solo como decoración.
- RF-18: MIENTRAS el tema sea Street pop, EL SISTEMA usará Dela Gothic One en los títulos y Archivo en el resto del texto.
- RF-19: MIENTRAS el tema sea Street pop, EL SISTEMA mostrará los textos de botones y etiquetas en Archivo itálica gruesa
  y en mayúsculas.
- RF-20: MIENTRAS el tema sea Street pop, EL SISTEMA dará a tarjetas, botones, campos, menús y ventanas un borde de tinta
  de 3 px y una sombra dura sin difuminar.
- RF-21: MIENTRAS el tema sea Street pop, EL SISTEMA inclinará botones y etiquetas, y dejará rectos los textos de más de
  una línea.
- RF-22: MIENTRAS el tema sea Street pop, EL SISTEMA decorará con franjas índigo y trama de puntos amarilla, nunca detrás
  de un texto.
- RF-23: MIENTRAS el tema sea Street pop, EL SISTEMA mostrará los adornos del kawaii (pegatinas, galleta, llama de la
  racha y demás iconos decorativos) en los mismos lugares, redibujados con borde de tinta, sombra dura y colores planos
  de Street pop.
- RF-24: EL SISTEMA no usará el rosa neón ni la lima como color de texto sobre fondo lila o blanco.
- RF-25: MIENTRAS el tema sea Street pop, EL SISTEMA dará a todo texto un contraste de al menos 4,5:1 con su fondo, y a
  los textos grandes, bordes de campos e indicadores de foco al menos 3:1.
- RF-26: EL SISTEMA mostrará en el catálogo `/sistema` cada componente en los dos temas.
- RF-27: EL SISTEMA mostrará el nombre de los temas y los textos del selector en inglés y en español.

## Requisitos no funcionales
- Las animaciones, sonidos y la regla de movimiento reducido no cambian con el tema (constitución, principio 9).
- Quien usa Kawaii no descarga las fuentes de Street pop.
- El peso de JavaScript de cada página sigue por debajo de 250 kB comprimido (presupuesto actual).
- Cambiar de tema no pierde lo que el usuario tenía abierto ni lo escrito en un formulario.
- Se ve bien a 390 px de ancho sin scroll horizontal, igual que el Kawaii.

## Casos límite
- Usuario con Street pop guardado que entra sin sesión (otro navegador, sesión caducada): ve Kawaii hasta iniciar sesión;
  después, Street pop.
- Usuario que cambia de tema en un dispositivo mientras tiene otro abierto: el otro dispositivo toma el tema nuevo al
  cargar la siguiente página; no hace falta que cambie en vivo.
- Paso de una página clara a la mesa de apertura oscura y de vuelta: sin destellos blancos durante la transición.
- Ventanas, avisos y menús que se abren sobre la mesa de apertura: usan el tema del usuario, no el oscuro de la mesa.
- Controles nativos del navegador (barras de desplazamiento, calendario, autocompletar): en claro con Street pop y en
  oscuro con Kawaii.
- Páginas 18+: mismo tema que el resto; el doble gate no cambia.
- Error al cargar las fuentes de Street pop: la página se ve con fuentes del sistema y sigue siendo legible.
- Cuenta borrada o anonimizada: su elección de tema se borra con ella.

## Fuera de alcance
- Temas por colección o por juego, y más de dos temas.
- El tema A «Pop pastel» de Bruno.
- Seguir el modo claro u oscuro del sistema operativo.
- Recordar el tema de quien no tiene sesión.
- Cambiar las cartas, sus marcos, sellos, holo o colores de rareza (se quedan como en las specs 022 y 025).
- Vender o desbloquear temas en la tienda.
- Imágenes para redes (OG), correos y mensajes de Telegram.
- Rediseñar la estructura de las pantallas: cambian el aspecto y los adornos, no qué hay en cada pantalla ni dónde.

## Criterios de finalización
- Todos los RF con al menos un test en verde (unitarias, integración y E2E de escritorio y teléfono).
- Test de contraste de la paleta Street pop (RF-25) junto al del Kawaii.
- Maquetas en HTML de las pantallas que Bruno no diseñó (Configuración con el selector, recompensas, juegos y panel),
  aprobadas por el dueño; las de Bruno (`b-portada`, `b-coleccion`, `b-ficha`, `b-apertura`, `b-paleta`) sirven para el
  resto.
- Demo en local aprobada por el dueño, recorriendo la web completa en los dos temas en escritorio y teléfono.
- `validation.md` con la evidencia de cada RF.

## Dudas abiertas
- [NECESITA ACLARACIÓN: ¿el selector se llama «Tema» y los temas «Kawaii» y «Street pop» en los dos idiomas, o prefieres
  otros nombres?]
