# Spec 016 — Cartas por capas (parallax) en el panel

Estado: aprobada el 21 oct 2026.

## Contexto y objetivo
Hoy cada carta nace de una sola ilustración y el sistema la compone con el marco de su rareza (spec 003, RF-11 y
RF-16). El paquete de diseño Street pop trae un creador de cartas por capas: varias ilustraciones del mismo lienzo
que se mueven a distinta velocidad (parallax), partículas, modos de mezcla, un marco metálico por rareza y un sello
que flota fuera de la carta. Esta spec lleva ese creador al panel de administración para que el equipo pueda dar
profundidad a las cartas sin salir de la web: añadir capas a una carta que ya existe o crear una carta nueva
empezando por sus capas. El coleccionista ve esas cartas con el efecto en toda la web; las zonas públicas siguen
mostrando una imagen plana con marca de agua. No cambia ninguna regla de colecciones, sorteo, probabilidades ni
concesiones.

## Usuarios / actores
- **Administrador**: crea y edita las capas de las cartas desde el panel, y revisa las cartas 18+.
- **Coleccionista**: ve las cartas con capas en la apertura, su colección y la ficha de carta.
- **Visitante sin sesión**: ve el álbum público, la portada y las vistas previas en redes; nunca recibe las capas.

## Historias de usuario
- H1: Como administrador quiero añadir capas a una carta ya creada para que se vea con profundidad sin rehacerla.
- H2: Como administrador quiero crear una carta nueva a partir de sus capas para no tener que preparar antes una
  imagen única.
- H3: Como administrador quiero ver la carta en vivo mientras ajusto sus capas para saber cómo la verá el usuario.
- H4: Como administrador quiero que cambiar las imágenes de una carta 18+ obligue a revisarla otra vez y que, mientras
  tanto, los coleccionistas sigan viendo la última versión revisada, para que nunca llegue arte sin revisar.
- H5: Como administrador quiero enterarme si otro administrador guardó la misma carta mientras yo la editaba, para no
  pisar su trabajo sin saberlo.
- H6: Como coleccionista quiero ver mis cartas con parallax, brillo y sello para que abrir y coleccionar se sienta
  especial.
- H7: Como administrador quiero importar y exportar la configuración del creador independiente para no repetir el
  trabajo hecho fuera del panel.

## Vocabulario
- **Configuración por capas**: lo que define cómo se ve una carta por capas: sus capas de atrás hacia adelante, el
  marco, el sello, el holo y la proporción. Es el mismo formato que produce el creador independiente del paquete de
  diseño, en `docs/waifu-baker/waifu-baker/codigo/carta-capas/` (ruta comprobada; la carpeta llega a `pruebas` con la
  rama `estilo-street-pop`).
- **Capa de imagen**: una ilustración del lienzo de la carta con su profundidad, margen, modo de mezcla, opacidad y
  visibilidad.
- **Capa visible**: capa de imagen no oculta y con opacidad mayor que 0.
- **Capa de partículas**: destellos, confeti, pétalos… generados por el sistema; no lleva imagen.
- **Lienzo**: proporción común de todas las capas de imagen, fija en 700 × 991 (la del creador). Se recomienda subir
  las capas a 1400 × 1982 para pantallas de alta densidad.
- **Imagen plana**: una sola imagen de la carta tal como se ve en reposo, para los sitios donde no cabe la carta por
  capas.
- **Carta con capas** / **carta sin capas**: según tenga o no configuración por capas guardada.
- **Versión revisada**: la última configuración por capas de una carta 18+ que un administrador marcó como revisada.

## Requisitos funcionales (criterios de aceptación en EARS)

### Acceso
- RF-1: EL SISTEMA solo permitirá crear, editar, importar o borrar configuraciones por capas a cuentas con rol de
  administrador.
- RF-2: EL SISTEMA registrará cada cambio en la configuración por capas de una carta con autor, fecha, valores
  anteriores y valores nuevos (como spec 003, RF-3).
