# Spec 036 — Textos generales, sin nombres de personas

Estado: **aprobada por el dueño el 9 nov 2026**.

Decisión del dueño: ni la web ni la documentación nombran personas. No se dice «el armador de cartas de …» ni «diseño
de …»: todo se describe por lo que es. Por ejemplo, «el armador de cartas», «el creador de sobres» o «el paquete de
diseño».

## Contexto y objetivo
Desde la spec 022, varios textos se refieren al colaborador de diseño por su nombre. Hay uno visible en la web («Diseño
de …», en el tema Street pop de «Mi cuenta») y unas 100 menciones en comentarios del código, nombres de pruebas, specs
y documentos. El objetivo es que todo sea general, en la web y en el repositorio.

## Usuarios / actores
- **Coleccionista**: ve los textos de la web.
- **Equipo**: lee el código, las specs y los documentos.

## Historias de usuario
- H1: Como dueño quiero que la web no nombre a personas, para que el producto hable por sí mismo.
- H2: Como equipo queremos documentos generales, para que sigan sirviendo aunque cambie quién colabora.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: EL SISTEMA no mostrará en ningún texto de la web, en inglés ni en español, el nombre de una persona del equipo
  ni del colaborador de diseño.
- RF-2: EL SISTEMA describirá el tema Street pop en «Mi cuenta» solo por su aspecto, sin decir quién lo diseñó.
- RF-3: Los comentarios del código, los nombres de las pruebas y los pasos de las E2E describirán las piezas por su
  función, sin nombres de personas.
- RF-4: Las specs, los planes, las validaciones y los documentos de `docs/` usarán descripciones generales, sin
  cambiar lo que dicen.
- RF-5: SI alguien añade un nombre de persona a un texto de la web, ENTONCES la suite de pruebas fallará.

## Requisitos no funcionales
- Sin cambios de comportamiento: la web funciona igual, y solo cambian textos y comentarios.
- Las pruebas que se renombran conservan su RF en el nombre, para que el informe de cobertura las siga contando.

## Casos límite
- `docs/waifu-baker/` son los paquetes de diseño originales, de solo referencia: no se tocan.
- Los nombres de los personajes de las cartas (Yuki, Aiko…) no son personas del equipo y se quedan.
- Los nombres de archivos y carpetas que no se ven en la web se quedan, salvo que lleven el nombre de una persona.
- El historial de git no se reescribe.

## Fuera de alcance
- Reescribir el historial de git o los mensajes de commits y PR ya hechos.
- Los paquetes de `docs/waifu-baker/`.
- Cambiar los nombres de los personajes o de las colecciones.

## Criterios de finalización
- Una prueba de unidad recorre los diccionarios de la web (es y en) y falla si aparece un nombre de la lista de
  personas del equipo (RF-1, RF-5).
- Una búsqueda en el repositorio, sin contar `docs/waifu-baker/`, no encuentra esos nombres.
- La suite completa en verde.

## Dudas abiertas
- Ninguna.
