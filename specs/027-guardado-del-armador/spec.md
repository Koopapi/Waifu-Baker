# Spec 027 — Guardado claro del armador de cartas

Estado: **aprobada por el dueño el 3 nov 2026** («Eso me gusta, apruebo»). Decisiones del dueño: el borrador
automático vive en el navegador y, además, cada guardado crea una versión en el servidor («Ambos»); se conservan
10 versiones por carta; el borrador y las imágenes sin guardar viven 5 días. Siguiente paso: plan y tareas.

Origen: el dueño reportó el 2 nov 2026 que al guardar una carta «a veces se guarda sin capas», que un clic en falso
fuera de la ventana de la carta la cierra sin aviso y perdiendo el trabajo, y pidió que guardar sea más claro, con
autoguardado o versiones de los cambios.

## Contexto y objetivo
La ventana de la carta del panel tiene hoy dos «Guardar» que no se conocen: el de la ficha (nombre, texto, personaje,
rareza, variante) y el del armador de capas. El de la ficha guarda y **cierra la ventana**, y al cerrarla se descartan
las capas que aún no se habían guardado con el otro botón: eso es el «se guarda sin capas». Además la ventana se cierra
con un clic fuera o con Escape sin preguntar, y recargar la página borra todo lo que no estuviera guardado. Esta spec
deja un solo «Guardar» que guarda todo junto, un estado visible de «sin guardar / guardado», un cierre que pregunta, un
borrador automático en el navegador para recuperar un cierre o una recarga, y un historial de versiones en el servidor
para volver a un estado anterior. Las specs 016, 017 y 025 dejaron fuera a propósito «historial de versiones» y
«guardar el trabajo a medias en el navegador»; esta spec los trae porque el dueño ya perdió trabajo por no tenerlos.

## Usuarios / actores
- **Administrador** (el dueño y Bruno): edita cartas en el panel.

## Historias de usuario
- H1: Como administrador quiero un solo «Guardar» que guarde la ficha y las capas juntas, para no perder capas.
- H2: Como administrador quiero saber en todo momento si la carta tiene cambios sin guardar y cuándo se guardó.
- H3: Como administrador quiero que un clic fuera de la ventana, Escape o una recarga no me hagan perder el trabajo.
- H4: Como administrador quiero recuperar lo que estaba haciendo si la ventana se cerró o la página se recargó.
- H5: Como administrador quiero ver las versiones guardadas de una carta y volver a una anterior.

## Vocabulario
- **Ventana de la carta**: la que se abre desde la lista de cartas de una colección; contiene la ficha y el armador de
  capas.
- **Ficha**: nombre, texto, personaje, rareza y variante de la carta. Cambiar el arte (la chica) se sube al momento,
  como hoy, y no forma parte de la ficha.
- **Cambios sin guardar**: cualquier diferencia entre lo que hay en la ventana (ficha o capas) y lo último guardado.
- **Borrador**: copia de los cambios sin guardar de una carta, escrita sola en el navegador del administrador. Solo
  existe en ese navegador: no lo ven otros administradores ni otros dispositivos.
- **Versión**: foto de la carta (ficha y configuración de capas) que se crea cada vez que se guarda, con fecha, hora y
  el administrador que guardó.

## Requisitos funcionales (criterios de aceptación en EARS)

### Un solo «Guardar»
- RF-1: EL SISTEMA mostrará en la ventana de la carta un solo botón «Guardar», que guardará la ficha y la configuración
  de capas en una sola operación.
- RF-2: SI la ficha o las capas no se pueden guardar (datos inválidos, ninguna capa visible o conflicto de edición),
  ENTONCES EL SISTEMA no guardará ninguna de las dos y mostrará el motivo junto al botón.
- RF-3: CUANDO el guardado termine bien, EL SISTEMA mostrará «Guardado a las HH:MM» y mantendrá la ventana abierta.
- RF-4: EL SISTEMA mostrará en la ventana, siempre visible, el estado de la carta: «Sin cambios», «Cambios sin guardar»
  o «Guardado a las HH:MM».
