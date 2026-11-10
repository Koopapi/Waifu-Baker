# Validación — Spec 036

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-10. Vitest: 968 de 968 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (5 de 5 RF con al menos un test en verde).

**E2E (9 y 10 nov 2026):** en `chromium-desktop`, la E2E de la spec y las afectadas pasaron. `admin-panel` se quedó
sin tiempo en la corrida grande y pasó al repetirla sola. La suite completa en los cuatro proyectos queda pendiente:
satura la máquina del dueño, así que corre en la CI y antes de pasar a producción. `pnpm build` y `pnpm budget` están
en verde: la colección del panel pesa 247,8 kB de 260 y «Abrir todos», 194,4 kB de 250.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | EL SISTEMA no mostrará en ningún texto de la web, en inglés ni en español, el nombre de una persona del equipo | ✓ rf5_los_textos_de_la_web_no_nombran_personas | — | Cumplido |
| RF-2 | EL SISTEMA describirá el tema Street pop en «Mi cuenta» solo por su aspecto, sin decir quién lo diseñó. | ✓ el_tema_street_pop_se_describe_por_su_aspecto | — | Cumplido |
| RF-3 | Los comentarios del código, los nombres de las pruebas y los pasos de las E2E describirán las piezas por su | ✓ rf4_el_codigo_y_los_documentos_no_nombran_personas | — | Cumplido |
| RF-4 | Las specs, los planes, las validaciones y los documentos de `docs/` usarán descripciones generales, sin | ✓ rf4_el_codigo_y_los_documentos_no_nombran_personas | — | Cumplido |
| RF-5 | SI alguien añade un nombre de persona a un texto de la web, ENTONCES la suite de pruebas fallará. | ✓ rf5_los_textos_de_la_web_no_nombran_personas | — | Cumplido |
