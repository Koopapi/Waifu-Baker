# Spec 037 — El sobre y la carta del armador en todas las vistas

Estado: **aprobada por el dueño el 11 nov 2026**, tras la entrevista del mismo día.

Decisiones del dueño en la entrevista:
1. Los sobres todavía no se ven como el armador en todas las vistas. Hoy el sobre diseñado (spec 030) sale en «Mis
   sobres», la apertura, «Abrir todos» y el simulador, pero el sobre plano anterior sigue en otras vistas:
   - las celebraciones de recompensas;
   - la llegada de sobres regalados;
   - el premio de Expediciones;
   - los ajustes del sobre en el panel.
2. En todas las vistas donde se ve una carta obtenida, la carta tiene que verse como la vista final del armador.
3. En las cuadrículas y miniaturas, la carta es una imagen fija igual al armador en reposo: con marco, sello, holo y
   capas. Al abrirla se ve viva (spec 034).
4. Si el coleccionista tiene la copia holo, la miniatura muestra la foto con holo: una segunda imagen fija sacada del
   armador con la vista previa holo activada.
5. La carta ya trae su sello de rareza del armador, así que se quitan dos letreros de rareza:
   - al revelar cada carta en la apertura, la insignia con la letra de la rareza y la letra pequeña antes del código de
     la colección;
   - en el resumen final del sobre, la insignia de rareza de cada carta.

   Se quedan la estrella del efecto especial de la SSR y la EX, y la cinta de celebración.

## Contexto y objetivo
El dueño y quien colabora en el diseño arman cada sobre y cada carta hasta que se ven como quieren. Las specs 030 y 034
llevaron esa vista a la apertura, a «Abrir todos» y a la ficha de la carta. Pero en el resto de la web el coleccionista
todavía ve otras versiones:
- el sobre plano anterior en las celebraciones, en los regalos y en Expediciones;
- en las cuadrículas, la imagen fija de cartas armadas antes de la spec 034;
- las copias holo sin su holo.

El objetivo es que todo sobre y toda carta obtenida se vean como en el armador, en cualquier pantalla.

## Usuarios / actores
- **Coleccionista**: recibe sobres, los abre y mira sus cartas.
- **Administrador** (el dueño y quien colabora en el diseño): diseña sobres y cartas, y regala sobres.
- **Visitante**: mira un álbum público.

## Historias de usuario
- H1: Como coleccionista quiero ver el mismo sobre en todas partes, para reconocer qué sobre recibí.
- H2: Como coleccionista quiero ver mis cartas como se diseñaron, también en mi colección y en mi álbum.
- H3: Como coleccionista quiero que mis copias holo se vean holo en la cuadrícula, para distinguirlas de un vistazo.
- H4: Como administrador quiero que lo que armo sea lo único que se ve, para no revisar cada pantalla por separado.

## Vocabulario
- **Vista del armador**: la de la spec 034. Para un sobre, el diseño de la spec 030 o, si la colección no tiene uno, el
  sobre básico.
- **Miniatura del sobre**: la imagen fija del sobre diseñado o del sobre básico (spec 030, RF-16).
- **Imagen fija de la carta**: la foto de la carta en reposo, con el mismo encuadre, marco, sello y capas que la vista
  del armador (spec 034, RF-10).
- **Imagen fija holo**: la misma foto sacada con la vista previa holo activada.
- **Carta obtenida**: una carta que el coleccionista tiene, o que acaba de salir en un sobre.

## Requisitos funcionales (criterios de aceptación en EARS)

### El sobre
- RF-1: CUANDO el coleccionista reclame un sobre de recompensa (gratis, racha o diario), EL SISTEMA mostrará en la
  celebración la miniatura del sobre que recibe.
- RF-2: CUANDO al coleccionista le lleguen sobres regalados, EL SISTEMA mostrará en el aviso de llegada la miniatura del
  sobre que recibe.
- RF-3: CUANDO Expediciones dé un sobre de premio, EL SISTEMA mostrará la miniatura de ese sobre.
- RF-4: EL SISTEMA mostrará en los ajustes del sobre de una colección, en el panel, la miniatura del sobre plata y la del
  gold.
- RF-5: EL SISTEMA mostrará en cada vista la miniatura del tipo de sobre que corresponde: plata o gold.
- RF-6: EL SISTEMA no mostrará el sobre plano anterior en ninguna pantalla del coleccionista ni del panel.

### La carta en las cuadrículas
- RF-7: EL SISTEMA mostrará cada carta obtenida con su imagen fija en «Mi colección», en la colección de un set y en la
  de un personaje.
- RF-8: EL SISTEMA mostrará cada carta con su imagen fija en el álbum propio, en el álbum público y en su imagen para
  compartir.
- RF-9: EL SISTEMA mostrará cada carta obtenida con su imagen fija en Expediciones, en el resumen de un sobre y en la
  portada de una colección en la barra.
- RF-10: CUANDO el coleccionista toque o seleccione una carta de una cuadrícula, EL SISTEMA abrirá su ficha con la vista
  del armador (spec 034, RF-3).