- RF-5: MIENTRAS no haya cambios sin guardar, EL SISTEMA mostrará «Guardar» desactivado.

### Cerrar la ventana
- RF-6: MIENTRAS haya cambios sin guardar, EL SISTEMA no cerrará la ventana por un clic fuera de ella ni por la tecla
  Escape.
- RF-7: CUANDO el administrador pida cerrar la ventana (botón de cerrar o «Cancelar») con cambios sin guardar, EL
  SISTEMA preguntará con tres opciones: guardar y cerrar, descartar los cambios, o seguir editando.
- RF-8: CUANDO el administrador elija descartar, EL SISTEMA cerrará la ventana, borrará el borrador de esa carta y
  volverá a mostrar lo guardado.
- RF-9: CUANDO el administrador intente salir de la página o recargarla con cambios sin guardar, EL SISTEMA pedirá
  confirmación con el aviso del navegador.

### Borrador automático (en el navegador)
- RF-10: CUANDO el administrador haga un cambio en la ventana de la carta, EL SISTEMA escribirá el borrador de esa carta
  en ese navegador en menos de 2 s, sin tocar la carta guardada.
- RF-11: CUANDO el administrador abra una carta que tenga un borrador en ese navegador, EL SISTEMA se lo ofrecerá con
  su fecha y hora y las opciones «Recuperar» y «Descartar», sin aplicarlo por su cuenta.
- RF-12: CUANDO el administrador recupere un borrador, EL SISTEMA lo cargará en la ventana como cambios sin guardar.
- RF-13: CUANDO el guardado termine bien o el administrador descarte los cambios, EL SISTEMA borrará el borrador de esa
  carta.
- RF-14: SI la carta guardada cambió después de escribirse el borrador (otro administrador guardó), ENTONCES EL SISTEMA
  lo dirá al ofrecer el borrador, y al guardar lo recuperado aplicará el aviso de conflicto de la spec 016 (RF-17 y
  RF-18).
- RF-15: EL SISTEMA conservará un borrador, y las imágenes subidas que use y aún no se hayan guardado, durante 5 días
  desde el último cambio (hoy las imágenes sin guardar se borran a las 24 h).
- RF-16: SI al recuperar un borrador falta alguna de sus imágenes, ENTONCES EL SISTEMA cargará el resto, quitará las
  capas que las usaban y dirá cuáles faltan.

### Versiones (en el servidor)
- RF-17: CUANDO se guarde una carta, EL SISTEMA creará una versión con su ficha, su configuración de capas, la fecha y
  hora y el nombre del administrador que guardó.
- RF-18: EL SISTEMA conservará las últimas 10 versiones de cada carta y borrará las más antiguas al pasar de 10.
- RF-19: EL SISTEMA mostrará en la ventana de la carta la lista de sus versiones, cada una con fecha, hora, quién guardó,
  qué cambió (ficha, capas o ambas) y una vista previa de la carta en esa versión.
- RF-20: CUANDO el administrador elija «Volver a esta versión», EL SISTEMA cargará esa versión en la ventana como
  cambios sin guardar, sin tocar la carta guardada hasta que pulse «Guardar».
- RF-21: EL SISTEMA no cambiará ni borrará una versión ya creada: guardar después de volver a una versión crea una
  versión nueva.
- RF-22: EL SISTEMA conservará toda imagen que use alguna de las versiones conservadas de una carta, y la soltará solo
  cuando ninguna versión conservada la use.
- RF-23: CUANDO un guardado quede pendiente de revisión (colección 18+ publicada, spec 018 RF-18), EL SISTEMA creará
  la versión igualmente, marcada «pendiente de revisión».
- RF-24: EL SISTEMA registrará en la auditoría cada guardado y cada vuelta a una versión, con el número de versión.
- RF-25: CUANDO entre esta spec, EL SISTEMA tomará lo guardado de cada carta existente como su primera versión.

## Requisitos no funcionales
- Rendimiento: escribir el borrador no debe hacer que los deslizadores del armador se sientan lentos (se escribe con un
  pequeño retraso tras el último cambio, nunca en cada movimiento); la lista de versiones no retrasa la apertura de la
  ventana (se carga aparte).
