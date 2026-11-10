# Validación — Spec 032

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-10. Vitest: 968 de 968 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (15 de 15 RF con al menos un test en verde).

**E2E (9 y 10 nov 2026):** en `chromium-desktop`, la E2E de la spec y las afectadas pasaron. `admin-panel` se quedó
sin tiempo en la corrida grande y pasó al repetirla sola. La suite completa en los cuatro proyectos queda pendiente:
satura la máquina del dueño, así que corre en la CI y antes de pasar a producción. `pnpm build` y `pnpm budget` están
en verde: la colección del panel pesa 247,8 kB de 260 y «Abrir todos», 194,4 kB de 250.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | EL SISTEMA mostrará en la página de una colección del panel una zona de peligro al final, con «Archivar» (si la | — | RF-1: la zona de peligro al final de la colección, con «Archivar» y «Eliminar colección» | Cumplido |
| RF-2 | CUANDO el administrador pulse «Eliminar colección», EL SISTEMA abrirá un aviso que diga cuántas cartas, imágenes | — | RF-2, RF-3 y RF-4: el aviso dice qué se borra, que no se puede deshacer, y pide el código | Cumplido |
| RF-3 | EL SISTEMA dirá en el aviso que eliminar no se puede deshacer. | — | RF-2, RF-3 y RF-4: el aviso dice qué se borra, que no se puede deshacer, y pide el código | Cumplido |
| RF-4 | MIENTRAS el texto escrito en el aviso no coincida con el código de la colección, EL SISTEMA mantendrá | ✓ con_el_codigo_equivocado_no_se_elimina<br>✓ el_codigo_vale_sin_mayusculas_ni_espacios_alrededor | RF-2, RF-3 y RF-4: el aviso dice qué se borra, que no se puede deshacer, y pide el código | Cumplido |
| RF-5 | CUANDO el administrador confirme, EL SISTEMA eliminará la colección con sus cartas, versiones, capas, imágenes, | ✓ rf7_un_borrador_se_elimina_con_sus_cartas_imagenes_y_disenos_y_queda_la_auditoria<br>✓ una_coleccion_sin_cartas_se_elimina<br>✓ una_coleccion_publicada_sin_duenos_se_elimina_y_otra_vez_ya_no_existe | RF-5 y RF-6: eliminar vuelve a «Sets» con el aviso y la colección ya no está | Cumplido |
| RF-6 | CUANDO se elimine la colección, EL SISTEMA volverá a «Sets» y mostrará un aviso de que se eliminó, con su código. | — | RF-5 y RF-6: eliminar vuelve a «Sets» con el aviso y la colección ya no está | Cumplido |
| RF-7 | CUANDO se elimine la colección, EL SISTEMA registrará en la auditoría quién la eliminó, cuándo, su código, su | ✓ rf7_un_borrador_se_elimina_con_sus_cartas_imagenes_y_disenos_y_queda_la_auditoria | — | Cumplido |
| RF-8 | SI algún usuario recibió alguna vez un sobre o una carta de la colección (aunque ya los haya abierto, reciclado | ✓ rf9_con_un_sobre_entregado_aunque_este_abierto_no_se_elimina_y_dice_cuantos_usuarios<br>✓ con_duenos_no_se_puede_eliminar | — | Cumplido |
| RF-9 | SI la colección no se puede eliminar por tener dueños, ENTONCES EL SISTEMA dirá en el aviso cuántos usuarios | ✓ rf9_con_un_sobre_entregado_aunque_este_abierto_no_se_elimina_y_dice_cuantos_usuarios<br>✓ dice_cuantos_usuarios_sin_decir_quienes | RF-9, RF-10 y RF-13: con dueños no se elimina, dice cuántos y ofrece archivar | Cumplido |
| RF-10 | SI la colección no se puede eliminar por tener dueños y está publicada, ENTONCES EL SISTEMA ofrecerá en el aviso | ✓ archivar_en_su_lugar_solo_si_esta_publicada_y_tiene_duenos | RF-9, RF-10 y RF-13: con dueños no se elimina, dice cuántos y ofrece archivar | Cumplido |
| RF-11 | SI la colección es la de bienvenida, tiene cartas de portada o la usa una regla de tier de Patreon, ENTONCES | ✓ la_bienvenida_las_cartas_de_portada_y_una_regla_de_tier_impiden_eliminar<br>✓ en_uso_no_se_puede_eliminar | — | Cumplido |
| RF-12 | SI la colección no se puede eliminar porque se usa en otro lugar, ENTONCES EL SISTEMA listará en el aviso cada | ✓ cada_lugar_en_uso_lleva_su_enlace | — | Cumplido |
| RF-13 | MIENTRAS la colección no se pueda eliminar, EL SISTEMA no mostrará el campo para escribir el código ni el botón | — | RF-9, RF-10 y RF-13: con dueños no se elimina, dice cuántos y ofrece archivar | Cumplido |
| RF-14 | SI entre abrir el aviso y confirmar alguien recibe un sobre de la colección o la colección pasa a usarse en otro | ✓ si_alguien_recibe_un_sobre_despues_de_abrir_el_aviso_no_se_elimina | — | Cumplido |
| RF-15 | EL SISTEMA permitirá eliminar colecciones solo a los administradores. | — | RF-15: un coleccionista no entra a la colección del panel | Cumplido |
