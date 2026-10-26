# Validación — Spec 021

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-10-26. Vitest: 668 de 668 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (16 de 16 RF con al menos un test en verde).

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | EL SISTEMA permitirá al administrador marcar cada colección como gratuita o de Patreon, de Patreon por defecto. | ✓ rf3_el_administrador_marca_una_coleccion_gratuita_y_queda_en_el_historial | RF-1 y RF-3: el administrador marca y desmarca una colección como gratuita | Cumplido |
| RF-2 | SI el administrador marca como gratuita una colección 18+, ENTONCES EL SISTEMA no lo aceptará e informará del | ✓ una_coleccion_18_no_puede_ser_gratuita | — | Cumplido |
| RF-3 | EL SISTEMA mostrará en el panel, en la lista de colecciones y en cada colección, si es gratuita o de Patreon. | ✓ rf3_el_administrador_marca_una_coleccion_gratuita_y_queda_en_el_historial | RF-1 y RF-3: el administrador marca y desmarca una colección como gratuita | Cumplido |
| RF-4 | CUANDO el coleccionista reclame el sobre gratis cada 12 h, EL SISTEMA solo le ofrecerá colecciones gratuitas | ✓ el_sobre_cada_12_h_solo_ofrece_colecciones_gratuitas | RF-4: el sobre gratis solo ofrece la colección gratuita | Cumplido |
| RF-5 | CUANDO el coleccionista reclame el sobre del día 7, EL SISTEMA solo le ofrecerá colecciones gratuitas publicadas | ✓ el_sobre_del_dia_7_solo_es_de_una_coleccion_gratuita | — | Cumplido |
| RF-6 | CUANDO una expedición gane un sobre, EL SISTEMA solo lo dará de colecciones gratuitas publicadas (sustituye a la | ✓ rf7_el_sobre_de_expedicion_solo_es_gratuito_y_sin_gratuitas_queda_pendiente | — | Cumplido |
| RF-7 | SI no hay ninguna colección gratuita publicada, ENTONCES EL SISTEMA no concederá sobres por esas fuentes, | ✓ rf7_el_sobre_de_expedicion_solo_es_gratuito_y_sin_gratuitas_queda_pendiente | — | Cumplido |
| RF-8 | EL SISTEMA permitirá elegir como colección de bienvenida cualquier colección SFW publicada, gratuita o de | ✓ la_bienvenida_puede_ser_una_coleccion_de_patreon | RF-8 y RF-16: la bienvenida es la colección de Patreon (la probadita) y la regla del tier SFW propone 8 sobres | Cumplido |
| RF-9 | MIENTRAS el coleccionista no sea patron, EL SISTEMA le mostrará en cada colección de Patreon que vea (lista de | — | RF-9: en «Mis sobres» la colección de Patreon dice cómo conseguir más, con enlace<br>RF-9: la lista de colecciones y el álbum de la colección de Patreon avisan y enlazan | Cumplido |
| RF-10 | EL SISTEMA indicará en la página de Probabilidades, junto a cada colección, si se consigue gratis o con la | ✓ las_probabilidades_publicas_saben_si_cada_coleccion_es_gratuita | RF-10: Probabilidades dice cómo se consigue cada colección | Cumplido |
| RF-11 | MIENTRAS el coleccionista sea patron, EL SISTEMA mostrará una insignia de patron en su cuenta y en su álbum | ✓ rf12_la_insignia_sigue_a_la_membresia_en_la_cuenta_y_el_album_publico<br>✓ es_patron_con_membresia_pagada_y_una_regla_con_sobres<br>✓ rf12_no_es_patron_sin_enlace_con_cobro_pendiente_reembolsado_o_tier_sin_reglas | RF-11 y RF-13: con la membresía activa aparece la insignia y hay 3 espacios<br>RF-11: la insignia también sale en el álbum público | Cumplido |
| RF-12 | CUANDO el coleccionista deje de ser patron, EL SISTEMA quitará la insignia en la siguiente lectura de su | ✓ rf12_la_insignia_sigue_a_la_membresia_en_la_cuenta_y_el_album_publico<br>✓ rf12_no_es_patron_sin_enlace_con_cobro_pendiente_reembolsado_o_tier_sin_reglas | RF-12 y RF-14: al perder la membresía se van la insignia y el tercer espacio | Cumplido |
| RF-13 | MIENTRAS el coleccionista sea patron, EL SISTEMA le dará 3 espacios de expedición en lugar de 2. | ✓ rf14_el_patron_tiene_3_espacios_y_al_dejar_de_serlo_terminan_los_tres<br>✓ el_patron_tiene_3_espacios_y_el_resto_2 | RF-11 y RF-13: con la membresía activa aparece la insignia y hay 3 espacios | Cumplido |
| RF-14 | SI un coleccionista con 3 expediciones en curso deja de ser patron, ENTONCES EL SISTEMA dejará terminar las | ✓ rf14_el_patron_tiene_3_espacios_y_al_dejar_de_serlo_terminan_los_tres | RF-12 y RF-14: al perder la membresía se van la insignia y el tercer espacio | Cumplido |
| RF-15 | MIENTRAS el coleccionista no sea patron, EL SISTEMA le mostrará en Expediciones que el tercer espacio llega con | — | RF-15: el jugador gratis ve el tercer espacio bloqueado, con enlace | Cumplido |
| RF-16 | CUANDO el administrador añada una regla de tier, EL SISTEMA propondrá 8 sobres al mes. | — | RF-8 y RF-16: la bienvenida es la colección de Patreon (la probadita) y la regla del tier SFW propone 8 sobres | Cumplido |