- Seguridad: el borrador guarda solo ajustes y claves de imagen, nunca imágenes; lo recuperado y lo que vuelve de una
  versión se validan en el servidor igual que cualquier configuración (listas cerradas y límites de la spec 016 y 025).
  Las versiones y sus vistas previas solo se sirven a administradores.
- Almacenamiento: las imágenes se comparten entre versiones porque ya se guardan por contenido (spec 016); una versión
  solo añade su configuración.
- Sistema de diseño (spec 011): el estado de la carta, la pregunta al cerrar, el aviso de borrador y la lista de versiones
  se hacen con los componentes existentes (confirmación, aviso, lista); si hace falta uno nuevo, va en `ui/` con su
  componente en Pencil.
- Accesibilidad: el estado de la carta (RF-4) se anuncia a los lectores de pantalla cuando cambia; la pregunta al
  cerrar se maneja con teclado.
- Idioma: todos los textos nuevos en inglés y español, en los diccionarios.
- Tema Street pop (spec 026): los componentes nuevos se ven bien en los dos temas.

## Casos límite
- Carta recién creada, sin capas: «Guardar» guarda solo la ficha; sigue sin poder publicarse sin armar (spec 017).
- Capas presentes pero ninguna visible: no se guarda nada y se muestra el motivo (RF-2; spec 016 RF-13).
- Conflicto de edición: no se guarda ni la ficha ni las capas; «guardar de todos modos» (spec 016 RF-18) crea una versión
  nueva encima de la otra, que sigue en el historial.
- Borrador de una carta que ya no existe: se borra sin ofrecerlo.
- Dos pestañas con la misma carta: el borrador es el de la última que escribió; la pestaña que guarde después recibe el
  aviso de conflicto.
- Navegador sin almacenamiento disponible (modo privado o cupo lleno): la ventana funciona sin borrador y el estado
  (RF-4) lo indica.
- Cambiar el arte de la carta sube la imagen al momento, como hoy, y no forma parte del borrador ni de «Guardar»; si
  hay cambios sin guardar en ese momento, no se pierden.
- Aprobar o descartar capas pendientes (18+) con cambios sin guardar en la ventana: se pregunta como al cerrar (RF-7).
- Borrar la carta: se borran sus versiones y las imágenes que solo ellas usaban; sigue pidiendo confirmación (spec 011).
- Importar una configuración del creador (spec 017): entra como cambios sin guardar y, por tanto, al borrador.
- Volver a una versión en una colección 18+ publicada: queda pendiente de revisión como cualquier otro cambio.
- Versión cuya imagen falte por un error del almacén: se trata como RF-16 y se registra en la auditoría.
- Carta con 10 versiones y 8 capas cada una: guardar sigue tardando lo mismo que hoy; solo se borra la versión más
  antigua.

## Fuera de alcance
- Autoguardado en el servidor sin pulsar «Guardar» (el dueño eligió borrador en el navegador y versiones al guardar).
- Deshacer y rehacer paso a paso dentro del armador.
- Versiones de colecciones, personajes, sobres o la biblioteca.
- Comparar dos versiones lado a lado, ponerles nombre o comentarios.
- Borradores compartidos entre administradores o dispositivos.
- Cambiar qué se guarda en una carta (formato de capas, marcos, rarezas, imagen fija).
- Cambiar el flujo de revisión 18+ (spec 018): solo se le añade la marca en la versión.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde (unitarios y E2E). Una E2E recorre el flujo entero: cambiar
ficha y capas → un solo «Guardar» guarda las dos → clic fuera y Escape no cierran → cerrar pregunta → recargar con
cambios ofrece el borrador → recuperarlo → guardar → aparece la versión → volver a una anterior → guardar → versión
nueva. Reproducir en la demo el caso que reportó el dueño (editar capas y guardar la ficha) y comprobar que ya no se
pierden capas. Documentación del panel actualizada. Demo del dueño en `pruebas`.

## Dudas abiertas
- Ninguna. (Resueltas el 3 nov 2026: 10 versiones por carta y 5 días de vida del borrador.)
