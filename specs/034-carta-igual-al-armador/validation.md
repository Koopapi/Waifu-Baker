# Validación — Spec 034

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-10. Vitest: 968 de 968 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (16 de 16 RF con al menos un test en verde).

**E2E (9 y 10 nov 2026):** en `chromium-desktop`, la E2E de la spec y las afectadas pasaron. `admin-panel` se quedó
sin tiempo en la corrida grande y pasó al repetirla sola. La suite completa en los cuatro proyectos queda pendiente:
satura la máquina del dueño, así que corre en la CI y antes de pasar a producción. `pnpm build` y `pnpm budget` están
en verde: la colección del panel pesa 247,8 kB de 260 y «Abrir todos», 194,4 kB de 250.

**Revisión del dueño:** capturas lado a lado del armador y la apertura en
`apps/web/test-results/screens/chromium-desktop/s034-*.png`. Las imágenes fijas (miniaturas) de las cartas ya
guardadas se regeneran al volver a guardarlas.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | CUANDO el coleccionista voltee una carta en la apertura de un sobre, EL SISTEMA la mostrará con la vista del | ✓ cada_capa_lleva_el_encuadre_completo_del_armador | RF-1, RF-5, RF-6 y RF-9: en la apertura, la común y la rara son las del armador | Cumplido |
| RF-2 | CUANDO «Abrir todos» muestre una carta destacada, EL SISTEMA la mostrará con la vista del armador. | — | RF-2: en «Abrir todos», la destacada es la del armador | Cumplido |
| RF-3 | CUANDO el coleccionista abra la ficha de una carta en «Mi colección», EL SISTEMA la mostrará con la vista del | — | RF-3 y RF-4: la ficha de «Mi colección» es la del armador, con su proporción | Cumplido |
| RF-4 | EL SISTEMA mostrará la carta en esas tres pantallas con la proporción del armador (700 × 991), sin estirarla ni | ✓ rf11_la_carta_de_la_apertura_y_su_imagen_fija_tienen_la_proporcion_del_armador | RF-3 y RF-4: la ficha de «Mi colección» es la del armador, con su proporción | Cumplido |
| RF-5 | EL SISTEMA no añadirá a la carta en esas pantallas otro brillo, otro holo, otra inclinación ni otro marco que | ✓ el_armador_y_el_coleccionista_dan_la_misma_firma | RF-1, RF-5, RF-6 y RF-9: en la apertura, la común y la rara son las del armador | Cumplido |
| RF-6 | EL SISTEMA conservará en la apertura el volteo de la carta y su entrada (el brillo que barre y el sello que | — | RF-1, RF-5, RF-6 y RF-9: en la apertura, la común y la rara son las del armador | Cumplido |
| RF-7 | CUANDO una copia sea holo (porque así salió en el sobre), EL SISTEMA la mostrará como el armador con la vista | ✓ una_copia_holo_se_ve_holo_y_una_carta_guardada_con_holo_tambien | — | Cumplido |
| RF-8 | DONDE el coleccionista tenga nivel de vínculo con el personaje, EL SISTEMA sumará los efectos del vínculo | ✓ los_efectos_del_vinculo_se_suman_a_la_carta_del_armador | — | Cumplido |
| RF-9 | EL SISTEMA mostrará las cartas Comunes con la vista del armador en la apertura, en «Abrir todos» y en la ficha, | ✓ la_comun_se_monta_viva_con_la_vista_del_armador | RF-1, RF-5, RF-6 y RF-9: en la apertura, la común y la rara son las del armador | Cumplido |
| RF-10 | EL SISTEMA generará la imagen fija de una carta (miniaturas y álbum) con el mismo encuadre, marco y sello que la | ✓ la_imagen_fija_usa_el_encuadre_del_armador | — | Cumplido |
| RF-11 | SI una carta no tiene configuración de capas, ENTONCES EL SISTEMA mostrará su imagen fija con la proporción | ✓ rf11_la_carta_de_la_apertura_y_su_imagen_fija_tienen_la_proporcion_del_armador | — | Cumplido |
| RF-12 | CUANDO el administrador guarde una carta, EL SISTEMA guardará con ella la profundidad del parallax, la | ✓ el_coleccionista_recibe_el_movimiento_y_el_encuadre_guardados<br>✓ el_movimiento_y_el_holo_guardados_se_respetan<br>✓ el_esquema_acepta_y_limita_el_movimiento | RF-12, RF-13 y RF-15: el movimiento y el holo de la común se guardan con la carta | Cumplido |
| RF-13 | CUANDO el administrador abra una carta en el armador, EL SISTEMA mostrará esos controles con los valores | — | RF-12, RF-13 y RF-15: el movimiento y el holo de la común se guardan con la carta | Cumplido |
| RF-14 | SI una carta se guardó antes de esta spec, ENTONCES EL SISTEMA usará los valores de fábrica (profundidad 14, | ✓ una_carta_antigua_usa_los_valores_de_fabrica | — | Cumplido |
| RF-15 | MIENTRAS una carta esté guardada con el holo activado, EL SISTEMA mostrará holo todas sus copias, las normales | — | RF-12, RF-13 y RF-15: el movimiento y el holo de la común se guardan con la carta | Cumplido |
| RF-16 | EL SISTEMA guardará esos valores en el historial de versiones de la carta (spec 027), como el resto de lo que | ✓ el_movimiento_y_el_holo_quedan_en_la_carta_y_en_su_version | — | Cumplido |
