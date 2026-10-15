# Spec 008 — Idiomas: inglés y español

## Contexto y objetivo
La web nació en español, pero el público de Patreon es internacional. El usuario decidió (15 oct
2026) que la web esté en inglés por defecto y que cualquier persona pueda cambiarla a español con un
selector, en todas las páginas, incluido el panel. Prioridad: que funcione; el diseño se pule después.

## Usuarios / actores
- **Visitante, coleccionista y administrador**: todos ven la web en el idioma elegido.

## Historias de usuario
- H1: Como visitante quiero ver la web en inglés sin configurar nada.
- H2: Como hispanohablante quiero cambiar a español desde cualquier página y que se recuerde.
- H3: Como administrador quiero el panel en mi idioma, también los mensajes de error.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO alguien entra sin haber elegido idioma, EL SISTEMA mostrará la web en inglés.
- RF-2: EL SISTEMA mostrará en todas las páginas (públicas, del coleccionista y del panel) un selector EN/ES.
- RF-3: CUANDO alguien elige un idioma, EL SISTEMA mostrará la misma página en ese idioma sin perder la sesión ni lo que estaba viendo.
- RF-4: EL SISTEMA recordará el idioma elegido en ese navegador durante al menos un año.
- RF-5: EL SISTEMA mostrará en el idioma elegido todos los textos de la interfaz: navegación, botones, avisos, títulos de página, mensajes de error y de validación, y la página 404.
- RF-6: EL SISTEMA formateará fechas y números según el idioma elegido.
- RF-7: EL SISTEMA declarará el idioma de la página al navegador (`<html lang>`).
- RF-8: EL SISTEMA mostrará el álbum público y su vista previa para redes en el idioma de quien lo visita (la vista previa, en inglés).
- RF-9: EL SISTEMA no traducirá el contenido creado por el administrador: nombres y textos de cartas, colecciones y personajes, ni el alias de un álbum.
- RF-10: EL SISTEMA tendrá para cada texto su versión en los dos idiomas; un test fallará si falta alguna, incluidos los mensajes de error del servidor.

## Requisitos no funcionales
- Sin dependencias nuevas: diccionarios tipados en el propio código.
- Cambiar de idioma no recarga la página entera ni cierra diálogos de forma inesperada.

## Casos límite
- Cookie con un valor desconocido: se usa inglés.
- Un mensaje de error del servidor sin traducción: se muestra el texto original (y el test de RF-10 lo detecta antes).

## Fuera de alcance
- Más idiomas, detección automática por el navegador y URLs por idioma (`/es/...`).
- Traducir documentación, specs y comentarios del código (siguen en español).
- Traducir el contenido de las cartas.

## Criterios de finalización
Todos los RF con test en verde; E2E: un visitante ve la web en inglés → cambia a español desde la
cabecera → la misma página aparece en español → el idioma se mantiene al navegar y al volver → el
panel y un error de validación aparecen en el idioma elegido.

## Dudas abiertas
- Ninguna. Decisiones del usuario (15 oct 2026): inglés por defecto, selector EN/ES en toda la web,
  panel incluido; priorizar funcionamiento sobre diseño.
