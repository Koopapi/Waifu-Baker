# Spec 012 — Moderación de álbumes públicos

## Contexto y objetivo
Los álbumes públicos (spec 006) muestran un alias elegido por el usuario. Los términos de uso ya dicen que
podemos ocultar los álbumes que los incumplan, pero el panel no tiene cómo hacerlo. Esta spec da al
administrador una sección para ocultar álbumes con un motivo y un circuito de revisión para que el dueño pueda
corregir el alias. No cambia cómo se activa, se comparte o se ve un álbum que cumple las normas.

## Usuarios / actores
- **Administrador**: revisa los álbumes públicos, los oculta y decide las peticiones de revisión.
- **Dueño del álbum**: ve por qué se ocultó, cambia el alias y pide revisión.
- **Visitante**: quien abre el enlace de un álbum.

## Historias de usuario
- H1: Como administrador quiero ocultar un álbum con un alias ofensivo, una suplantación o spam, y dejar constancia del motivo.
- H2: Como dueño quiero saber por qué se ocultó mi álbum y poder corregirlo.
- H3: Como administrador quiero ver primero las peticiones de revisión pendientes y decidirlas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Sección «Álbumes» del panel
- RF-1: EL SISTEMA mostrará en el panel una sección «Álbumes» con los álbumes públicos y los ocultos: alias, dueño, estado, fecha de activación y enlace, con un buscador por alias o por dueño.
- RF-2: EL SISTEMA ordenará la lista con los álbumes ocultos que tienen una revisión pedida primero, por fecha de la petición, y después el resto.
- RF-3: EL SISTEMA mostrará el historial de moderación de cada álbum: ocultaciones, peticiones de revisión y decisiones, con fecha, quién lo hizo, motivo, nota y alias.

### Ocultar
- RF-4: CUANDO el administrador oculta un álbum público, EL SISTEMA le pedirá un motivo de una lista (alias ofensivo, suplantación, spam u otro) y una nota opcional de hasta 300 caracteres, y lo confirmará en un modal antes de aplicarlo.
- RF-5: MIENTRAS un álbum esté oculto, EL SISTEMA responderá a sus visitantes con «Este álbum no está disponible» (sin alias, cartas ni imágenes, y sin vista previa para redes) y no lo contará como álbum activo en las métricas.
- RF-6: EL SISTEMA conservará al ocultar el alias, el enlace y las cartas destacadas, y al restaurar el álbum volverá a funcionar el mismo enlace.

### El dueño
- RF-7: MIENTRAS su álbum esté oculto, EL SISTEMA mostrará al dueño en «Mi cuenta» y en los ajustes del álbum que está oculto, el motivo y la nota del administrador.
- RF-8: MIENTRAS su álbum esté oculto, EL SISTEMA no dejará al dueño volver a hacerlo público directamente: para pedir revisión deberá escribir un alias distinto del que tenía.
- RF-9: CUANDO el dueño pide revisión, EL SISTEMA guardará el alias nuevo como propuesta, le mostrará «Revisión pedida» y no le dejará pedir otra hasta que se decida.
- RF-10: SI el dueño pidió una revisión hace menos de 7 días, ENTONCES EL SISTEMA no le dejará pedir otra y le dirá a partir de qué día podrá hacerlo.

### Revisión
- RF-11: CUANDO el administrador aprueba una revisión, EL SISTEMA aplicará el alias propuesto y volverá a hacer público el álbum con su enlace y sus destacadas.
- RF-12: CUANDO el administrador rechaza una revisión, EL SISTEMA mantendrá el álbum oculto, guardará una nota opcional y mostrará al dueño «Revisión rechazada» con esa nota.
- RF-13: EL SISTEMA registrará cada ocultación, petición, aprobación y rechazo en el historial de administración, con el actor, el motivo, la nota y el alias antes y después.
- RF-14: SI el dueño desactiva un álbum oculto, ENTONCES EL SISTEMA lo dejará privado pero conservará su estado de moderación: al volver a activarlo seguirá oculto.

## Requisitos no funcionales
- Todo con los componentes del sistema de diseño (spec 011) y textos en inglés y español (spec 008).
- Ocultar y decidir revisiones se reflejan al momento en la web pública (sin caché que deje ver un álbum oculto).

## Casos límite
- El dueño borra su cuenta con el álbum oculto: se borra como siempre (spec 001); el historial queda anónimo.
- Dos administradores deciden la misma revisión a la vez: gana el primero y el segundo ve que ya está decidida.
- Un álbum oculto sin petición de revisión no aparece arriba de la lista.

## Fuera de alcance
- Botón «Denunciar» para visitantes y lista de denuncias.
- Filtro automático de palabras en los alias.
- Bloqueo por reincidencia y avisos por correo.

## Criterios de finalización
Todos los RF con test en verde; E2E: el administrador oculta un álbum con motivo → el visitante ve «no
disponible» → el dueño ve el motivo, cambia el alias y pide revisión → no puede pedir otra → el administrador la
rechaza con nota → el dueño la ve → tras 7 días (reloj de pruebas) pide otra → el administrador la aprueba → el
mismo enlace vuelve a funcionar. En los cuatro proyectos.

## Decisiones de la entrevista (16 oct 2026)
Alcance A (ocultar desde el panel con motivo, sin denuncias ni filtro), vuelta con revisión del administrador,
aviso con motivo y nota en «Mi cuenta» y ajustes, sección «Álbumes» con los pendientes arriba, ocultar no borra
nada ni bloquea por reincidencia, y una petición de revisión cada 7 días como máximo.

Spec aprobada por el usuario el 16 oct 2026.
