# Spec 003 — Panel de administración

## Contexto y objetivo
Las cartas, las colecciones y sus probabilidades son el producto que se vende. Hoy solo se
podrían cargar con scripts. El administrador necesita un panel sencillo para subir el arte de
una colección de golpe, asignar a cada carta su personaje y su rareza, dejar que el sistema
componga la carta con su marco, ajustar las probabilidades, revisar el contenido 18+, ver cómo
quedará cada carta y cada sobre, y publicar. También necesita mapear los tiers de Patreon a
colecciones y atender a los usuarios regalándoles sobres. Todo sin tocar código.

## Usuarios / actores
- **Administrador**: el creador del proyecto. En esta versión hay un único rol con acceso total.
- **Usuario**: coleccionista. No ve el panel; solo recibe sus efectos (colecciones publicadas,
  sobres regalados).

Conceptos:
- **Colección**: conjunto numerado de cartas que se vende en sobres. Puede ser SFW o 18+.
  Estados: borrador, publicada, archivada.
- **Carta**: arte + personaje + nombre + número + rareza + variante. La imagen final la compone el
  sistema y no lleva textos: solo el marco del color de su rareza, el sello WB y el número. El
  nombre y el texto se muestran en la web, no en la imagen.
- **Probabilidades**: pesos por ranura del sobre y por rareza, más la probabilidad de holo.

## Historias de usuario
- H1: Como administrador quiero arrastrar todas las imágenes de una colección a la vez para no cargar una por una.
- H2: Como administrador quiero asignar personaje y rareza a varias cartas a la vez desde una cuadrícula.
- H3: Como administrador quiero subir solo el arte y que el sistema ponga el marco, para cambiar rarezas o el diseño sin rehacer imágenes.
- H4: Como administrador quiero ver la carta con marco y holo, y simular un sobre, antes de publicar.
- H5: Como administrador quiero editar las probabilidades y ver el porcentaje real de cada carta.
- H6: Como administrador quiero que una colección publicada no se pueda alterar en lo que afecta a las probabilidades, para no romper lo anunciado.
- H7: Como administrador quiero revisar carta por carta el contenido 18+ y que no se publique nada sin revisar.
- H8: Como administrador quiero decidir qué colección y cuántos sobres da cada tier de Patreon.
- H9: Como administrador quiero buscar a un usuario y regalarle sobres para dar soporte o premios.

## Requisitos funcionales (criterios de aceptación en EARS)

### Acceso y registro
- RF-1: EL SISTEMA solo permitirá ver y usar el panel a cuentas con rol de administrador.
- RF-2: SI una cuenta sin rol de administrador pide una página u operación del panel, ENTONCES EL SISTEMA responderá como si no existiera (404) y registrará el intento.
- RF-3: EL SISTEMA registrará cada cambio hecho desde el panel con autor, fecha, entidad, valores anteriores y valores nuevos.

### Colecciones
- RF-4: CUANDO el administrador crea una colección, EL SISTEMA la guardará en borrador con código único, nombre, indicación SFW o 18+ y tamaño de sobre (5 por defecto).
- RF-5: MIENTRAS una colección esté en borrador, EL SISTEMA no la mostrará a usuarios ni la usará para conceder o abrir sobres.
- RF-6: CUANDO el administrador pide publicar una colección, EL SISTEMA comprobará que cada ranura suma 100 %, que toda rareza con probabilidad mayor que cero tiene al menos una carta, que todas las cartas tienen personaje, nombre, rareza e imagen compuesta, y que en una colección 18+ todas están revisadas.
- RF-7: SI alguna comprobación de publicación falla, ENTONCES EL SISTEMA no publicará y mostrará la lista completa de problemas, cada uno enlazado a la carta o ranura afectada.
- RF-8: MIENTRAS una colección esté publicada, EL SISTEMA impedirá añadir o quitar cartas, cambiar rarezas, variantes o números y cambiar probabilidades, y permitirá cambiar nombres, textos e imagen de arte.
- RF-9: CUANDO el administrador archive una colección publicada, EL SISTEMA dejará de usarla en concesiones nuevas y conservará intactas las cartas ya obtenidas y los sobres sin abrir, que seguirán pudiéndose abrir.

### Personajes y cartas
- RF-10: EL SISTEMA permitirá crear y editar personajes con nombre, identificador corto y descripción, y reutilizarlos en varias colecciones.
- RF-11: CUANDO el administrador suelte varias imágenes sobre una colección en borrador, EL SISTEMA creará una carta en borrador por imagen, guardará el original y mostrará el progreso y el resultado de cada archivo.
- RF-12: SI un archivo no es PNG, JPEG o WebP, pesa más de 20 MB o mide menos de 600 px de ancho, ENTONCES EL SISTEMA lo rechazará indicando el motivo y continuará con los demás.
- RF-13: SI una imagen es idéntica a otra ya cargada en la misma colección, ENTONCES EL SISTEMA avisará del duplicado y no creará la carta.
- RF-14: EL SISTEMA mostrará las cartas de una colección en cuadrícula y permitirá seleccionar varias y asignarles a la vez personaje, rareza o variante.
- RF-15: EL SISTEMA numerará las cartas de una colección de forma consecutiva y, mientras esté en borrador, permitirá reordenarlas arrastrando.
- RF-16: CUANDO cambie la imagen, el número o la rareza de una carta, EL SISTEMA regenerará la carta compuesta con el marco de su rareza, su número y todos sus tamaños.
- RF-17: EL SISTEMA mostrará por colección el recuento de cartas por rareza y avisará de cada rareza con probabilidad mayor que cero que no tenga cartas.