- RF-3: EL SISTEMA mostrará a cualquier administrador las capas de una carta 18+ en el panel, esté revisada o no.

### Editor de capas
- RF-4: EL SISTEMA mostrará en el editor de cada carta una sección de carta por capas con una vista previa en vivo.
- RF-5: CUANDO el administrador cambie cualquier ajuste de la configuración por capas, EL SISTEMA actualizará la
  vista previa sin recargar la página.
- RF-6: EL SISTEMA permitirá subir varias capas de imagen a la vez.
- RF-7: EL SISTEMA permitirá cambiar el orden de las capas.
- RF-8: EL SISTEMA permitirá ocultar y volver a mostrar cada capa.
- RF-9: EL SISTEMA permitirá ajustar por capa de imagen la profundidad, el margen, el modo de mezcla y la opacidad.
- RF-69: EL SISTEMA solo ofrecerá en el editor los modos de mezcla que la imagen plana reproduce igual que la web.
- RF-10: EL SISTEMA permitirá añadir capas de partículas con su tipo, cantidad, tamaño, velocidad y color.
- RF-11: EL SISTEMA permitirá elegir el marco entre los cinco de rareza (n, r, sr, ssr, ur).
- RF-12: EL SISTEMA permitirá poner un sello de texto con su estilo o un sello de imagen, en cualquiera de las cuatro
  esquinas, o no poner sello.
- RF-13: CUANDO el administrador pulse «Aplicar estilo de la rareza», EL SISTEMA pondrá el marco, las partículas y el
  sello del preset del escalón de la rareza de la carta.
- RF-14: EL SISTEMA mostrará la vista previa del editor sobre la escena oscura del estilo Street pop.
- RF-15: EL SISTEMA no pondrá texto encima de la carta por capas (ni número ni nombre).
- RF-16: CUANDO el administrador guarde, EL SISTEMA guardará la configuración por capas junto a la carta.
- RF-17: SI la configuración por capas no tiene ninguna capa visible, ENTONCES EL SISTEMA no la guardará e indicará
  que hace falta al menos una.
- RF-18: CUANDO el administrador quite todas las capas de una carta y guarde, EL SISTEMA dejará la carta sin capas.
- RF-67: SI el administrador intenta quitar todas las capas de una carta creada desde capas, ENTONCES EL SISTEMA no
  lo permitirá e indicará que necesita al menos una capa de imagen visible.
- RF-68: CUANDO una carta con imagen original se quede sin capas, EL SISTEMA la mostrará con su imagen compuesta con
  el marco de Pencil.

### Edición simultánea
- RF-19: SI otro administrador guardó la configuración por capas de la carta después de que el editor la cargara,
  ENTONCES EL SISTEMA no guardará y avisará del conflicto.
- RF-20: CUANDO el administrador avisado de un conflicto elija recargar, EL SISTEMA descartará sus cambios y mostrará
  la configuración guardada.
- RF-21: CUANDO el administrador avisado de un conflicto elija forzar el guardado y lo confirme, EL SISTEMA guardará
  su configuración sobre la otra.

### Crear y convertir cartas
- RF-22: CUANDO el administrador añada capas a una carta sin capas y guarde, EL SISTEMA la convertirá en carta con
  capas.
- RF-23: CUANDO el administrador cree una carta a partir de capas en una colección en borrador, EL SISTEMA la creará
  en borrador con el siguiente número libre.
- RF-24: EL SISTEMA aplicará a una carta creada a partir de capas las mismas comprobaciones de publicación que al
  resto (personaje, nombre, rareza y revisión 18+; spec 003, RF-6).
- RF-25: EL SISTEMA conservará el número, el nombre, la rareza y la colección de la carta en la base de datos, tenga
  capas o no.

