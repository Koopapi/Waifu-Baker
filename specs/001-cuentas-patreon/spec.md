# Spec 001 — Cuentas y vínculo con Patreon

## Contexto y objetivo
El login con Patreon ya funciona (15 oct 2026), pero la web aún no sabe nada de la suscripción de
cada persona: los sobres solo llegan como regalos del panel. Esta spec convierte la cuenta de
Patreon en el motor de la web: quien entra recibe un sobre de bienvenida, cada cobro pagado concede
los sobres de su tier, la colección 18+ se abre solo a adultos verificados con el tier adulto, y
cada persona puede ver su suscripción y borrar su cuenta. Los tiers de pago todavía no existen en
Patreon: todo se construye y se prueba con tiers simulados y queda listo para cuando se creen.

## Usuarios / actores
- **Visitante con Patreon**: cualquier persona con cuenta de Patreon, sea patron o no.
- **Patron**: miembro con un tier de pago de la campaña.
- **Administrador**: elige la colección de bienvenida y revisa el estado de cada usuario.
- **Patreon**: envía avisos de cambios en los miembros y responde consultas.

## Historias de usuario
- H1: Como recién llegado quiero un sobre gratis al entrar por primera vez, para probar la experiencia.
- H2: Como patron quiero recibir mis sobres en cuanto Patreon me cobra, sin hacer nada.
- H3: Como patron del tier 18+ quiero acceder a la colección adulta tras declarar mi edad.
- H4: Como usuario quiero ver mi suscripción y cuántos sobres recibo, y poder borrar mi cuenta.
- H5: Como administrador quiero elegir la colección de bienvenida y ver el estado de Patreon de cada usuario.

## Requisitos funcionales (criterios de aceptación en EARS)

### Vínculo con Patreon
- RF-1: CUANDO alguien entra con Patreon, EL SISTEMA leerá y guardará su estado de membresía: tiers con derecho, estado de patron, y fecha y estado de su último cobro.
- RF-2: EL SISTEMA solo guardará de Patreon el identificador, el nombre, el avatar y el estado de membresía.
- RF-3: MIENTRAS un usuario tenga sesión, EL SISTEMA volverá a leer su estado de membresía cuando la última lectura tenga más de 15 minutos.
- RF-4: SI Patreon no responde al entrar, ENTONCES EL SISTEMA permitirá la entrada con el último estado guardado y lo actualizará en la siguiente lectura.

### Sobre de bienvenida
- RF-5: EL SISTEMA permitirá al administrador marcar una única colección SFW publicada como colección de bienvenida.
- RF-6: CUANDO un usuario entra por primera vez, EL SISTEMA le concederá 1 sobre de la colección de bienvenida, sea patron o no.
- RF-7: SI no hay colección de bienvenida cuando el usuario entra por primera vez, ENTONCES EL SISTEMA le concederá el sobre en su primer inicio de sesión posterior en que exista una.
- RF-8: EL SISTEMA concederá un único sobre de bienvenida por cuenta de Patreon en toda su historia, aunque la cuenta se borre y se vuelva a crear.

### Sobres por suscripción
- RF-9: CUANDO Patreon confirma un cobro pagado de un patron activo, EL SISTEMA le concederá los sobres que indiquen las reglas de sus tiers, una sola vez por cobro.
- RF-10: CUANDO un patron sube a un tier que da más sobres y Patreon confirma el pago, EL SISTEMA le concederá en ese momento la diferencia de sobres de ese ciclo.
- RF-11: EL SISTEMA no concederá más de una vez por ciclo de cobro los sobres de un mismo tier, aunque el patron baje y vuelva a subir.
- RF-12: CUANDO un patron vincula su cuenta por primera vez, EL SISTEMA solo le concederá los sobres de su último cobro pagado, no los de meses anteriores.
- RF-13: CUANDO un patron cancela o deja de pagar, EL SISTEMA conservará sus sobres sin abrir y dejará de concederle sobres nuevos.
- RF-14: SI un cobro pasa a reembolsado o a fraude, ENTONCES EL SISTEMA anulará los sobres sin abrir que concedió ese cobro, conservará lo ya abierto y lo anotará en el historial.

