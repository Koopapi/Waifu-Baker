# Validación — Spec 030

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-06. Vitest: 905 de 905 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida en unidad, integración y E2E en los cuatro proyectos** (25 de 25 RF con al menos un test en
verde; el paso E2E del RF-20 se renombró después de generar la tabla para que lo cuente el script).

**E2E completa (6–7 nov 2026):** `pnpm build` y `pnpm budget` en verde (la página más pesada, expediciones, 225,2 kB de
250). `pnpm e2e` en `chromium-desktop`, `pixel-7`, `iphone-14` y `reduced-motion`: 99 en verde, 10 fallos y 44 omitidas
(2,9 h). La E2E de esta spec y las adaptadas al sobre nuevo (`apertura-nueva`, `collector`, `admin-panel`,
`rarezas-sobres`, `sound`, `live-cards`) pasaron en los cuatro proyectos a la primera. Los 10 fallos eran de las pruebas,
no del juego, y se arreglaron:
- `demo` (los cuatro): esperaba 3 sobres de regalo y la demo de la 030 regala 4 (3 plata y 1 gold).
- `kawaii` (escritorio, Pixel e iPhone): el sobre de Bruno flota y se balancea siempre, y Playwright esperaba a que
  estuviera quieto para tocarlo; ahora se toca sin esperar.
- `defaults` y `vinculo` (iPhone): la página se refresca sola tras guardar o al entrar en «Mis sobres» y WebKit corta
  el `goto` siguiente; el ayudante `go` de `e2e/helpers.ts` lo reintenta. La subida espera a que la página cargue.
- `theme` (iPhone): leía la inclinación del botón a mitad de su transición; ahora espera a que acabe.

Repetidas tras los arreglos: `kawaii`, `demo`, `defaults`, `vinculo` y `theme` en los cuatro proyectos (22 en verde y 2
fallos en iPhone, `defaults` y `theme`), y después esas dos en `iphone-14` (en verde).

