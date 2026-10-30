# Validación — Spec 018

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-10-24. Vitest: 600 de 600 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (21 de 21 RF con al menos un test en verde).

Cierre técnico (24 oct 2026): E2E completo en 4 proyectos en verde (65 pasaron, 20 solo de escritorio omitidos en los
demás) y `e2e/live-cards.spec.ts` de nuevo en los 4 tras añadir los pasos de RF-5, RF-9 y RF-10; `pnpm budget`: la
página más pesada del coleccionista en 205,7 kB (límite 250). Falta la prueba en un teléfono real
(`dispositivo.md`) y la demo manual del dueño.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | EL SISTEMA tendrá para cada carta armada una imagen fija de la carta completa. | ✓ la_imagen_fija_es_la_carta_completa_a_1400_por_1982<br>✓ la_misma_carta_da_la_misma_imagen<br>✓ rf15_salen_los_tamanos_y_la_publica_lleva_marca_de_agua | — | Cumplido |
| RF-2 | EL SISTEMA usará la imagen fija en lugar de la imagen compuesta con el marco de Pencil en todas partes donde se | ✓ la_carta_creada_desde_la_chica_ya_tiene_su_imagen_fija | — | Cumplido |
| RF-3 | CUANDO se guarden las capas de una carta o cambie su rareza, EL SISTEMA regenerará su imagen fija. | ✓ guardar_las_capas_regenera_la_imagen_fija_y_borra_la_anterior<br>✓ cambiar_la_rareza_regenera_la_imagen_fija | — | Cumplido |
| RF-4 | SI no se puede generar la imagen fija, ENTONCES EL SISTEMA no guardará el cambio e indicará el motivo. | ✓ si_no_se_puede_generar_la_imagen_fija_no_se_guarda<br>✓ si_falta_una_imagen_no_se_genera | — | Cumplido |
| RF-5 | EL SISTEMA dará a la imagen fija de una carta holo un acabado arcoíris visible. | — | RF-5 y RF-9: la holo lleva su acabado en la miniatura y su brillo en la ficha viva | Cumplido |
| RF-6 | CUANDO el coleccionista revele una carta al abrir un sobre, EL SISTEMA la mostrará como carta viva, con el sello | — | RF-6 y RF-14: al revelar la carta se ve viva (con movimiento reducido, la imagen fija) | Cumplido |
| RF-7 | CUANDO el coleccionista abra la ficha de una carta de su colección, EL SISTEMA la mostrará como carta viva. | — | RF-7, RF-11 y RF-14: la ficha muestra la carta viva; el interruptor del giroscopio solo en el teléfono | Cumplido |
| RF-8 | EL SISTEMA mostrará la imagen fija en la cuadrícula de la colección, el resumen de la apertura, «Abrir todos», | — | RF-8: en la bandeja y en el resumen, la imagen fija | Cumplido |
| RF-9 | EL SISTEMA mostrará la versión holo de una carta viva con un brillo arcoíris que sigue la inclinación. | — | RF-5 y RF-9: la holo lleva su acabado en la miniatura y su brillo en la ficha viva | Cumplido |
| RF-10 | EL SISTEMA inclinará la carta viva con el ratón en escritorio y arrastrando el dedo en pantallas táctiles, y la | — | RF-10: la carta viva se inclina con el ratón y se balancea sola si nadie la toca | Cumplido |
| RF-11 | DONDE el dispositivo tenga giroscopio, EL SISTEMA ofrecerá en la ficha de la carta un interruptor «Mover con el | — | RF-7, RF-11 y RF-14: la ficha muestra la carta viva; el interruptor del giroscopio solo en el teléfono | Cumplido |
| RF-12 | CUANDO el coleccionista active «Mover con el teléfono», EL SISTEMA pedirá el permiso que exija el dispositivo y, | ✓ el_giroscopio_se_puede_activar_y_apagar | — | Cumplido |
| RF-13 | SI el permiso se niega, ENTONCES EL SISTEMA dejará el interruptor apagado, lo indicará y la carta seguirá | — | RF-13: si se niega el permiso, el interruptor queda apagado y avisa | Cumplido |
| RF-14 | MIENTRAS el usuario prefiera menos movimiento (ajuste del sistema), EL SISTEMA mostrará la imagen fija en lugar | — | RF-6 y RF-14: al revelar la carta se ve viva (con movimiento reducido, la imagen fija)<br>RF-7, RF-11 y RF-14: la ficha muestra la carta viva; el interruptor del giroscopio solo en el teléfono | Cumplido |
| RF-15 | EL SISTEMA mostrará en el álbum público y en las vistas previas de enlaces compartidos una versión reducida de la | ✓ rf15_salen_los_tamanos_y_la_publica_lleva_marca_de_agua | — | Cumplido |
| RF-16 | EL SISTEMA solo entregará las capas de una carta (para verla viva) y su imagen fija completa a quien la tenga en | ✓ quien_tiene_la_carta_recibe_su_configuracion_con_enlaces_firmados_que_caducan<br>✓ quien_no_la_tiene_no_recibe_nada | RF-16: el enlace de una capa no sirve con la sesión de otra persona | Cumplido |
| RF-17 | EL SISTEMA solo entregará las capas y la imagen fija de una carta 18+ a quien cumpla el doble control de edad. | ✓ una_carta_18_solo_con_el_doble_control_de_edad | — | Cumplido |
| RF-18 | SI se cambian las capas de una carta de una colección 18+ publicada, ENTONCES EL SISTEMA dejará el cambio | ✓ lo_pendiente_de_revision_no_se_entrega<br>✓ el_cambio_queda_pendiente_y_lo_vigente_no_cambia<br>✓ varios_cambios_seguidos_dejan_pendiente_solo_el_ultimo<br>✓ en_una_18_en_borrador_el_cambio_se_guarda_al_momento | RF-18 y RF-21: el cambio queda pendiente y el panel lo avisa con enlace a la carta | Cumplido |
| RF-19 | CUANDO un administrador apruebe el cambio pendiente («personaje claramente adulto»), EL SISTEMA mostrará a los | ✓ aprobar_pasa_lo_pendiente_a_vigente | RF-19: aprobarlo lo pasa a vigente y el aviso desaparece | Cumplido |
| RF-20 | CUANDO un administrador descarte el cambio pendiente, EL SISTEMA lo quitará y la carta seguirá como estaba. | ✓ descartar_quita_lo_pendiente_y_la_carta_sigue_como_estaba | RF-20: descartar un cambio pendiente deja la carta como estaba | Cumplido |
| RF-21 | EL SISTEMA indicará en el panel qué cartas tienen cambios de capas pendientes de revisión, con enlace a cada una. | — | RF-18 y RF-21: el cambio queda pendiente y el panel lo avisa con enlace a la carta | Cumplido |