### Holo
- RF-11: CUANDO el administrador guarde una carta, EL SISTEMA generará también su imagen fija holo.
- RF-12: MIENTRAS el coleccionista tenga la copia holo de una carta, EL SISTEMA mostrará la imagen fija holo en sus
  cuadrículas.
- RF-13: MIENTRAS el coleccionista tenga solo la copia normal, EL SISTEMA mostrará la imagen fija normal.
- RF-14: CUANDO una copia holo salga en un sobre, EL SISTEMA mostrará la imagen fija holo en el resumen del sobre.
- RF-15: MIENTRAS una carta esté guardada con el holo activado (spec 034, RF-15), EL SISTEMA mostrará la imagen fija holo
  en todas sus copias.
- RF-16: EL SISTEMA mostrará en el álbum público la imagen fija holo de las cartas que el dueño del álbum tenga en holo,
  con la marca de agua del álbum (spec 006).

### Cartas ya armadas
- RF-17: CUANDO se despliegue esta spec, EL SISTEMA regenerará la imagen fija y la imagen fija holo de todas las cartas
  armadas, a partir de su configuración guardada.
- RF-18: SI la regeneración de una carta falla, ENTONCES EL SISTEMA conservará su imagen anterior y la listará en el
  panel con el motivo y una acción para reintentar.
- RF-19: MIENTRAS una carta no tenga imagen fija holo, EL SISTEMA mostrará su imagen fija normal con la insignia
  «Holo».
- RF-20: SI una carta no tiene configuración de capas, ENTONCES EL SISTEMA mostrará su imagen fija con la proporción del
  armador y la insignia «Holo» en las copias holo.

### Letreros de rareza en la apertura
- RF-21: CUANDO se revele una carta en la apertura de un sobre, EL SISTEMA no mostrará la insignia con la letra de su
  rareza ni la letra pequeña antes del código de la colección.
- RF-22: CUANDO se revele una carta en la apertura de un sobre, EL SISTEMA seguirá mostrando su nombre, su colección,
  «¡Nueva!» si es nueva y «Holo» si es holo.
- RF-23: EL SISTEMA no mostrará la insignia de rareza de cada carta en el resumen final del sobre.
- RF-24: EL SISTEMA conservará el nombre de la rareza en el texto accesible de la carta revelada y de cada carta del
  resumen, para los lectores de pantalla.
- RF-25: SI la carta no tiene configuración de capas (y por tanto no tiene sello), ENTONCES EL SISTEMA mantendrá su
  insignia de rareza en la apertura y en el resumen.

## Requisitos no funcionales
- Sistema de diseño: el sobre en todas las vistas sale del mismo componente de miniatura (spec 030), y la carta en las
  cuadrículas del mismo componente de miniatura de carta. Sin copias por pantalla.
- Rendimiento: las cuadrículas solo cargan imágenes fijas, nunca cartas vivas. La página de apertura no sube de 250 kB.
- Seguridad: la imagen fija holo sigue las mismas reglas que la normal: enlaces firmados solo para quien tiene la carta,
  doble filtro 18+ y nunca en el álbum público si es 18+ (spec 018).
- Revisión 18+: una carta 18+ con cambios pendientes muestra las imágenes de lo último aprobado.

## Casos límite
- Colección sin diseño de sobre gold: el sobre gold se ve como el sobre básico gold (spec 030, RF-15).
- Celebración con sobres de varias colecciones: cada uno con su miniatura.
- Coleccionista con la copia normal y la holo de la misma carta: la miniatura holo.
- Carta que se vuelve a guardar en el armador: las dos imágenes fijas se regeneran juntas.
- Muchas cartas que regenerar al desplegar: la web sigue respondiendo y las cartas pendientes muestran su imagen
  anterior.
- Sin conexión durante una celebración: el sobre básico se dibuja en el navegador, como en «Mis sobres».

## Fuera de alcance
- Cartas vivas en las cuadrículas.
- Cambiar el diseño del sobre, del armador o de los efectos del vínculo.
- La estrella del efecto especial y la cinta de celebración, en la apertura y en «Abrir todos» (se quedan).
- Los nombres de las rarezas y los sellos (spec 038).
- La demo (sigue con sus imágenes).

## Criterios de finalización
Cada RF con su test en verde:
- **Unidad**: qué miniatura de sobre recibe cada vista; qué imagen fija (normal u holo) le toca a cada copia.
- **Integración**: guardar una carta genera las dos imágenes fijas; la regeneración al desplegar, también con una carta
  que falla.
- **E2E**:
  - una recompensa, un regalo y un premio de Expediciones muestran la miniatura del sobre diseñado;
  - una copia holo muestra la imagen holo en «Mi colección», en el álbum y en el resumen del sobre;
  - ningún sobre plano anterior en el barrido de pantallas;
  - la carta revelada y el resumen del sobre sin insignia de rareza, con la rareza en su nombre accesible.

Además: capturas lado a lado del armador y de cada cuadrícula, revisadas por el dueño, y suite completa en verde en los
cuatro proyectos.

## Dudas abiertas
- Ninguna.