### Imagen plana
- RF-26: CUANDO se guarde la configuración por capas de una carta, EL SISTEMA generará en el servidor su imagen plana
  con todos los tamaños que usa hoy la carta.
- RF-27: EL SISTEMA generará la imagen plana respetando el modo de mezcla y la opacidad de cada capa.
- RF-28: EL SISTEMA generará la imagen plana con las capas en reposo (sin inclinación) y las partículas en una
  posición fija.
- RF-29: CUANDO una carta existente pase a tener capas, EL SISTEMA usará la imagen plana de sus capas en lugar de su
  imagen compuesta con el marco de Pencil en todos los sitios que usan imagen plana.

### Validación de capas
- RF-30: EL SISTEMA aceptará capas de imagen PNG, JPEG o WebP de hasta 20 MB.
- RF-31: SI una capa de imagen no es PNG, JPEG o WebP o pesa más de 20 MB, ENTONCES EL SISTEMA la rechazará
  indicando el motivo y seguirá con las demás.
- RF-32: SI una capa de imagen mide menos de 700 px de ancho, ENTONCES EL SISTEMA la rechazará indicando el mínimo.
- RF-33: SI la proporción de una capa de imagen difiere más de un 1 % de 700 × 991, ENTONCES EL SISTEMA la rechazará
  indicando el tamaño esperado.
- RF-34: CUANDO una capa de imagen tenga la proporción del lienzo con un tamaño distinto, EL SISTEMA la escalará al
  lienzo.
- RF-35: EL SISTEMA guardará cada capa de imagen convertida a WebP optimizado.
- RF-36: SI una carta ya tiene 8 capas de imagen, ENTONCES EL SISTEMA no permitirá añadir otra e indicará el límite.
- RF-37: EL SISTEMA no contará las capas de partículas en el límite de 8 capas de imagen.
- RF-38: EL SISTEMA aceptará la imagen del sello aunque no tenga la proporción del lienzo.
- RF-39: SI la misma imagen está dos veces en la misma carta, ENTONCES EL SISTEMA la guardará y mostrará un aviso.
- RF-40: EL SISTEMA permitirá usar la misma imagen de capa en cartas distintas sin aviso.

### Cambio de rareza
- RF-41: CUANDO cambie la rareza de una carta con capas, EL SISTEMA cambiará su marco al de la rareza nueva.
- RF-42: CUANDO cambie la rareza de una carta con capas y sello de texto, EL SISTEMA cambiará el sello al de la rareza
  nueva.
- RF-43: SI cambia la rareza de una carta con capas y sello de imagen, ENTONCES EL SISTEMA mantendrá el sello y
  avisará de que hay que revisarlo.
- RF-44: CUANDO cambie la rareza de una carta con capas, EL SISTEMA mantendrá sus capas de partículas.

### Revisión 18+
- RF-45: CUANDO se añada, quite o sustituya una capa de imagen de una carta 18+, EL SISTEMA anulará su revisión.
- RF-46: CUANDO una capa de imagen que no era visible de una carta 18+ pase a ser visible, EL SISTEMA anulará su
  revisión.
- RF-47: CUANDO solo cambien la profundidad, el margen, la mezcla, la opacidad de una capa que sigue visible, las
  partículas, el sello de texto o el orden, EL SISTEMA mantendrá la revisión.
- RF-48: MIENTRAS una carta 18+ publicada tenga cambios de capas sin revisar, EL SISTEMA mostrará a los coleccionistas
  su versión revisada.
- RF-49: CUANDO un administrador marque como revisada una carta 18+ publicada con cambios de capas, EL SISTEMA
  mostrará la versión nueva a los coleccionistas.
- RF-50: EL SISTEMA solo entregará las capas de una carta 18+ a quien haya pasado el doble control de edad
  (declaración más tier adulto; constitución, principio 6).

