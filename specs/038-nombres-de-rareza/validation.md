# Validación — Spec 038

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-12. Vitest: 996 de 996 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (11 de 11 RF con al menos un test en verde).

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | EL SISTEMA nombrará las rarezas, de menor a mayor, Common, Rare, Ultra Rare, SSR y EX. | ✓ las_rarezas_se_llaman_common_rare_ultra_rare_ssr_y_ex | RF-1 y RF-3: las probabilidades públicas usan los nombres nuevos | Cumplido |
| RF-2 | EL SISTEMA mostrará esos nombres iguales en español y en inglés. | ✓ los_nombres_son_iguales_en_espanol_y_en_ingles | — | Cumplido |
| RF-3 | EL SISTEMA usará esos nombres en todas las pantallas del coleccionista, del visitante y del panel. Eso incluye | ✓ ningun_texto_usa_los_nombres_anteriores | RF-1 y RF-3: las probabilidades públicas usan los nombres nuevos<br>RF-3 y RF-5: el resumen de un sobre gold nombra la SSR y la estrella dice SSR<br>RF-3: el filtro de la colección ofrece los nombres nuevos | Cumplido |
| RF-4 | EL SISTEMA usará esos nombres en los textos que agrupan cartas por rareza: «Commons», «Rares», «Ultra Rares», | ✓ los_grupos_se_llaman_commons_rares_ultra_rares_ssr_y_ex | — | Cumplido |
| RF-5 | EL SISTEMA mostrará la rareza en el efecto especial de la apertura (spec 030, RF-22) con su nombre nuevo. | ✓ la_abreviatura_de_cada_rareza_es_c_r_ur_ssr_y_ex | RF-3 y RF-5: el resumen de un sobre gold nombra la SSR y la estrella dice SSR | Cumplido |
| RF-6 | CUANDO el administrador aplique a una carta el estilo de su rareza, EL SISTEMA le pondrá el sello C, R, UR, SSR | ✓ el_estilo_de_cada_rareza_pone_su_sello_nuevo<br>✓ los_sellos_son_c_r_ur_ssr_y_ex | RF-6: la carta SSR lleva el sello SSR | Cumplido |
| RF-7 | CUANDO se despliegue esta spec, EL SISTEMA cambiará el sello E por UR y el sello LEG por SSR en las cartas ya | ✓ rf8_al_arrancar_e_pasa_a_ur_y_leg_a_ssr_y_lo_escrito_a_mano_no_cambia<br>✓ e_pasa_a_ur_en_la_ultra_rare_y_leg_a_ssr_en_la_ssr | — | Cumplido |
| RF-8 | SI el sello de una carta tiene un texto distinto del de su rareza (escrito a mano en el armador), ENTONCES EL | ✓ rf8_al_arrancar_e_pasa_a_ur_y_leg_a_ssr_y_lo_escrito_a_mano_no_cambia<br>✓ un_sello_escrito_a_mano_o_de_otra_rareza_no_se_toca | — | Cumplido |
| RF-9 | CUANDO cambie el sello de una carta ya armada, EL SISTEMA regenerará sus imágenes fijas. | ✓ las_cartas_renombradas_se_regeneran_con_el_sello_nuevo | — | Cumplido |
| RF-10 | CUANDO cambie el sello de una carta ya armada, EL SISTEMA lo guardará como una versión nueva en su historial | ✓ el_cambio_queda_en_el_historial_con_su_motivo | — | Cumplido |
| RF-11 | SI una carta 18+ tiene cambios pendientes de revisión, ENTONCES EL SISTEMA cambiará el sello en lo aprobado y en | ✓ lo_pendiente_de_revision_tambien_cambia_sin_pedir_otra_revision | — | Cumplido |
