# Spec 038 — Nombres nuevos de las rarezas: Common, Rare, Ultra Rare, SSR y EX

Estado: **aprobada por el dueño el 11 nov 2026**, tras la entrevista del mismo día.

Decisiones del dueño en la entrevista:
1. Las cinco rarezas pasan a llamarse **Common, Rare, Ultra Rare, SSR y EX**, en lugar de Común, Rara, Épica, Legendaria
   y EX.
2. Los nombres son los mismos en español y en inglés.
3. Los sellos de las cartas pasan a **C, R, UR, SSR y EX**. Hoy son C, R, E, LEG y EX.
4. El cambio de sello se aplica también a las cartas ya armadas, y sus imágenes se regeneran.

## Contexto y objetivo
Las rarezas se muestran con nombres en español (Común, Rara, Épica, Legendaria y EX) y sus equivalentes en inglés. El
dueño quiere los nombres de los juegos de cartas que conoce su público, iguales en los dos idiomas, con sellos que
correspondan a esos nombres. Solo cambian los nombres y los sellos: las probabilidades, las garantías, los efectos y el
orden de las rarezas se quedan igual.

## Usuarios / actores
- **Coleccionista y visitante**: leen el nombre de la rareza en cartas, sobres, colección y probabilidades.
- **Administrador**: elige rarezas, edita probabilidades y arma cartas con su sello.

## Historias de usuario
- H1: Como coleccionista quiero ver las rarezas con los nombres que conozco de otros juegos de cartas.
- H2: Como administrador quiero que el sello de cada carta coincida con su rareza sin editarlas una por una.

## Requisitos funcionales (criterios de aceptación en EARS)

### Nombres
- RF-1: EL SISTEMA nombrará las rarezas, de menor a mayor, Common, Rare, Ultra Rare, SSR y EX.
- RF-2: EL SISTEMA mostrará esos nombres iguales en español y en inglés.
- RF-3: EL SISTEMA usará esos nombres en todas las pantallas del coleccionista, del visitante y del panel. Eso incluye
  las cartas, el resumen de un sobre, los filtros, la colección, el álbum, las probabilidades públicas, la protección de
  mala suerte, las garantías y los avisos de error.
- RF-4: EL SISTEMA usará esos nombres en los textos que agrupan cartas por rareza: «Commons», «Rares», «Ultra Rares»,
  «SSR» y «EX».
- RF-5: EL SISTEMA mostrará la rareza en el efecto especial de la apertura (spec 030, RF-22) con su nombre nuevo.

### Sellos
- RF-6: CUANDO el administrador aplique a una carta el estilo de su rareza, EL SISTEMA le pondrá el sello C, R, UR, SSR
  o EX según su rareza.
- RF-7: CUANDO se despliegue esta spec, EL SISTEMA cambiará el sello E por UR y el sello LEG por SSR en las cartas ya
  armadas.
- RF-8: SI el sello de una carta tiene un texto distinto del de su rareza (escrito a mano en el armador), ENTONCES EL
  SISTEMA no lo cambiará.
- RF-9: CUANDO cambie el sello de una carta ya armada, EL SISTEMA regenerará sus imágenes fijas.
- RF-10: CUANDO cambie el sello de una carta ya armada, EL SISTEMA lo guardará como una versión nueva en su historial
  (spec 027), con el motivo «Nombres nuevos de rareza».
- RF-11: SI una carta 18+ tiene cambios pendientes de revisión, ENTONCES EL SISTEMA cambiará el sello en lo aprobado y en
  lo pendiente, sin pedir otra revisión por el sello.

## Requisitos no funcionales
- Los textos siguen en los diccionarios (`i18n.test.ts` en verde); el nombre de cada rareza se define en un solo lugar.
- Lo que la web guarda internamente para cada rareza no cambia, así que las probabilidades publicadas y la historia de
  aperturas no se tocan.
- La regeneración de imágenes al desplegar no deja la web sin responder.

## Casos límite
- Carta con sello oculto o sin sello: no cambia.
- Carta sin configuración de capas: no tiene sello; no cambia.
- Imágenes compartidas y vistas previas del álbum ya publicadas: se regeneran con la carta.
- Una regeneración que falla: la carta conserva su imagen anterior y aparece en el panel para reintentar (como en la spec
  037, RF-18).
- Textos con artículo o género en español («una Épica», «Rara o mejor»): se reescriben con el nombre nuevo, sin
  traducirlo.

## Fuera de alcance
- Cambiar el número de rarezas, su orden, sus probabilidades o sus efectos.
- Cambiar los marcos de las cartas o el estilo (color) de cada sello.
- La demo.

## Criterios de finalización
Cada RF con su test en verde:
- **Unidad**: los nombres en los dos idiomas; el sello de cada rareza; el cambio E → UR y LEG → SSR, que respeta los
  sellos escritos a mano.
- **Integración**: el cambio al desplegar, con su versión en el historial y la regeneración de imágenes.
- **E2E**: el nombre nuevo en las probabilidades, en el resumen de un sobre y en el filtro de la colección; el barrido
  de pantallas sin los nombres anteriores.

Además: suite completa en verde en los cuatro proyectos.

## Dudas abiertas
- Ninguna.