### Colecciones publicadas
- RF-51: MIENTRAS una colección esté publicada, EL SISTEMA permitirá añadir, cambiar y quitar capas de sus cartas.
- RF-52: CUANDO cambie la configuración por capas de una carta SFW publicada, EL SISTEMA mostrará la versión nueva a
  todos los que ya la tienen.

### Lo que ve el coleccionista
- RF-53: MIENTRAS una carta tenga capas, EL SISTEMA la mostrará por capas, con su marco, rareza y sello, y no usará su
  imagen compuesta con el marco de Pencil.
- RF-54: MIENTRAS una carta no tenga capas, EL SISTEMA la mostrará exactamente como antes de esta spec.
- RF-55: EL SISTEMA mostrará la carta con capas interactiva en la apertura de sobres y en la ficha de carta.
- RF-56: EL SISTEMA mostrará la carta con capas sin inclinación en las rejillas (colección, «Abrir todos» y resumen
  de la apertura).
- RF-57: CUANDO se voltee una carta con capas en la apertura, EL SISTEMA mostrará su sello con la entrada animada.
- RF-58: EL SISTEMA mostrará el número, el nombre y la rareza fuera de la carta igual para cartas con capas y sin
  capas.
- RF-71: EL SISTEMA dibujará el sello de texto con la misma tipografía en la web y en la imagen plana.
- RF-59: CUANDO el coleccionista toque el control de giroscopio en la ficha o la apertura en un móvil, EL SISTEMA
  pedirá permiso si hace falta y la carta seguirá la inclinación del teléfono.
- RF-60: SI el permiso de giroscopio se deniega o no existe, ENTONCES EL SISTEMA seguirá respondiendo al dedo sin
  mostrar un error.
- RF-61: DONDE se use una imagen simple (avatares, listas del panel, miniaturas pequeñas), EL SISTEMA usará la imagen
  plana de la carta con capas.

### Zonas públicas
- RF-62: EL SISTEMA mostrará en el álbum público, la portada y las vistas previas para redes la imagen plana con marca
  de agua de las cartas con capas.
- RF-63: EL SISTEMA no entregará las capas sueltas de una carta a quien no tenga sesión.

### Importar y exportar
- RF-64: CUANDO el administrador exporte la configuración por capas de una carta, EL SISTEMA entregará el mismo
  formato que produce el creador independiente.
- RF-65: CUANDO el administrador importe una configuración del creador independiente y suba sus archivos, EL SISTEMA
  colocará cada archivo en su capa.
- RF-66: SI una configuración importada no es válida, ENTONCES EL SISTEMA no cambiará la carta e indicará qué parte
  falla.
- RF-70: SI una configuración importada usa un modo de mezcla que el editor no ofrece, ENTONCES EL SISTEMA lo cambiará
  a normal e indicará qué capas cambiaron.

## Requisitos no funcionales
- Animación: solo `transform` y `opacity`, `prefers-reduced-motion` respetado (sin balanceo ni parpadeo, pero
  respondiendo al ratón, al dedo y al teclado) y 60 fps en Pixel 6a e iPhone 12 en la apertura y la ficha
  (constitución, principio 9).
- Rejillas: una colección de 50 cartas con capas no baja de 60 fps al desplazarse en esos móviles.
- Seguridad: las capas se sirven con URL firmada y caducidad como el resto del arte (constitución, principio 6).
- Dependencias: si generar la imagen plana en el servidor exige una dependencia nueva, se justifica en el plan
  (constitución, principio 1).
- Accesibilidad: la carta por capas tiene nombre para lectores de pantalla y se inclina con las flechas del teclado;
  el editor se usa con teclado.
- Idioma: todos los textos del editor en los diccionarios (inglés y español).

## Casos límite
- Todas las capas ocultas o con opacidad 0: no se guarda (RF-17).
- Dos administradores guardan la misma carta: el segundo recibe el aviso de conflicto (RF-19 a RF-21).
- Una capa falla al subir a mitad de un lote: las demás se guardan (RF-31).
- Se importa una configuración que referencia más de 8 capas de imagen: se rechaza (RF-36, RF-66).
- Se cambia la rareza de una carta con capas: cambian marco y sello de texto; el sello de imagen se mantiene con
  aviso; las partículas no cambian (RF-41 a RF-44).