**Pendiente:** la comparación lado a lado con `creador-sobres.html` y `apertura-sobre.html` y la prueba en un teléfono
real (60 fps y el lag de la Legendaria y la EX).

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | EL SISTEMA ofrecerá en cada colección un editor de sobres con un diseño para el sobre plata y otro para el gold. | ✓ cada_coleccion_tiene_un_diseno_plata_y_otro_gold | RF-1, RF-2, RF-3 y RF-8: el editor del sobre gold con la vista previa y los datos de la colección | Cumplido |
| RF-2 | EL SISTEMA mostrará el editor con la misma distribución, controles y textos que el creador de Bruno, con el | — | RF-1, RF-2, RF-3 y RF-8: el editor del sobre gold con la vista previa y los datos de la colección | Cumplido |
| RF-3 | EL SISTEMA mostrará en el editor una vista previa en vivo del sobre que se inclina con el puntero y permite | ✓ el_registro_que_se_ensena_omite_lo_que_vale_por_defecto | RF-1, RF-2, RF-3 y RF-8: el editor del sobre gold con la vista previa y los datos de la colección<br>RF-3: probar la apertura con cartas de muestra, pasar a la siguiente y volver a cerrar | Cumplido |
| RF-4 | EL SISTEMA permitirá subir capas de 1000 × 1750 px en PNG, WebP o JPG, y les dará valores iniciales según el | ✓ cada_archivo_toma_sus_valores_iniciales_por_el_nombre | RF-4 a RF-7: cargar el ejemplo FA01, ajustar una capa, la insignia y el patrón de los sellos | Cumplido |
| RF-5 | EL SISTEMA permitirá en cada capa elegir modo de mezcla, opacidad, profundidad, margen extra y brillo solo en el | ✓ el_brillo_ondas_usa_el_patron_o_arcos_css | — | Cumplido |
| RF-6 | EL SISTEMA permitirá agregar capas de partículas con tipo, cantidad, tamaño, velocidad, color y variación. | ✓ mas_particulas_va_detras_del_personaje | — | Cumplido |
| RF-7 | EL SISTEMA permitirá elegir la versión del sobre, la forma de abrir, el logo (Waifu Baker, imagen propia o | — | RF-4 a RF-7: cargar el ejemplo FA01, ajustar una capa, la insignia y el patrón de los sellos | Cumplido |
| RF-8 | EL SISTEMA tomará el nombre, el código y el número de cartas del sobre de la colección, sin poder cambiarlos en | ✓ el_diseno_no_guarda_nombre_codigo_ni_cartas | RF-1, RF-2, RF-3 y RF-8: el editor del sobre gold con la vista previa y los datos de la colección | Cumplido |
| RF-9 | EL SISTEMA avisará, sin impedir guardar, si una imagen no mide 1000 × 1750, si el fondo tiene transparencia, si | ✓ una_imagen_que_no_mide_1000_x_1750_se_guarda_igual<br>✓ todo_en_orden_no_da_avisos<br>✓ avisa_de_medidas_transparencia_linea_nombre_largo_y_archivos_que_faltan<br>✓ la_lectura_de_pixeles_ve_transparencia_y_arte_en_la_linea | RF-9: la revisión avisa de una capa de 800 × 1200 y no impide guardar | Cumplido |
| RF-10 | CUANDO el administrador guarde, EL SISTEMA guardará el diseño y sus imágenes en el almacenamiento del proyecto, | ✓ rf11_se_guarda_con_sus_imagenes_y_miniatura_y_se_vuelve_a_cargar<br>✓ las_imagenes_que_ya_no_usa_ningun_diseno_se_borran<br>✓ las_imagenes_del_diseno_se_cuentan_y_se_cambian_juntas | RF-10 y RF-11: guardar, recargar y el diseño vuelve con sus imágenes | Cumplido |
| RF-11 | CUANDO el administrador vuelva al editor, EL SISTEMA cargará el diseño guardado con sus imágenes, sin pedir | ✓ rf11_se_guarda_con_sus_imagenes_y_miniatura_y_se_vuelve_a_cargar | RF-10 y RF-11: guardar, recargar y el diseño vuelve con sus imágenes | Cumplido |
| RF-12 | SI el diseño guardado no es válido, ENTONCES EL SISTEMA no lo guardará e indicará qué campo falla. | ✓ un_diseno_invalido_no_se_guarda_y_dice_que_campo_falla<br>✓ un_diseno_valido_pasa_y_uno_invalido_dice_que_campo_falla | — | Cumplido |
| RF-13 | EL SISTEMA permitirá editar sobres solo a los administradores. | ✓ solo_los_administradores_pueden_editar_sobres | RF-13: un coleccionista no puede abrir el editor | Cumplido |
| RF-14 | MIENTRAS una colección tenga diseño para un tipo de sobre, EL SISTEMA mostrará ese diseño en sus sobres de ese | ✓ rf15_con_diseno_se_ve_el_diseno_y_sin_diseno_el_basico<br>✓ el_registro_lleva_enlaces_y_los_patrones_incluidos | RF-14 a RF-16: «Mis sobres» muestra el gold con su diseño y el plata con el sobre básico | Cumplido |
| RF-15 | MIENTRAS una colección no tenga diseño para un tipo de sobre, EL SISTEMA mostrará el sobre básico, con la carta | ✓ rf15_con_diseno_se_ve_el_diseno_y_sin_diseno_el_basico<br>✓ el_sobre_basico_lleva_la_portada_y_sellos_plata_o_dorados | RF-15 y RF-24: el plata se abre con el sobre básico y el flujo de siempre | Cumplido |
| RF-16 | EL SISTEMA mostrará el mismo sobre en «Mis sobres», en la apertura, en «Abrir todos» y en el simulador del | ✓ la_vista_fija_no_anima_ni_escucha_y_sin_gestos_solo_abre_con_teclado_o_boton | RF-14 a RF-16: «Mis sobres» muestra el gold con su diseño y el plata con el sobre básico | Cumplido |
| RF-17 | MIENTRAS el sobre esté cerrado, EL SISTEMA no dejará ver ninguna carta, aunque se incline al máximo. | ✓ mientras_esta_cerrado_no_se_ve_ninguna_carta | RF-17 y RF-18: el sobre diseñado, cerrado sin cartas a la vista, se abre con la animación de Bruno | Cumplido |
| RF-18 | CUANDO el coleccionista rasgue el sobre o despegue el sticker según su diseño, EL SISTEMA lo abrirá con la | ✓ el_rasgado_del_sobre_se_anota_sin_sonar_dos_veces_y_respeta_el_silencio | RF-17 y RF-18: el sobre diseñado, cerrado sin cartas a la vista, se abre con la animación de Bruno | Cumplido |
| RF-19 | CUANDO el sobre se abra, EL SISTEMA hará subir las cartas boca abajo desde dentro a los 0,38 s, ocultará el | ✓ las_cartas_suben_a_0_38_el_sobre_se_va_a_1_25_y_el_mazo_queda_a_1_9 | RF-19, RF-20, RF-21 y RF-22: el mazo queda listo, late antes de la Legendaria y sale con el efecto especial | Cumplido |
| RF-20 | EL SISTEMA mostrará las cartas derechas, con solo la de arriba visible; al tocarla, arrastrarla o pulsar el | — | RF-19, RF-20, RF-21 y RF-22: el mazo queda listo, late antes de la Legendaria y sale con el efecto especial | Cumplido (E2E en los cuatro proyectos) |
| RF-21 | CUANDO la carta de arriba sea Legendaria o EX, EL SISTEMA hará latir el mazo antes de voltearla. | ✓ el_mazo_late_antes_de_voltear_una_legendaria_o_ex | — | Cumplido |
| RF-22 | CUANDO se revele una Legendaria o una EX, EL SISTEMA la presentará con el efecto especial: rayos dorados, | ✓ el_efecto_especial_es_de_la_legendaria_y_la_ex | RF-19, RF-20, RF-21 y RF-22: el mazo queda listo, late antes de la Legendaria y sale con el efecto especial | Cumplido |
| RF-23 | EL SISTEMA mostrará los puntos de avance del mazo y, al final, el resumen con el diseño de Bruno, conservando | ✓ un_punto_por_carta_y_ninguno_con_una_sola | RF-23: el resumen «Tu sobre» con miniaturas, rareza y «¡Nueva!» | Cumplido |
| RF-24 | EL SISTEMA conservará el resto del flujo de la spec 023: la tirada la decide el servidor al confirmar la | — | RF-15 y RF-24: el plata se abre con el sobre básico y el flujo de siempre | Cumplido |
| RF-25 | CUANDO empiece «Abrir todos», EL SISTEMA mantendrá su ráfaga y su ritmo actuales con el sobre nuevo, y | — | RF-25: «Abrir todos» con el sobre nuevo y el efecto especial en la Legendaria destacada | Cumplido |
| RF-26 | CUANDO se revele una Legendaria o una EX, EL SISTEMA mostrará solo el efecto especial, con la vibración de | ✓ test_s030_rf26_especial_sin_efectos_viejos<br>✓ test_s030_rf26_las_demas_conservan_sus_efectos | RF-21 y RF-22 de la E2E de la 030 | Cumplido (unidad y E2E en los cuatro proyectos) |
| RF-27 | MIENTRAS una carta con versión viva esté arriba del mazo sin revelar, EL SISTEMA la irá cargando oculta, para | — | live-cards: revelación viva con su entrada | Cumplido en E2E (cuatro proyectos); falta medir en un teléfono real |