### Avisos de Patreon
- RF-15: CUANDO Patreon avisa de un cambio en un miembro, EL SISTEMA aplicará el estado actual que devuelva la consulta a Patreon, aunque los avisos lleguen repetidos o desordenados.
- RF-16: SI un aviso no lleva una firma válida de Patreon, ENTONCES EL SISTEMA lo rechazará sin cambiar nada.
- RF-17: EL SISTEMA revisará cada 6 horas a todos los miembros de la campaña para recuperar avisos perdidos.

### Edad y contenido 18+
- RF-18: CUANDO un usuario con un tier adulto activo declara ser mayor de edad, EL SISTEMA marcará su cuenta como verificada para contenido 18+.
- RF-19: MIENTRAS un usuario no tenga declaración y verificación, EL SISTEMA no le mostrará ni le dejará abrir contenido 18+ y le indicará cómo verificarse.
- RF-20: EL SISTEMA mantendrá la verificación de edad aunque el usuario cancele o baje de tier, de modo que conserva y ve sus cartas 18+ y puede abrir sus sobres 18+ restantes.

### Mi cuenta y borrado
- RF-21: EL SISTEMA mostrará a cada usuario su tier, el estado de su suscripción, los sobres que recibe al mes y la fecha de su último cobro.
- RF-22: CUANDO el usuario pide borrar su cuenta y lo confirma, EL SISTEMA la desactivará, cerrará su sesión y ocultará su álbum público.
- RF-23: CUANDO un usuario con la cuenta desactivada vuelve a entrar con el mismo Patreon antes de 30 días, EL SISTEMA reactivará su cuenta con todo lo que tenía.
- RF-24: CUANDO pasan 30 días desde la desactivación, EL SISTEMA borrará de forma definitiva el perfil, las cartas, los sobres y el álbum, y conservará sin datos personales el registro de aperturas.
- RF-25: CUANDO alguien con la cuenta borrada de forma definitiva vuelve con el mismo Patreon, EL SISTEMA le creará una cuenta nueva y vacía.

### Panel
- RF-26: EL SISTEMA mostrará al administrador, en la ficha de cada usuario, su estado de Patreon y el historial de concesiones y anulaciones de sobres.

## Requisitos no funcionales
- Un aviso de Patreon válido se refleja en los sobres del usuario en menos de 1 minuto.
- Ningún aviso repetido, desordenado o reenviado concede sobres de más (idempotencia comprobada con tests).
- Los tokens de Patreon que se guarden van cifrados (constitución, principio 6).
- Textos en inglés y español (spec 008).

## Casos límite
- Un usuario con varios tiers a la vez: suma los sobres de las reglas de todos sus tiers con derecho.
- Un tier sin reglas en el panel (por ejemplo «Free»): no concede sobres de suscripción; el sobre de bienvenida sí.
- Cobro pendiente o rechazado: no concede nada hasta que pase a pagado.
- Colección de bienvenida archivada o 18+: deja de poder ser de bienvenida.
- El administrador borra su propia cuenta: se permite; deja de tener acceso al panel al desactivarse.
- Un aviso de un miembro que nunca entró a la web: se guarda su estado y los sobres de ese cobro se conceden cuando entre (respetando RF-12).

## Fuera de alcance
- Crear o tarifar los tiers en Patreon (lo hace el usuario cuando decida lanzar).
- Recibir avisos reales de Patreon en local: se prueban con avisos firmados simulados; los reales llegan con una dirección pública.
- Sobres gratis con espera y recompensas diarias (spec 009).
- Verificación de edad por documento o terceros.
- Correo electrónico al usuario y notificaciones.
- Cobro directo fuera de Patreon.

## Criterios de finalización
Todos los RF con test en verde; E2E: un usuario nuevo entra → recibe el sobre de bienvenida de la
colección elegida en el panel → un aviso firmado simulado de un cobro pagado le concede los sobres de
su tier → el aviso repetido no concede más → un reembolso anula los sellados → declara su edad con el
tier adulto y ve la colección 18+ → borra su cuenta y la recupera al volver antes de 30 días.

## Dudas abiertas
- Ninguna. Decisiones de la entrevista (15 oct 2026): colección de bienvenida elegida en el panel;
  la verificación 18+ es permanente; borrado con 30 días para arrepentirse; subida de tier concede la
  diferencia al momento, una vez por ciclo; al vincular tarde solo cuenta el último cobro; reembolso
  o fraude anula los sobres sin abrir de ese cobro. Spec aprobada el 15 oct 2026.
