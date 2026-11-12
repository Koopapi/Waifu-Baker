# Validación — Spec 039

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-12. Vitest: 1006 de 1006 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (17 de 17 RF con al menos un test en verde).

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | CUANDO el administrador revele una carta armada en el simulador, EL SISTEMA la mostrará con la vista del armador. | ✓ una_carta_armada_va_viva_con_la_vista_del_armador_y_enlaces_del_panel | RF-1, RF-2, RF-3 y RF-4: el simulador revela la carta viva, con un solo sello y sin la insignia de la escena | Cumplido |
| RF-2 | MIENTRAS se vea una carta armada en el simulador, EL SISTEMA mostrará su sello de rareza una sola vez: el del | — | RF-1, RF-2, RF-3 y RF-4: el simulador revela la carta viva, con un solo sello y sin la insignia de la escena | Cumplido |
| RF-3 | CUANDO se revele una carta armada en el simulador, EL SISTEMA no mostrará la insignia de rareza de la escena. | — | RF-1, RF-2, RF-3 y RF-4: el simulador revela la carta viva, con un solo sello y sin la insignia de la escena | Cumplido |
| RF-4 | CUANDO una copia holo salga en el simulador, EL SISTEMA la revelará con la vista previa holo del armador. | ✓ rf6_una_copia_holo_usa_la_imagen_fija_holo | RF-1, RF-2, RF-3 y RF-4: el simulador revela la carta viva, con un solo sello y sin la insignia de la escena | Cumplido |
| RF-5 | EL SISTEMA mostrará en el resumen del simulador la imagen fija de cada carta armada, sin insignia de rareza. | — | RF-5 y RF-6: el resumen del simulador con la imagen fija holo, sin insignia de rareza | Cumplido |
| RF-6 | CUANDO una copia holo salga en el simulador, EL SISTEMA mostrará en el resumen su imagen fija holo. | ✓ rf6_una_copia_holo_usa_la_imagen_fija_holo<br>✓ una_copia_holo_sin_imagen_holo_usa_la_normal_con_acabado_holo | RF-5 y RF-6: el resumen del simulador con la imagen fija holo, sin insignia de rareza | Cumplido |
| RF-7 | EL SISTEMA no aplicará en el simulador los efectos del vínculo con un personaje (spec 029). | ✓ sin_efectos_del_vinculo | — | Cumplido |
| RF-8 | MIENTRAS una carta 18+ tenga cambios pendientes de revisión, EL SISTEMA mostrará en el simulador lo último | ✓ lo_vigente_aunque_haya_cambios_pendientes | — | Cumplido |
| RF-9 | SI una carta del simulador no tiene configuración de capas, ENTONCES EL SISTEMA la mostrará con su imagen fija y | ✓ una_carta_sin_capas_va_sin_carta_viva | — | Cumplido |
| RF-17 | MIENTRAS se vea una carta viva en la escena de apertura (simulador o apertura del coleccionista), EL SISTEMA | — | RF-17: en la apertura del coleccionista, el sello también se ve completo | Cumplido |
| RF-10 | EL SISTEMA no mostrará en el editor de una carta la vista previa anterior, con su casilla de holo y su pista de | — | RF-10, RF-11 y RF-12: el editor de una carta sin la vista previa anterior | Cumplido |
| RF-11 | EL SISTEMA seguirá mostrando en el editor de una carta la vista previa del armador. | — | RF-10, RF-11 y RF-12: el editor de una carta sin la vista previa anterior | Cumplido |
| RF-12 | EL SISTEMA seguirá mostrando en el editor de una carta el cambio de arte y la nota del arte pendiente de | — | RF-10, RF-11 y RF-12: el editor de una carta sin la vista previa anterior | Cumplido |
| RF-13 | CUANDO salga una carta de muestra armada en el diseñador de sobres, EL SISTEMA la mostrará con la vista del | ✓ una_carta_armada_sale_con_la_vista_del_armador<br>✓ como_mucho_15_cartas_de_muestra | RF-13 y RF-14: el diseñador de sobres saca la carta de muestra viva, con un solo sello | Cumplido |
| RF-14 | MIENTRAS se vea una carta de muestra armada, EL SISTEMA mostrará su sello de rareza una sola vez: el del armador. | — | RF-13 y RF-14: el diseñador de sobres saca la carta de muestra viva, con un solo sello | Cumplido |
| RF-15 | SI una carta de muestra no tiene configuración de capas, ENTONCES EL SISTEMA la mostrará con su imagen fija. | ✓ una_carta_sin_capas_sale_con_su_imagen_fija | — | Cumplido |
| RF-16 | SI la colección no tiene cartas con rareza, ENTONCES EL SISTEMA seguirá usando la carta de ejemplo del paquete | ✓ sin_cartas_con_rareza_usa_la_carta_de_ejemplo | — | Cumplido |
