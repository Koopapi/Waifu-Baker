# Entrevista — Spec 011, sistema de diseño

Borrador de la entrevista (una pregunta a la vez, máximo 6). Se convierte en `spec.md` al terminar.

1. **Alcance de la primera versión** (16 oct 2026): A — todos los componentes que usan hoy el coleccionista y el
   panel, más los ya previstos (modal, temporizador, contador, pantalla completa). Sin piezas propias de juegos.
2. **Dónde se consulta** (16 oct 2026): A — diseño en Pencil y catálogo vivo en la web solo en desarrollo
   (`/sistema`), sin dependencias nuevas. Más adelante se pasará a Storybook (B): los componentes no deben depender
   de la página del catálogo, para poder llevarlos a Storybook sin cambios.
3. **Temas visuales** (16 oct 2026): A — una sola paleta, «Cereza», con todos los colores en tokens para poder
   añadir más adelante un tema por colección o por juego sin tocar los componentes.
4. **Respuesta y movimiento** (16 oct 2026): A — rápido y sutil, como Discord: transiciones de 150 a 250 ms solo con
   transform y opacidad; respuesta optimista en los botones (la acción se ve hecha al instante y se deshace con un
   aviso si el servidor falla); las animaciones vistosas, solo en la apertura de sobres.
5. **Desplegables y menús** (16 oct 2026): B — totalmente personalizados, iguales en todas partes (con buscador o
   iconos dentro cuando haga falta). Implica una librería de primitivas accesibles (p. ej. Radix), que se
   justificará en el plan (principio 1 de la constitución).
6. **Confirmaciones** (16 oct 2026): A — dos niveles. Acciones reversibles al instante con «Deshacer» en el aviso;
   acciones irreversibles o importantes con un modal propio que explica qué pasará y con el botón de peligro en rojo
   (borrar cuenta, publicar colección, subir la edad mínima). Desaparece `window.confirm`.

Entrevista terminada (6 de 6).
