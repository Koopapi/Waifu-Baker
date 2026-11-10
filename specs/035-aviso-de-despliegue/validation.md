# Validación — Spec 035

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-10. Vitest: 968 de 968 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida en unidad e integración** (10 de 11 RF con al menos un test en verde; el RF-9 se comprueba a mano, ver abajo).

**E2E (9 y 10 nov 2026):** en `chromium-desktop`, la E2E de la spec y las afectadas pasaron. `admin-panel` se quedó
sin tiempo en la corrida grande y pasó al repetirla sola. La suite completa en los cuatro proyectos queda pendiente:
satura la máquina del dueño, así que corre en la CI y antes de pasar a producción. `pnpm build` y `pnpm budget` están
en verde: la colección del panel pesa 247,8 kB de 260 y «Abrir todos», 194,4 kB de 250.

**RF-9 (despliegue fallido):** lo avisa Coolify, con su notificación de Telegram y solo «Deployment failed», porque una
versión que no arranca no puede avisar por sí misma. No tiene prueba automática. Se comprueba en la prueba real (T5),
tras configurar Coolify como dice `docs/despliegue.md`, y el mensaje de Coolify viene en inglés.

**Pendiente:** la prueba real en pruebas (T5). Requiere activar en Coolify «Include Source Commit in Build» y
`DEPLOY_NOTICE=1`.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | CUANDO una versión nueva de pruebas empiece a responder bien en su comprobación de salud, EL SISTEMA enviará un | ✓ rf8_avisa_una_sola_vez_por_version_aunque_se_reinicie | — | Cumplido |
| RF-2 | CUANDO una versión nueva de producción empiece a responder bien en su comprobación de salud, EL SISTEMA enviará | ✓ produccion_tambien_avisa_y_dice_que_es_produccion | — | Cumplido |
| RF-3 | EL SISTEMA dirá en la primera línea del mensaje el entorno («Pruebas» o «Producción»), la fecha y la hora de | ✓ primera_linea_con_el_entorno_y_la_hora_de_ciudad_de_mexico | — | Cumplido |
| RF-4 | EL SISTEMA listará en el mensaje, en un renglón cada uno, los PR que entraron desde el último despliegue | ✓ lista_los_pr_de_la_linea_principal_del_mas_reciente_al_mas_antiguo<br>✓ el_paso_de_pruebas_a_main_lista_los_pr_que_trae | — | Cumplido |
| RF-5 | EL SISTEMA terminará el mensaje con la dirección del entorno. | ✓ el_mensaje_termina_con_la_direccion_y_un_renglon_por_cambio | — | Cumplido |
| RF-6 | SI entre dos despliegues no entró ningún PR (por ejemplo, un redespliegue de la misma versión), ENTONCES EL | ✓ sin_cambios_no_avisa | — | Cumplido |
| RF-7 | SI entraron más de 15 PR, ENTONCES EL SISTEMA listará los 15 más recientes y dirá cuántos más hubo. | ✓ mas_de_15_cambios_lista_15_y_dice_cuantos_mas<br>✓ los_titulos_largos_se_cortan_y_el_numero_se_conserva | — | Cumplido |
| RF-8 | EL SISTEMA enviará un solo mensaje por versión y entorno, aunque la aplicación se reinicie. | ✓ rf8_avisa_una_sola_vez_por_version_aunque_se_reinicie<br>✓ dos_arranques_a_la_vez_dan_un_solo_aviso | — | Cumplido |
| RF-9 | SI un despliegue de pruebas o de producción falla, ENTONCES EL SISTEMA enviará al grupo del equipo un mensaje | — | — | **Sin cubrir** |
| RF-10 | SI no se puede enviar el mensaje (Telegram caído o sin configurar), ENTONCES EL SISTEMA dejará la versión | ✓ si_telegram_falla_no_rompe_y_no_vuelve_a_avisar | — | Cumplido |
| RF-11 | SI no se puede saber qué PR entraron, ENTONCES EL SISTEMA enviará el mensaje igual, diciendo que no se pudo | ✓ si_github_falla_avisa_sin_la_lista<br>✓ primer_aviso_y_lista_que_no_se_pudo_leer | — | Cumplido |
