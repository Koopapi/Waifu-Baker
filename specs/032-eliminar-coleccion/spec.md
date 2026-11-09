# Spec 032 — Eliminar una colección desde el panel

Estado: **aprobada por el dueño el 9 nov 2026**, tras la entrevista del mismo día.

Decisiones del dueño en la entrevista:
1. Se puede eliminar un borrador siempre, y una colección publicada o archivada solo si ningún usuario recibió nunca
   cartas ni sobres de ella. Si alguien los tiene, el aviso lo dice y ofrece archivar en su lugar (RN-40 y RN-64 no
   cambian).
2. El aviso explica qué se borra y pide escribir el código de la colección para activar «Eliminar».
3. Si la colección se usa en otro lugar del sitio, no se elimina: el aviso lista cada lugar con su enlace.
4. El botón va dentro de la colección, en una zona de peligro al final de la página, junto a «Archivar».

## Contexto y objetivo
Hoy una colección solo pasa de borrador a publicada y de publicada a archivada: no hay forma de quitarla. Las colecciones
de prueba, las duplicadas o las que se empezaron mal se quedan para siempre en «Sets». El objetivo es poder eliminar
desde el panel las colecciones que nadie tiene, con un aviso que deje claro qué se pierde y que haga muy difícil
eliminar la equivocada, sin tocar nunca lo que ya recibió un coleccionista.

## Usuarios / actores
- **Administrador** (el dueño y Bruno): elimina colecciones desde el panel.
- **Coleccionista**: no ve nada nuevo; sus cartas y sobres nunca se borran por esta función.

## Historias de usuario
- H1: Como administrador quiero eliminar una colección de prueba o mal empezada, para que «Sets» muestre solo las que
  sirven.
- H2: Como administrador quiero ver antes de eliminar qué se va a borrar, para no perder trabajo por error.
- H3: Como coleccionista quiero que nunca desaparezcan las cartas o los sobres que ya recibí.

## Requisitos funcionales (criterios de aceptación en EARS)

### El botón y el aviso
- RF-1: EL SISTEMA mostrará en la página de una colección del panel una zona de peligro al final, con «Archivar» (si la
  colección se puede archivar) y «Eliminar colección».
- RF-2: CUANDO el administrador pulse «Eliminar colección», EL SISTEMA abrirá un aviso que diga cuántas cartas, imágenes
  y diseños de sobre se borrarán.
- RF-3: EL SISTEMA dirá en el aviso que eliminar no se puede deshacer.
- RF-4: MIENTRAS el texto escrito en el aviso no coincida con el código de la colección, EL SISTEMA mantendrá
  desactivado el botón «Eliminar» (la comparación ignora mayúsculas y espacios exteriores).
- RF-5: CUANDO el administrador confirme, EL SISTEMA eliminará la colección con sus cartas, versiones, capas, imágenes,
  probabilidades y diseños de sobre.
- RF-6: CUANDO se elimine la colección, EL SISTEMA volverá a «Sets» y mostrará un aviso de que se eliminó, con su código.
- RF-7: CUANDO se elimine la colección, EL SISTEMA registrará en la auditoría quién la eliminó, cuándo, su código, su
  nombre y cuántas cartas tenía.

### Cuándo no se puede eliminar
- RF-8: SI algún usuario recibió alguna vez un sobre o una carta de la colección (aunque ya los haya abierto, reciclado
  o enviado de expedición), ENTONCES EL SISTEMA no la eliminará.
- RF-9: SI la colección no se puede eliminar por tener dueños, ENTONCES EL SISTEMA dirá en el aviso cuántos usuarios
  tienen cartas o sobres de ella, sin mostrar quiénes.
- RF-10: SI la colección no se puede eliminar por tener dueños y está publicada, ENTONCES EL SISTEMA ofrecerá en el aviso
  archivarla.
- RF-11: SI la colección es la de bienvenida, tiene cartas de portada o la usa una regla de tier de Patreon, ENTONCES
  EL SISTEMA no la eliminará.
- RF-12: SI la colección no se puede eliminar porque se usa en otro lugar, ENTONCES EL SISTEMA listará en el aviso cada
  lugar con un enlace a la página del panel donde se quita.
- RF-13: MIENTRAS la colección no se pueda eliminar, EL SISTEMA no mostrará el campo para escribir el código ni el botón
  «Eliminar» del aviso.
- RF-14: SI entre abrir el aviso y confirmar alguien recibe un sobre de la colección o la colección pasa a usarse en otro
  lugar, ENTONCES EL SISTEMA no la eliminará y mostrará el aviso actualizado.

### Seguridad
- RF-15: EL SISTEMA permitirá eliminar colecciones solo a los administradores.

## Requisitos no funcionales
- Integridad: eliminar es todo o nada; si algo falla a mitad, la colección queda como estaba.
- Almacenamiento: las imágenes de la colección se borran del almacén, salvo las que use otra colección o la biblioteca
  de elementos.
- Copias de seguridad: lo eliminado sigue en las copias nocturnas durante su retención (30 días), y no se restaura solo.
- Idioma: el aviso y los mensajes, en inglés y español.
- Sistema de diseño: la zona de peligro, el aviso y el campo usan los componentes reutilizables (RN-140).
- Rendimiento: comprobar si se puede eliminar tarda menos de 1 s en una colección de 30 cartas en el servidor de pruebas.

## Casos límite
- Colección sin cartas: se elimina igual; el aviso dice 0 cartas.
- Borrador con cartas a medio procesar (miniatura pendiente): se elimina y no quedan imágenes sueltas.
- Una carta que estaba como «carta de portada del sobre» de la colección: se borra con ella.
- Colección 18+: las mismas reglas; el aviso no muestra arte.
- Dos administradores eliminan la misma colección a la vez: solo uno lo consigue; el otro vuelve a «Sets» con un aviso
  de que ya no existe.
- La colección se editó en otra pestaña después de abrir el aviso: se elimina igual (la edición no cambia si se puede
  eliminar).
- Código escrito con minúsculas o espacios alrededor: cuenta como correcto.
- Sobres del simulador del panel: no son de usuarios y no impiden eliminar.

## Fuera de alcance
- Eliminar colecciones con dueños, o quitarles cartas o sobres a los usuarios.
- Deshacer una eliminación o una papelera.
- Eliminar desde la lista de «Sets» o varias colecciones a la vez.
- Quitar sola la colección de la bienvenida, la portada o las reglas de tier.
- Cambiar «Archivar» o el paso de borrador a publicada.

## Criterios de finalización
Cada RF con su test en verde: unidad para las reglas de cuándo se puede eliminar, integración para la eliminación todo
o nada, los dueños, los lugares en uso y la carrera de dos eliminaciones, y E2E del aviso (código, eliminar, colección
con dueños con «Archivar», colección en uso con enlaces y un coleccionista sin acceso). Suite completa en verde en los
cuatro proyectos.

## Dudas abiertas
- Ninguna.
