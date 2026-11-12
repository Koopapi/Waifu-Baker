# Validación — Spec 037

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-12. Vitest: 984 de 984 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (25 de 25 RF con al menos un test en verde).

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | CUANDO el coleccionista reclame un sobre de recompensa (gratis, racha o diario), EL SISTEMA mostrará en la | ✓ la_celebracion_del_dia_7_muestra_la_miniatura_del_sobre | — | Cumplido |
| RF-2 | CUANDO al coleccionista le lleguen sobres regalados, EL SISTEMA mostrará en el aviso de llegada la miniatura del | ✓ rf5_la_llegada_usa_el_sobre_del_tipo_que_llego | RF-2 y RF-5: la llegada muestra la miniatura del sobre que llegó, del tipo que llegó | Cumplido |
| RF-3 | CUANDO Expediciones dé un sobre de premio, EL SISTEMA mostrará la miniatura de ese sobre. | ✓ el_premio_de_expediciones_muestra_la_miniatura_del_sobre | — | Cumplido |
| RF-4 | EL SISTEMA mostrará en los ajustes del sobre de una colección, en el panel, la miniatura del sobre plata y la del | — | RF-4: los ajustes del sobre del panel muestran el sobre plata y el gold | Cumplido |
| RF-5 | EL SISTEMA mostrará en cada vista la miniatura del tipo de sobre que corresponde: plata o gold. | ✓ cada_coleccion_de_la_llegada_lleva_el_tipo_de_su_sobre<br>✓ rf5_la_llegada_usa_el_sobre_del_tipo_que_llego | RF-2 y RF-5: la llegada muestra la miniatura del sobre que llegó, del tipo que llegó | Cumplido |
| RF-6 | EL SISTEMA no mostrará el sobre plano anterior en ninguna pantalla del coleccionista ni del panel. | ✓ ya_no_existe_el_sobre_plano_anterior | RF-6: ningún sobre plano anterior en «Mis sobres» ni en las recompensas | Cumplido |
| RF-7 | EL SISTEMA mostrará cada carta obtenida con su imagen fija en «Mi colección», en la colección de un set y en la | — | RF-7 y RF-12: en la colección, las copias holo con su imagen fija holo | Cumplido |
| RF-8 | EL SISTEMA mostrará cada carta con su imagen fija en el álbum propio, en el álbum público y en su imagen para | — | RF-8 y RF-12: en el álbum, las copias holo con su imagen fija holo | Cumplido |
| RF-9 | EL SISTEMA mostrará cada carta obtenida con su imagen fija en Expediciones, en el resumen de un sobre y en la | ✓ expediciones_y_el_resumen_piden_la_imagen_fija_de_cada_copia | — | Cumplido |
| RF-10 | CUANDO el coleccionista toque o seleccione una carta de una cuadrícula, EL SISTEMA abrirá su ficha con la vista | ✓ tocar_una_carta_de_la_cuadricula_abre_su_ficha_viva | — | Cumplido |
| RF-11 | CUANDO el administrador guarde una carta, EL SISTEMA generará también su imagen fija holo. | ✓ la_imagen_holo_es_la_carta_con_la_vista_previa_holo_y_mide_lo_mismo<br>✓ guardar_una_carta_genera_su_imagen_holo<br>✓ lo_pendiente_de_revision_lleva_su_holo_y_al_aprobarlo_pasa_a_la_carta | — | Cumplido |
| RF-12 | MIENTRAS el coleccionista tenga la copia holo de una carta, EL SISTEMA mostrará la imagen fija holo en sus | ✓ el_tamano_holo_se_firma_aparte_del_normal<br>✓ una_copia_holo_con_imagen_holo_pide_la_holo_sin_acabado_extra | RF-7 y RF-12: en la colección, las copias holo con su imagen fija holo<br>RF-8 y RF-12: en el álbum, las copias holo con su imagen fija holo | Cumplido |
| RF-13 | MIENTRAS el coleccionista tenga solo la copia normal, EL SISTEMA mostrará la imagen fija normal. | ✓ una_copia_normal_pide_la_normal<br>✓ rf19_las_cuadriculas_solo_ponen_el_acabado_holo_si_no_hay_imagen_holo | — | Cumplido |
| RF-14 | CUANDO una copia holo salga en un sobre, EL SISTEMA mostrará la imagen fija holo en el resumen del sobre. | — | RF-23 y RF-14: el resumen sin letrero de rareza y con la imagen fija holo | Cumplido |
| RF-15 | MIENTRAS una carta esté guardada con el holo activado (spec 034, RF-15), EL SISTEMA mostrará la imagen fija holo | ✓ una_carta_guardada_con_holo_usa_la_misma_imagen | — | Cumplido |
| RF-16 | EL SISTEMA mostrará en el álbum público la imagen fija holo de las cartas que el dueño del álbum tenga en holo, | ✓ el_album_publico_usa_la_imagen_holo_si_el_dueno_tiene_la_holo | — | Cumplido |
| RF-17 | CUANDO se despliegue esta spec, EL SISTEMA regenerará la imagen fija y la imagen fija holo de todas las cartas | ✓ al_desplegar_regenera_la_imagen_y_la_holo_de_las_cartas_atrasadas | — | Cumplido |
| RF-18 | SI la regeneración de una carta falla, ENTONCES EL SISTEMA conservará su imagen anterior y la listará en el | ✓ si_una_carta_falla_conserva_su_imagen_queda_listada_y_se_puede_reintentar | — | Cumplido |
| RF-19 | MIENTRAS una carta no tenga imagen fija holo, EL SISTEMA mostrará su imagen fija normal con la insignia | ✓ rf20_una_copia_holo_sin_imagen_holo_pide_la_normal_con_su_insignia_holo<br>✓ rf19_las_cuadriculas_solo_ponen_el_acabado_holo_si_no_hay_imagen_holo | — | Cumplido |
| RF-20 | SI una carta no tiene configuración de capas, ENTONCES EL SISTEMA mostrará su imagen fija con la proporción del | ✓ rf20_una_copia_holo_sin_imagen_holo_pide_la_normal_con_su_insignia_holo | — | Cumplido |
| RF-21 | CUANDO se revele una carta en la apertura de un sobre, EL SISTEMA no mostrará la insignia con la letra de su | — | RF-21, RF-22 y RF-24: la carta revelada sin letrero de rareza, con su nombre y la rareza para lectores | Cumplido |
| RF-22 | CUANDO se revele una carta en la apertura de un sobre, EL SISTEMA seguirá mostrando su nombre, su colección, | — | RF-21, RF-22 y RF-24: la carta revelada sin letrero de rareza, con su nombre y la rareza para lectores | Cumplido |
| RF-23 | EL SISTEMA no mostrará la insignia de rareza de cada carta en el resumen final del sobre. | — | RF-23 y RF-14: el resumen sin letrero de rareza y con la imagen fija holo | Cumplido |
| RF-24 | EL SISTEMA conservará el nombre de la rareza en el texto accesible de la carta revelada y de cada carta del | — | RF-21, RF-22 y RF-24: la carta revelada sin letrero de rareza, con su nombre y la rareza para lectores | Cumplido |
| RF-25 | SI la carta no tiene configuración de capas (y por tanto no tiene sello), ENTONCES EL SISTEMA mantendrá su | — | RF-25: una carta sin capas (laboratorio) conserva su insignia de rareza | Cumplido |
