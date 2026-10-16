# Spec 009 — Sobres gratis con espera y recompensa diaria

## Contexto y objetivo
Sin tiers de pago, la beta necesita que la gente tenga sobres que abrir y motivos para volver. Esta
spec añade dos bucles de retorno para todos los usuarios, sean patrons o no: un sobre gratis que se
recarga con el tiempo y una recompensa por entrar cada día con racha. La racha estrena una moneda
propia, las **galletas**, que se acumulan ahora y se podrán usar más adelante en juegos o en una
tienda (otra spec).

## Usuarios / actores
- **Coleccionista**: cualquier usuario con sesión.
- **Administrador**: consulta y corrige el estado de cada usuario.

## Historias de usuario
- H1: Como coleccionista quiero un sobre gratis cada cierto tiempo para seguir abriendo sin pagar.
- H2: Como coleccionista quiero elegir de qué colección es mi sobre gratis.
- H3: Como coleccionista quiero una recompensa por entrar cada día, y una mejor si mantengo la racha.
- H4: Como coleccionista quiero ver cuánto falta para el siguiente sobre y en qué día de la racha estoy.
- H5: Como administrador quiero ver y corregir las galletas y el estado de cada usuario.

## Requisitos funcionales (criterios de aceptación en EARS)

### Sobres gratis con espera
- RF-1: EL SISTEMA dará a cada usuario una carga de sobre gratis cada 12 horas, hasta un máximo de 2 cargas acumuladas.
- RF-2: MIENTRAS el usuario tenga 2 cargas, EL SISTEMA no empezará a cargar la siguiente hasta que gaste una.
- RF-3: CUANDO un usuario entra por primera vez, EL SISTEMA le dará 1 carga disponible.
- RF-4: CUANDO el usuario reclama un sobre gratis con una carga disponible, EL SISTEMA le pedirá elegir una colección SFW publicada y le concederá 1 sobre sellado de ella.
- RF-5: EL SISTEMA mostrará en «Mis sobres» las cargas disponibles y la cuenta atrás hasta la siguiente.
- RF-6: SI el usuario reclama sin cargas disponibles, o hace dos reclamos a la vez, ENTONCES EL SISTEMA no concederá más sobres de los que le correspondan.
- RF-7: SI no hay ninguna colección SFW publicada, ENTONCES EL SISTEMA no permitirá reclamar y conservará las cargas.
- RF-8: EL SISTEMA abrirá los sobres gratis con las mismas probabilidades publicadas y la misma protección de mala suerte que el resto de sobres de esa colección.

### Recompensa diaria y racha
- RF-9: CUANDO el usuario reclama la recompensa del día, EL SISTEMA le dará la del día de racha en que está: 10, 10, 15, 15, 20 y 20 galletas los días 1 a 6, y un sobre de la colección SFW publicada que elija el día 7.
- RF-10: EL SISTEMA permitirá reclamar una sola recompensa por día, y el día cambiará a la medianoche de la zona horaria del navegador del usuario.
- RF-11: SI el usuario cambia de zona horaria, ENTONCES EL SISTEMA no concederá dos recompensas diarias con menos de 20 horas de diferencia.
- RF-12: CUANDO el usuario reclama al día siguiente de su último reclamo, o dejando un solo día sin reclamar, EL SISTEMA avanzará su racha al día siguiente.
- RF-13: SI pasan dos o más días seguidos sin reclamar, ENTONCES EL SISTEMA reiniciará la racha al día 1 y conservará las galletas ganadas.
- RF-14: CUANDO el usuario reclama el día 7, EL SISTEMA empezará una nueva racha en el día 1 para el siguiente reclamo.
- RF-15: EL SISTEMA mostrará los 7 días de la racha con lo que da cada uno, el día en que está el usuario y si ya reclamó hoy.

### Galletas
- RF-16: EL SISTEMA mostrará el saldo de galletas del usuario y su historial de movimientos.
- RF-17: EL SISTEMA no permitirá comprar, vender, transferir ni cambiar galletas por dinero.
- RF-18: EL SISTEMA registrará cada movimiento de galletas con cantidad, motivo y fecha, sin permitir modificarlo después.
- RF-19: SI un ajuste dejaría el saldo por debajo de cero, ENTONCES EL SISTEMA lo rechazará.

### Panel
- RF-20: EL SISTEMA mostrará al administrador, en la ficha de cada usuario, sus cargas de sobre gratis, su racha y su saldo y movimientos de galletas.
- RF-21: EL SISTEMA permitirá al administrador dar o quitar galletas a un usuario con un motivo obligatorio.

## Requisitos no funcionales
- Las cargas, la racha y el saldo se calculan siempre en el servidor; el navegador solo informa de su zona horaria.
- Reclamar responde en menos de 1 s en local.
- Textos en inglés y español (spec 008).

## Casos límite
- Usuario que no entra en semanas: al volver tiene 2 cargas (no más) y la racha en el día 1.
- Reclamo justo en el cambio de día: cuenta para el día en que llega al servidor según la zona horaria enviada.
- Zona horaria inválida o ausente: se usa UTC.
- Belga: puede reclamar sobres gratis, pero no abrirlos (regla de la spec 004).
- Cuenta desactivada: no reclama; si la recupera, conserva cargas, racha y galletas. Al borrarse de forma definitiva, se borran.
- La colección elegida se archiva entre que se elige y se reclama: se rechaza el reclamo y se pide elegir otra.

## Fuera de alcance
- Gastar galletas (tienda de sobres, juegos): spec futura.
- Sobres gratis o del día 7 de colecciones 18+.
- Notificaciones o avisos fuera de la web cuando hay un sobre listo.
- Ventajas para patrons (más cargas o espera más corta).
- Cambiar desde el panel las horas de espera, el máximo de cargas o las cantidades de la racha.

## Criterios de finalización
Todos los RF con test en verde; E2E: un usuario nuevo ve 1 sobre gratis listo → lo reclama eligiendo
colección y lo abre → ve la cuenta atrás → reclama la recompensa del día y recibe 10 galletas → no
puede reclamarla otra vez ese día → con el reloj simulado avanza la racha hasta el día 7 y recibe un
sobre → un hueco de dos días reinicia la racha → el administrador ve y ajusta sus galletas.

## Dudas abiertas
- Ninguna. Decisiones de la entrevista (15 oct 2026): un sobre gratis cada 12 h, acumulables hasta 2;
  el usuario elige la colección SFW; racha de 7 días con galletas los días 1–6 y un sobre el día 7;
  un día de gracia; el día cambia a la medianoche de cada usuario; la moneda se llama «galletas».
- Decidido sin preguntar (se puede cambiar): la recompensa diaria se reclama con un botón, no
  automáticamente al entrar; un usuario nuevo empieza con 1 carga; el panel puede dar o quitar
  galletas con motivo. Spec aprobada el 15 oct 2026.
