# Spec 033 — Filtros, búsqueda y orden de las cartas de una colección

Estado: **aprobada por el dueño el 9 nov 2026**, tras la entrevista del mismo día.

Decisiones del dueño en la entrevista:
1. Los filtros van en la cuadrícula de cartas dentro de una colección del panel; la lista «Sets» queda como está.
2. Filtros por personaje y rareza, filtro de pendientes de trabajo, búsqueda por nombre o número y orden de la vista.
3. Con un filtro puesto, «Seleccionar todas» selecciona solo las cartas que se ven.
4. Los filtros se guardan en la dirección de la página: se mantienen al recargar y al volver atrás, y el enlace se puede
   compartir. Al entrar desde «Sets», la cuadrícula sale sin filtros.

## Contexto y objetivo
Una colección puede tener 30 cartas o más, y para revisar las de un personaje, las de una rareza o las que faltan por
terminar hay que recorrer la cuadrícula entera. La página ya calcula qué cartas están sin armar, en proceso o pendientes
de revisión, pero solo lo dice en un aviso arriba. El objetivo es encontrar en un momento las cartas que se quieren
revisar o cambiar juntas, y poder pasarle a otro administrador el enlace con la vista ya filtrada.

## Usuarios / actores
- **Administrador** (el dueño y quien colabora en el diseño): revisa y edita las cartas de una colección.

## Historias de usuario
- H1: Como administrador quiero ver solo las cartas de un personaje o una rareza, para revisarlas o cambiarlas juntas.
- H2: Como administrador quiero ver solo las cartas a las que les falta trabajo, para terminarlas una tras otra.
- H3: Como administrador quiero buscar una carta por su nombre o número, para abrirla sin recorrer la cuadrícula.
- H4: Como administrador quiero mandar a otro administrador el enlace con la vista filtrada, para que vea lo mismo que
  yo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Filtros y búsqueda
- RF-1: EL SISTEMA mostrará sobre la cuadrícula de cartas un filtro por personaje con los personajes de la colección y
  la opción «Sin personaje».
- RF-2: EL SISTEMA mostrará sobre la cuadrícula un filtro por rareza con las cinco rarezas (Común, Rara, Épica,
  Legendaria y EX).
- RF-3: EL SISTEMA mostrará sobre la cuadrícula un filtro de pendientes con cuatro opciones: sin armar, procesando,
  cambios de capas por revisar y 18+ sin revisar (esta última solo en colecciones 18+).
- RF-4: EL SISTEMA mostrará en cada opción de filtro cuántas cartas de la colección le corresponden.
- RF-5: CUANDO el administrador elija varias opciones de un mismo filtro, EL SISTEMA mostrará las cartas que cumplan
  cualquiera de ellas.
- RF-6: CUANDO el administrador combine filtros distintos, EL SISTEMA mostrará solo las cartas que cumplan todos.
- RF-7: CUANDO el administrador escriba en la búsqueda, EL SISTEMA mostrará las cartas cuyo nombre contenga el texto o
  cuyo número coincida con él (sin distinguir mayúsculas ni acentos; «12» y «012» encuentran la carta 012).
- RF-8: MIENTRAS haya algún filtro o búsqueda puesto, EL SISTEMA mostrará cuántas cartas se ven de cuántas hay (por
  ejemplo, «8 de 32») y un botón «Quitar filtros».
- RF-9: SI ninguna carta cumple los filtros, ENTONCES EL SISTEMA dirá que no hay cartas con esos filtros y mostrará
  «Quitar filtros».

### Orden
- RF-10: EL SISTEMA permitirá ordenar la vista por número, rareza o nombre, con número como orden inicial.
- RF-11: EL SISTEMA no cambiará el número de ninguna carta al ordenar la vista.

### Selección, cambios en bloque y reordenar
- RF-12: MIENTRAS haya algún filtro o búsqueda puesto, EL SISTEMA hará que «Seleccionar todas» seleccione solo las
  cartas que se ven y dirá cuántas son.
- RF-13: CUANDO cambien los filtros, EL SISTEMA quitará de la selección las cartas que dejen de verse.
- RF-14: CUANDO el administrador pulse «Reordenar», EL SISTEMA quitará los filtros, la búsqueda y el orden de la vista,
  y mostrará todas las cartas por número.
- RF-15: CUANDO el administrador guarde una carta o aplique un cambio en bloque, EL SISTEMA mantendrá los filtros
  puestos y volverá a aplicarlos con los datos nuevos.

### Dirección de la página
- RF-16: CUANDO cambien los filtros, la búsqueda o el orden, EL SISTEMA los guardará en la dirección de la página sin
  añadir una entrada al historial por cada letra escrita.
- RF-17: CUANDO el administrador abra la dirección de una colección con filtros, EL SISTEMA mostrará la cuadrícula con
  esos filtros puestos.
- RF-18: SI la dirección trae un filtro que no existe en la colección (un personaje que ya no está o una rareza
  desconocida), ENTONCES EL SISTEMA lo ignorará sin dar error.
- RF-19: CUANDO el administrador entre a una colección desde «Sets», EL SISTEMA mostrará la cuadrícula sin filtros.

## Requisitos no funcionales
- Rendimiento: filtrar, buscar u ordenar una colección de 100 cartas actualiza la cuadrícula en menos de 100 ms, sin
  pedir nada al servidor.
- Peso: la página de una colección se mantiene dentro de su límite de 260 kB (spec 031).
- Móvil: en pantallas estrechas los filtros se pliegan en un botón «Filtros» con el número de filtros puestos.
- Accesibilidad: los filtros se manejan con teclado y el número de cartas visibles se anuncia a los lectores de
  pantalla.
- Idioma: los filtros y los textos, en inglés y español.
- Sistema de diseño: los filtros, la búsqueda y el orden usan los componentes reutilizables.

## Casos límite
- Colección sin cartas: no se muestran filtros.
- Colección con un solo personaje: el filtro de personaje se muestra igual (sirve para «Sin personaje»).
- Una carta cambia de personaje o de rareza al guardarla y deja de cumplir el filtro: desaparece de la vista y de la
  selección.
- Carta nueva que se termina de procesar mientras está puesto el filtro «Procesando»: deja de verse al actualizarse.
- Búsqueda con espacios alrededor: se ignoran.
- Ordenar por rareza: de EX a Común, y dentro de cada rareza por número.
- Ordenar por nombre: alfabético sin distinguir acentos; las cartas sin nombre van al final por número.

## Fuera de alcance
- Filtros en la lista «Sets» y en las páginas del coleccionista.
- Guardar vistas con nombre o filtros por defecto.
- Filtrar por versión, probabilidad, fecha o historial.
- Cambiar el número real de las cartas (eso sigue siendo «Reordenar»).

## Criterios de finalización
Cada RF con su test en verde: unidad para las reglas de filtrar, buscar y ordenar, y para leer y escribir la dirección,
y E2E de filtrar por personaje y rareza, buscar, ordenar, pendientes, seleccionar las visibles y cambiarlas en bloque,
recargar con filtros y reordenar. `pnpm budget` en verde. Suite completa en verde en los cuatro proyectos.

## Dudas abiertas
- Ninguna.