### Revisión 18+
- RF-18: MIENTRAS una carta pertenezca a una colección 18+, EL SISTEMA exigirá que un administrador la marque como revisada con la confirmación «personaje claramente adulto» y guardará quién y cuándo.
- RF-19: CUANDO cambie la imagen de una carta 18+ revisada, EL SISTEMA anulará su revisión.

### Probabilidades y vista previa
- RF-20: MIENTRAS una colección esté en borrador, EL SISTEMA permitirá editar los pesos por ranura y rareza y la probabilidad de holo, y mostrará el porcentaje resultante de cada rareza por ranura y de cada carta individual por sobre.
- RF-21: CUANDO se publique una colección, EL SISTEMA fijará esa versión de probabilidades y la mostrará en la página pública de probabilidades.
- RF-22: EL SISTEMA mostrará cada carta con su marco y efecto holo tal como la verá el usuario, también en borrador.
- RF-23: CUANDO el administrador pida simular un sobre de una colección, aunque esté en borrador, EL SISTEMA reproducirá la apertura completa con sus cartas y probabilidades reales sin guardar nada en la colección de ningún usuario.

### Tiers y usuarios
- RF-24: EL SISTEMA permitirá asignar a cada tier de la campaña de Patreon una o varias colecciones publicadas con un número de sobres al mes, y activar o desactivar cada asignación; los cambios se aplicarán desde el siguiente cobro de cada miembro.
- RF-25: CUANDO el administrador regale sobres de una colección publicada a un usuario, EL SISTEMA los creará con origen manual y un motivo obligatorio, y los registrará en el historial.
- RF-26: SI la colección de los sobres regalados es 18+ y el usuario no ha superado la verificación de edad, ENTONCES EL SISTEMA rechazará el regalo e indicará el motivo.
- RF-27: EL SISTEMA permitirá buscar usuarios por nombre o identificador de Patreon y ver sus sobres sin abrir, su colección y su historial de aperturas.

## Requisitos no funcionales
- El panel se usa en escritorio y tableta (ancho ≥ 768 px); en móvil basta con que no se rompa.
- Subir 32 imágenes de 1–2 MB termina en menos de 2 minutos en local, y la interfaz sigue usable mientras se procesan.
- Los originales y las imágenes de cartas en borrador nunca son accesibles sin sesión de administrador.
- Textos en español; mensajes de error con causa y acción.

## Casos límite
- Subida interrumpida a mitad: las cartas ya creadas se conservan y el resto se puede reintentar.
- Archivo dañado que no se puede decodificar: se rechaza como en RF-12.
- Dos pestañas editando la misma carta: si la carta cambió desde que se abrió, se avisa y no se sobrescribe.
- Borrar un personaje con cartas asignadas: no se permite hasta reasignarlas.
- Cambiar una colección de SFW a 18+ o al revés: solo en borrador; al pasar a 18+, todas sus cartas quedan sin revisar.
- Ranura con todos los pesos en cero o colección sin cartas: bloquea la publicación (RF-6).
- Rareza con una sola carta: permitido, se muestra su probabilidad individual.
- Regalar sobres a una cuenta borrada: se rechaza.
- Reemplazar el arte de una carta en una colección 18+ ya publicada: la imagen nueva queda pendiente de revisión y los usuarios siguen viendo la anterior hasta que se revise (resuelve el choque entre RF-8 y RF-19).

## Fuera de alcance
- Varios roles o colaboradores (solo un rol de administrador).
- Diseñar o editar el marco dentro del panel: el marco se diseña en Pencil y se incorpora al proyecto como recurso.
- Generar imágenes con BetterWaifu desde el panel.
- Importar desde el taller (`log.jsonl`): queda como herramienta de línea de comandos opcional.
- Estadísticas y analítica de ventas o aperturas.
- Editar páginas legales, borrar usuarios o retirar cartas ya obtenidas.
- Papelera o deshacer más allá del historial de cambios.

## Criterios de finalización
Todos los RF con test en verde (unitarios para reglas de publicación, bloqueo y probabilidades;
integración para subida y regeneración; Playwright para el flujo completo: crear colección →
subir 10 imágenes → asignar en lote → editar probabilidades → simular sobre → publicar →
comprobar bloqueos → regalar un sobre). Demo manual del flujo con arte real de relleno.

## Dudas abiertas
- Resuelta (14 oct 2026): el administrador entra con su cuenta de Patreon de creador; su id está en una lista de administradores. Spec aprobada el mismo día.

## Cambios

- 14 oct 2026: a petición del usuario la carta no lleva textos (ni nombre, ni etiqueta de rareza,
  ni aviso de IA): solo marco de color, sello WB y número. RF-16 deja de regenerar al cambiar el
  nombre. La divulgación de IA pasa a la web (probabilidades, ficha de carta y álbum).
