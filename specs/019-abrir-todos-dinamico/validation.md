# Validación — Spec 019

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-10-24. Vitest: 607 de 607 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (14 de 14 RF con al menos un test en verde).

Cierre técnico (24 oct 2026): E2E completo en 4 proyectos en verde (70 pasaron, 23 solo de escritorio o solo de
teléfono omitidos en los demás); `pnpm budget`: «Abrir todos» en 184,7 kB y la página más pesada del coleccionista en
206,5 kB (límite 250; +0,8 kB por los textos nuevos de «Abrir todos» en el diccionario general). Falta la prueba en un
teléfono real (`dispositivo.md`) y la demo manual del dueño.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | CUANDO el coleccionista pulse «Abrir todos», EL SISTEMA mostrará los sobres de la colección rasgándose uno tras | — | RF-1 a RF-3: los sobres se rasgan en ráfaga con su sonido y no pasa de 6 s | Cumplido |
| RF-2 | EL SISTEMA ajustará el ritmo de la ráfaga para que no dure más de 6 segundos, sea cual sea el número de sobres. | ✓ la_rafaga_no_pasa_de_6_segundos_y_va_pausada_con_pocos_sobres | RF-2: con 50 sobres, la ráfaga se acelera y no pasa de 6 s | Cumplido |
| RF-3 | EL SISTEMA sonará al rasgar los sobres de la ráfaga sin superar un sonido cada 120 ms (sustituye a la spec 013, | ✓ como_mucho_un_sonido_cada_120_ms | RF-1 a RF-3: los sobres se rasgan en ráfaga con su sonido y no pasa de 6 s | Cumplido |
| RF-4 | CUANDO termine la ráfaga, EL SISTEMA presentará en grande, una por una y de mayor a menor rareza, las cartas | ✓ destacadas_epicas_o_mejores_siempre_y_raras_solo_nuevas_de_mayor_a_menor<br>✓ cada_version_se_destaca_una_vez_nuevas_y_holo_primero | RF-4 y RF-6: la rara nueva se presenta en grande, viva y con su sonido | Cumplido |
| RF-5 | SI el lote tiene más de 10 cartas destacadas, ENTONCES EL SISTEMA presentará en el foco solo las 10 mejores y | ✓ como_mucho_10_destacadas_las_mejores | — | Cumplido |
| RF-6 | EL SISTEMA mostrará cada carta del foco como carta viva, con el sonido, la vibración y la celebración de su | — | RF-4 y RF-6: la rara nueva se presenta en grande, viva y con su sonido | Cumplido |
| RF-7 | CUANDO el coleccionista toque la carta del foco o pulse «Siguiente», EL SISTEMA pasará a la siguiente. | — | RF-7 y RF-10 a RF-13: al pasar la última, el resumen agrupado con copias, nuevas y totales | Cumplido |
| RF-8 | SI el lote no tiene cartas destacadas, ENTONCES EL SISTEMA pasará de la ráfaga al resumen final. | ✓ un_lote_sin_destacadas_no_tiene_foco | RF-8: un lote sin destacadas pasa de la ráfaga al resumen | Cumplido |
| RF-9 | MIENTRAS dure la ráfaga o el foco, EL SISTEMA ofrecerá «Saltar», que llevará directo al resumen final. | — | RF-9: «Saltar» en la ráfaga lleva directo al resumen | Cumplido |
| RF-10 | EL SISTEMA mostrará el lote agrupado por rareza, de la más rara a la más común, con el número de cartas de cada | ✓ rf11_rf12_grupos_de_la_mas_rara_a_la_mas_comun_con_copias_nuevas_y_holo | RF-7 y RF-10 a RF-13: al pasar la última, el resumen agrupado con copias, nuevas y totales | Cumplido |
| RF-11 | EL SISTEMA mostrará una sola vez cada versión de carta repetida en el lote, con cuántas copias salieron. | ✓ rf11_rf12_grupos_de_la_mas_rara_a_la_mas_comun_con_copias_nuevas_y_holo | — | Cumplido |
| RF-12 | EL SISTEMA marcará las cartas nuevas y las holo en el resumen final. | ✓ rf11_rf12_grupos_de_la_mas_rara_a_la_mas_comun_con_copias_nuevas_y_holo | — | Cumplido |
| RF-13 | EL SISTEMA mostrará los totales del lote: sobres abiertos, cartas, nuevas y holo. | — | RF-7 y RF-10 a RF-13: al pasar la última, el resumen agrupado con copias, nuevas y totales | Cumplido |
| RF-14 | MIENTRAS el usuario prefiera menos movimiento, EL SISTEMA no mostrará la ráfaga y presentará el foco con | — | RF-14: con movimiento reducido, sin ráfaga y el foco con la imagen fija | Cumplido |
