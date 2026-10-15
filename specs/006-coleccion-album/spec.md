# Spec 006 — Colección y álbum público

## Contexto y objetivo
El coleccionista ya abre sobres y sus cartas se guardan, pero no tiene dónde verlas. Necesita su
colección organizada como un álbum de cromos —con los huecos de lo que le falta, para ver su
progreso y querer completarlo— y una ficha de cada carta con el efecto holo. Además quiere
presumirla: un álbum público que comparte con un enlace, con su alias, sus cartas favoritas y su
progreso, sin exponer contenido 18+ ni datos de su cuenta.

## Usuarios / actores
- **Coleccionista**: usuario con sesión que ve su colección y gestiona su álbum público.
- **Visitante**: cualquiera con el enlace de un álbum público; no necesita sesión.

## Historias de usuario
- H1: Como coleccionista quiero ver cada colección como un álbum con huecos para saber qué me falta.
- H2: Como coleccionista quiero ver una carta en grande, inclinarla y ver su holo si lo tengo.
- H3: Como coleccionista quiero filtrar por rareza y por lo que tengo, me falta o es holo.
- H4: Como coleccionista quiero activar un álbum público con un alias y un enlace que pueda compartir.
- H5: Como coleccionista quiero elegir mis cartas destacadas y poder desactivar o cambiar el enlace.
- H6: Como visitante quiero ver el álbum de alguien con su progreso y una buena imagen al compartirlo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Mi colección
- RF-1: MIENTRAS el usuario tenga sesión, EL SISTEMA mostrará en «Mi colección» cada colección publicada o archivada de la que tenga al menos una carta, con su progreso: cartas distintas obtenidas sobre el total (las versiones holo no cuentan aparte para el progreso).
- RF-2: CUANDO el usuario abre una de sus colecciones, EL SISTEMA mostrará todas sus cartas en orden de número: las que tiene con su imagen y su cantidad, y las que no, como silueta con su número.
- RF-3: EL SISTEMA no mostrará la imagen ni el nombre de una carta que el usuario no tiene.
- RF-4: SI una colección es 18+ y el usuario no tiene la verificación de edad, ENTONCES EL SISTEMA no mostrará sus cartas e indicará cómo verificar la edad.
- RF-5: CUANDO el usuario pulsa una carta que tiene, EL SISTEMA mostrará su ficha: la carta grande con inclinación y holo, nombre, rareza, texto de la carta, cantidad normal y holo, y fecha en que la obtuvo por primera vez.
- RF-6: MIENTRAS el usuario tenga la versión holo de una carta, EL SISTEMA la señalará en el álbum y permitirá alternar entre la versión normal y la holo en la ficha.
- RF-7: EL SISTEMA permitirá filtrar el álbum por rareza y por «todas», «las que tengo», «las que me faltan» y «holo».

### Álbum público
- RF-8: EL SISTEMA mantendrá desactivado el álbum público de cada usuario hasta que él lo active.
- RF-9: CUANDO el usuario activa su álbum, EL SISTEMA le pedirá un alias de 2 a 30 caracteres (por defecto «Coleccionista») y le asignará un enlace con un identificador aleatorio no adivinable.
- RF-10: CUANDO el usuario desactiva su álbum, EL SISTEMA hará que su enlace responda que no existe; al reactivarlo, el mismo enlace vuelve a funcionar.
- RF-11: CUANDO el usuario pide un enlace nuevo, EL SISTEMA generará otro identificador y el anterior dejará de funcionar.
- RF-12: EL SISTEMA permitirá elegir hasta 5 cartas destacadas entre las cartas SFW que el usuario tiene, en el orden que elija.
- RF-13: CUANDO alguien abre un álbum público activo, EL SISTEMA mostrará, sin necesidad de sesión, el alias, las destacadas y cada colección SFW del usuario con su progreso y sus cartas (las que faltan como silueta).
- RF-14: EL SISTEMA nunca mostrará en un álbum público cartas ni colecciones 18+, ni el nombre o identificador de Patreon del usuario.
- RF-15: EL SISTEMA servirá en el álbum público solo las imágenes reducidas con marca de agua, nunca las de tamaño completo.
- RF-16: CUANDO se comparte el enlace de un álbum en redes, EL SISTEMA ofrecerá una imagen de vista previa con el alias, el progreso y hasta 3 cartas destacadas.
- RF-17: EL SISTEMA pedirá a los buscadores que no indexen los álbumes públicos.

## Requisitos no funcionales
- «Mi colección» de 32 cartas carga en menos de 1 s en local; las imágenes se cargan de forma diferida.
- Funciona en escritorio y móvil; la ficha de carta usa el giroscopio en móvil como el laboratorio.
- Textos en español.

## Casos límite
- Usuario sin cartas: «Mi colección» explica cómo conseguir sobres.
- Carta destacada que deja de cumplir las condiciones (por ejemplo, su colección pasa a no visible): no se muestra y no rompe el álbum.
- Alias con espacios a los lados o solo espacios: se recorta; si queda vacío, error.
- Colección archivada: sigue apareciendo en la colección del usuario y en su álbum.
- Cuenta borrada: su álbum responde que no existe.

## Fuera de alcance
- Intercambio, regalos entre usuarios, comentarios, «me gusta» o seguir a otros coleccionistas.
- Premios, insignias o recompensas por completar una colección (solo se muestra el progreso).
- Álbum público con contenido 18+.
- Impresión física de cartas.

## Criterios de finalización
Todos los RF con test en verde; E2E: el usuario abre sobres → «Mi colección» muestra progreso y
siluetas → abre la ficha de una carta → activa el álbum con un alias y elige destacadas → un
visitante sin sesión ve el álbum y su imagen de vista previa → no aparecen cartas 18+ → al
desactivarlo, el enlace responde que no existe.

## Dudas abiertas
- Ninguna. Decisiones de la entrevista (15 oct 2026): álbum con huecos; álbum público con
  colección SFW, progreso y hasta 5 destacadas; privado hasta que el usuario lo active; alias
  elegido por el usuario. El álbum público no se indexa en buscadores. Spec aprobada el 15 oct 2026.
