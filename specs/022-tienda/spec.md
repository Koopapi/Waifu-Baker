# Spec 022 — Tienda y cosméticos con galletas

Estado: borrador para aprobación del dueño (25 oct 2026).

## Contexto y objetivo
Las galletas se ganan con la racha diaria y con Expediciones, pero todavía no sirven para nada («Pronto podrás
gastarlas»). Esta spec abre la **Tienda**: con galletas se compran cosméticos que cambian cómo se ven el álbum público y
las cartas del coleccionista (marcos y fondos del álbum, dorsos y fundas de carta), sobres con un tope semanal y, desde
Expediciones, «Volver ya» para que un equipo en camino regrese al momento. Sigue la economía de la spec 021: los sobres
de colecciones gratuitas son baratos; los de colecciones de Patreon, caros y uno a la semana (la probadita); y hay una
línea de cosméticos solo para patrons. Las galletas siguen sin poder comprarse, venderse ni cambiarse por dinero.

## Usuarios / actores
- **Coleccionista** con sesión.
- **Visitante** del álbum público de un coleccionista.
- **Administrador**, que carga los cosméticos, fija precios y topes.

## Historias de usuario
- H1: Como coleccionista quiero gastar mis galletas en algo que me guste ver.
- H2: Como coleccionista quiero conseguir algún sobre extra jugando, sin pagar dinero.
- H3: Como coleccionista quiero que mi álbum público se vea distinto al de los demás.
- H4: Como coleccionista con prisa quiero que mi equipo vuelva ya, a cambio de galletas.
- H5: Como administrador quiero agregar cosméticos y ajustar precios sin publicar una versión nueva.

## Vocabulario
- **Cosmético**: artículo que solo cambia el aspecto. Cuatro tipos: **marco del álbum** y **fondo del álbum** (se ven
  en el álbum público), **dorso de carta** (las cartas boca abajo en la apertura) y **funda** (el borde de las cartas
  en la colección).
- **Equipar**: elegir qué cosmético de cada tipo se usa; como mucho uno por tipo.
- **Destacados**: unos pocos cosméticos que la tienda pone arriba cada día.
- **Volver ya**: hacer que un equipo de Expediciones en camino vuelva al momento.
- **Cosmético de patron**: el que solo puede equipar quien es patron (spec 021); no se compra con galletas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Tienda
- RF-1: EL SISTEMA ofrecerá al coleccionista un apartado «Tienda» en la navegación.
- RF-2: EL SISTEMA mostrará en la tienda el saldo de galletas del coleccionista.
- RF-3: EL SISTEMA mostrará en la tienda los cosméticos activos agrupados por tipo, cada uno con su imagen, nombre y
  precio.
- RF-4: EL SISTEMA marcará en la tienda los cosméticos que el coleccionista ya tiene.
- RF-5: EL SISTEMA destacará arriba de la tienda, cada día, 3 cosméticos activos elegidos de forma que todos los
  coleccionistas vean los mismos ese día.
- RF-6: CUANDO cambie el día (medianoche UTC), EL SISTEMA cambiará los destacados.

### Comprar cosméticos
- RF-7: CUANDO el coleccionista compre un cosmético y confirme, EL SISTEMA descontará su precio en galletas y se lo
  dará en una sola operación.
- RF-8: SI el coleccionista no tiene galletas suficientes, ENTONCES EL SISTEMA no hará la compra e informará de cuántas
  le faltan.
- RF-9: SI el coleccionista ya tiene ese cosmético, ENTONCES EL SISTEMA no lo cobrará otra vez.
- RF-10: SI dos compras llegan a la vez (doble toque, dos pestañas), ENTONCES EL SISTEMA cobrará una sola vez y el
  saldo nunca quedará por debajo de cero.

### Equipar
- RF-11: EL SISTEMA dejará al coleccionista equipar uno de sus cosméticos de cada tipo o volver al aspecto por defecto.
- RF-12: MIENTRAS el coleccionista tenga equipados un marco o un fondo del álbum, EL SISTEMA los mostrará en su álbum
  público a cualquier visitante.
- RF-13: MIENTRAS el coleccionista tenga equipado un dorso, EL SISTEMA lo mostrará en las cartas boca abajo de sus
  aperturas de sobres.
- RF-14: MIENTRAS el coleccionista tenga equipada una funda, EL SISTEMA la mostrará en las cartas de su colección.
- RF-15: SI el administrador retira un cosmético, ENTONCES EL SISTEMA dejará de venderlo pero quien ya lo tiene lo
  conservará y podrá seguir equipándolo.

### Cosméticos de patron
- RF-16: EL SISTEMA mostrará los cosméticos de patron en la tienda, sin precio, indicando que llegan con la suscripción.
- RF-17: MIENTRAS el coleccionista sea patron, EL SISTEMA le dejará equipar cualquier cosmético de patron activo.
- RF-18: CUANDO el coleccionista deje de ser patron, EL SISTEMA desequipará sus cosméticos de patron y volverá al
  aspecto por defecto en esos tipos.

### Sobres con galletas
- RF-19: CUANDO el coleccionista compre un sobre eligiendo una colección publicada y confirme, EL SISTEMA descontará
  su precio y le dará un sobre sellado de esa colección en una sola operación.
- RF-20: MIENTRAS el coleccionista no tenga desbloqueado el contenido 18+, EL SISTEMA solo le ofrecerá colecciones SFW.
- RF-21: EL SISTEMA cobrará y limitará por separado los sobres de colecciones gratuitas (precio y tope semanal propios;
  de arranque 300 galletas y 3 en 7 días) y los de colecciones de Patreon (de arranque 500 galletas y 1 en 7 días).