- La misma imagen dos veces en una carta: se guarda con aviso (RF-39); en cartas distintas, sin aviso (RF-40).
- Carta 18+ publicada con cambios sin revisar: los coleccionistas ven la versión revisada (RF-48).
- Carta 18+ sin revisar que nunca se publicó: no puede publicarse (spec 003, RF-6).
- Movimiento reducido: la carta no se balancea sola, pero sigue respondiendo al ratón, al dedo y al teclado.

## Fuera de alcance
- Historial de versiones de las capas y deshacer (más allá de conservar la versión revisada de las cartas 18+).
- Copiar la configuración de una carta a otra y las plantillas.
- Cambiar las cartas sin capas, su marco de Pencil o su composición.
- Cambiar reglas de colecciones, sorteo, probabilidades, concesiones o publicación.
- Capas en las zonas públicas (solo imagen plana con marca de agua).
- Texto sobre la carta por capas (número o nombre).
- Editar capas desde fuera del panel de administración.

## Criterios de finalización
- Cada RF con su test (Vitest o Playwright) en verde y la suite completa en verde.
- Demo manual: añadir capas a una carta existente, crear una carta desde capas, verlas en la apertura, la ficha y la
  colección, y comprobar que el álbum público muestra la imagen plana con marca de agua.
- Demo manual 18+: cambiar una capa de una carta publicada y comprobar que el coleccionista sigue viendo la versión
  revisada hasta volver a revisarla.
- Validación de 60 fps en la apertura y la ficha en Pixel 6a e iPhone 12.

## Decisiones de la entrevista (21 oct 2026)
- Las dos vías: añadir capas a una carta existente y crear una carta nueva desde capas.
- Con capas, el marco, la rareza y el sello los pone la carta por capas (no el marco de Pencil); sin capas, nada
  cambia. La carta por capas no lleva texto encima: el número se muestra fuera.
- Toda carta con capas genera en el servidor una imagen plana (con mezclas y partículas en reposo), que sustituye a la
  compuesta con Pencil en los sitios de imagen plana y en las zonas públicas, con marca de agua.
- Lienzo fijo de proporción 700 × 991 (recomendado 1400 × 1982; mínimo 700 px de ancho), tolerancia del 1 %, escalado
  automático; el sello queda fuera de esa regla; WebP optimizado; máximo 8 capas de imagen.
- Revisión 18+: la anula cualquier cambio de imagen de capa o volver visible una capa de imagen. En cartas publicadas,
  los coleccionistas ven la versión revisada hasta la nueva revisión. Las capas 18+ solo se entregan con el doble
  control de edad. Cualquier administrador ve las capas en el panel para poder revisarlas.
- Las capas se editan libremente también en colecciones publicadas.
- Cambio de rareza: marco y sello de texto siguen a la rareza; sello de imagen con aviso; partículas sin cambios.
- Al menos una capa visible para guardar. Edición simultánea con aviso de conflicto: recargar o forzar a sabiendas.
- Imagen repetida: aviso suave solo dentro de la misma carta.
- Entran el giroscopio y la importación/exportación del creador; quedan fuera el historial y las plantillas.

## Cambios
- 21 oct 2026, revisión del plan: RF-67 y RF-68 (quitar todas las capas: se impide en una carta creada desde capas;
  con imagen original vuelve a Pencil), RF-69 y RF-70 (solo modos de mezcla que la imagen plana reproduce; los
  importados que no, a normal con aviso) y RF-71 (misma tipografía del sello en la web y en el plano). Los números
  nuevos van al final para no renumerar los aprobados.

## Dudas abiertas
Ninguna.