- RF-22: SI el coleccionista ya compró el tope de sobres de ese tipo en los últimos 7 días, ENTONCES EL SISTEMA no le
  venderá otro e informará de cuándo podrá comprar el siguiente.
- RF-23: EL SISTEMA mostrará junto a cada sobre su precio y cuántos de ese tipo le quedan esta semana al coleccionista.
- RF-24: CUANDO se compre un sobre, EL SISTEMA lo hará volar hasta «Mis sobres».

### Volver ya (Expediciones)
- RF-25: MIENTRAS un equipo esté en camino, EL SISTEMA ofrecerá «Volver ya» con su precio, que crece con los minutos
  que le faltan.
- RF-26: CUANDO el coleccionista pague «Volver ya» y confirme, EL SISTEMA descontará el precio y dejará la expedición
  lista para reclamar con el mismo botín y calificación que tenía.
- RF-27: SI el precio cambió porque pasó el tiempo, ENTONCES EL SISTEMA cobrará el precio calculado en el servidor en ese
  momento, nunca uno mayor que el que vio el coleccionista.

### Historial y cumplimiento
- RF-28: EL SISTEMA anotará cada compra en el historial de galletas del coleccionista con lo que compró.
- RF-29: EL SISTEMA no ofrecerá ninguna forma de conseguir galletas con dinero.

### Panel de administración
- RF-30: EL SISTEMA permitirá al administrador crear y editar cosméticos con tipo, nombre, imagen, precio (o «solo
  patrons») y si está activo.
- RF-31: EL SISTEMA permitirá al administrador fijar el precio y el tope semanal de los sobres con galletas, por separado
  para colecciones gratuitas y de Patreon.
- RF-32: EL SISTEMA permitirá al administrador fijar el precio de «Volver ya» por minuto que falta.

## Requisitos no funcionales
- El servidor decide: precios, saldo, topes y destacados salen del servidor; el saldo nunca baja de cero (ya lo
  garantiza la base de datos).
- Concurrencia: la compra doble del mismo cosmético, dos sobres a la vez con el tope casi lleno y dos «Volver ya» a la
  vez tienen test de concurrencia.
- Rendimiento: animaciones solo con `transform` y `opacity`; movimiento reducido respetado. La tienda no pasa de 250 kB
  de JavaScript en la primera carga.
- Textos nuevos en inglés y español.
- Sistema de diseño: pantallas con componentes de `ui/` y su maqueta en Pencil aprobada antes del plan.
- Cumplimiento: los sobres comprados con galletas usan las mismas probabilidades publicadas, rara garantizada y
  bloqueo de apertura en Bélgica que cualquier sobre (spec 004).

## Casos límite
- Tienda sin cosméticos activos: se ve la sección de sobres y un aviso de que pronto habrá cosméticos.
- Sin colecciones publicadas que pueda elegir: el sobre aparece sin poder comprarse y lo explica.
- Saldo exacto al precio: la compra entra y el saldo queda en 0.
- Un cosmético retirado que el coleccionista tenía equipado: sigue equipado (RF-15).
- Un equipo que vuelve justo mientras se paga «Volver ya»: no se cobra nada si ya había vuelto.
- Cambio de precio en el panel mientras el coleccionista mira la tienda: se cobra el precio del servidor y se avisa si
  cambió (no se cobra más sin que lo vea).
- Cuenta borrada y recuperada: conserva cosméticos y equipamiento.
- Álbum público oculto por moderación (spec 012): no se ve, con o sin cosméticos.

## Fuera de alcance
- Vender galletas, sobres o cosméticos por dinero, regalarlos o intercambiarlos.
- Descuentos, ofertas, cosméticos por tiempo limitado o paquetes.
- Comprar fragmentos de mapa (el tercer espacio es beneficio de patron, spec 021).
- Devolver una compra.
- Cosméticos que cambien las cartas para otros coleccionistas (la funda y el dorso solo los ve su dueño).
- Temas completos de la web (spec 022, Street pop).

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde (E2E en 4 proyectos): comprar y equipar cada tipo de
cosmético, verlo en el álbum público, en la apertura y en la colección, sin saldo, ya comprado, sobre SFW y 18+ con el
tope, «Volver ya» y panel; tests de concurrencia; checklist en teléfono; `pnpm budget` dentro del límite; demo manual
del dueño.

## Decisiones (25 oct 2026)
- Se compran cosméticos (marcos y fondos del álbum, dorsos, fundas), sobres y «Volver ya» de Expediciones.
- Sobres SFW y 18+ (con el doble filtro), con tope semanal: colecciones gratuitas a 300 y 3 por semana; colecciones de
  Patreon a 500 y 1 por semana (la probadita de la spec 021).
- Cosméticos exclusivos de patron: se equipan mientras haya tier activo; al dejarlo, se desequipan (derivada, para que
  el dueño la confirme).
- Los cosméticos los carga el administrador en el panel; el equipo deja un lote inicial en la demo.
- Todo lo activo siempre a la vista, con destacados que rotan cada día y sin descuentos.
- Derivadas, para que el dueño las confirme al aprobar: los destacados son 3 y cambian a medianoche UTC (iguales para
  todos); el tope de sobres cuenta los últimos 7 días; «Volver ya» arranca en 1 galleta por minuto que falta (mínimo 5);
  la funda y el dorso solo los ve su dueño; no hay devoluciones.

## Dudas abiertas
- Ninguna.
